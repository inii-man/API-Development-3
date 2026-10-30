// ==============================================================================
// BERKAS: src/services/workerService.js
// TUJUAN: Worker asinkron pemroses antrean inbox (Claim/Lease, Side Effects, Retry & DLQ).
// RUJUKAN SLIDE:
//   - Slide 8: "Receiver lab tidak mengubah task dari input webhook! Catat efek demonstrasi."
//   - Slide 17: "Worker: Ambil received -> efek demonstrasi + processed -> commit."
//   - Slide 18: "202 bukan bukti efek bisnis selesai. received -> processed."
//   - Slide 25: "Worker inbox: 01 Ambil received, 02 Catat efek, 03 Commit bersama."
//   - Slide 26: "Dari worker lab ke worker produksi, retry, dan DLQ (Dead Letter Queue)."
//   - Slide 32: "Setelah worker jalan: event processed, satu effect per event ID."
// PRINSIP ARSITEKTUR:
//   - Dekopling Pengiriman & Eksekusi: API receiver langsung membalas 202, worker memproses di background.
//   - Idempotensi Efek: Tabel effects memiliki unique constraint pada event_id agar tidak menduplikasi efek.
// ==============================================================================

import {
  getPendingInboxEvents,
  claimInboxEvent,
  markInboxProcessed,
  markInboxFailed,
  insertEffect,
  findEffectByEventId,
  db,
} from "../db.js";
import { pinoLogger } from "../logger.js";

export class WorkerService {
  constructor() {
    this.isRunning = false;
    this.intervalHandle = null;
  }

  /**
   * Memproses satu event inbox secara atomik dan aman
   */
  async processEvent(inboxRecord) {
    const { id, event_id, raw_payload } = inboxRecord;

    // 1. Klaim kepemilikan event (Lease/Claim) untuk mencegah race condition antar worker (Slide 26)
    const claimed = claimInboxEvent(id);
    if (!claimed) {
      // Event sudah diambil oleh thread/worker lain
      return { status: "skipped", reason: "Already claimed by another worker" };
    }

    try {
      // Parse isi raw_payload untuk mendapatkan taskId
      const payload = JSON.parse(raw_payload);
      const taskId = payload.data?.taskId || "tsk_unknown";

      // 2. Transaksi Atomik: Menjalankan Efek Demonstrasi + Menandai Processed (Slide 17 & 25)
      const executeTransaction = db.transaction(() => {
        // A. Periksa apakah efek untuk event_id ini sudah pernah dicatat sebelumnya
        const existingEffect = findEffectByEventId(event_id);
        if (!existingEffect) {
          // B. Catat efek demonstrasi lokal ke tabel effects (Slide 8 & 25)
          // Catatan: Sesuai Slide 8, kita TIDAK mengubah tabel tasks secara sepihak
          // tanpa otorisasi bisnis nyata, melainkan mencatat efek penerimaan event secara sah.
          insertEffect({
            id: `eff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            event_id,
            task_id: taskId,
            effect_type: "demonstration_task_completion",
            details: JSON.stringify({
              message: `Event ${event_id} berhasil diproses oleh worker`,
              processedAt: new Date().toISOString(),
            }),
          });
        }

        // C. Perbarui status inbox menjadi 'processed' (Slide 17 & 25)
        markInboxProcessed(id);
      });

      executeTransaction();

      pinoLogger.info(
        { eventId: event_id, taskId, inboxId: id },
        "✅ [WORKER] Event inbox berhasil diproses dan dicatat ke tabel effects"
      );

      return { status: "processed", event_id, taskId };
    } catch (err) {
      // 3. Penanganan Kegagalan, Retry Berjadwal, dan Dead Letter Queue (DLQ) (Slide 26)
      pinoLogger.error(
        { err: err.message, eventId: event_id },
        "❌ [WORKER ERROR] Gagal memproses event inbox, menjadwalkan retry atau menandai failed (DLQ)"
      );

      // Tandai gagal dan tingkatkan retry_count; jika mencapai 3x maka status menjadi 'failed' (DLQ)
      markInboxFailed(id, err.message);

      return { status: "failed", error: err.message };
    }
  }

  /**
   * Menjalankan satu putaran (batch tick) untuk memproses semua event berstatus 'received'
   */
  async processBatch(limit = 10) {
    const pending = getPendingInboxEvents(limit);
    const results = [];

    for (const item of pending) {
      const res = await this.processEvent(item);
      results.push(res);
    }

    return results;
  }

  /**
   * Memulai loop background worker berkala
   */
  start(intervalMs = 3000) {
    if (this.isRunning) return;
    this.isRunning = true;

    pinoLogger.info({ intervalMs }, "🚀 [WORKER] Background Inbox Worker dimulai");

    this.intervalHandle = setInterval(async () => {
      try {
        await this.processBatch(10);
      } catch (err) {
        pinoLogger.error({ err: err.message }, "❌ [WORKER CRITICAL] Kesalahan fatal pada loop worker");
      }
    }, intervalMs);
  }

  /**
   * Menghentikan background worker secara graceful
   */
  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.isRunning = false;
    pinoLogger.info("🛑 [WORKER] Background Inbox Worker dihentikan");
  }
}

export const workerService = new WorkerService();
