// ==============================================================================
// BERKAS: src/services/outboxService.js
// TUJUAN: Implementasi simulasi pola Transactional Outbox untuk mencegah Dual Write.
// RUJUKAN SLIDE:
//   - Slide 38: "Dual write dan transactional outbox: Simpan task & outbox dalam transaksi DB yang sama.
//                01 Simpan task, 02 Simpan outbox, 03 Commit, 04 Publish, 05 Consume."
//   - Slide 39: "Outbox bukan exactly once: Crash setelah publish menyebabkan kirim ulang -> Consumer tetap wajib idempoten!"
// ==============================================================================

import { saveTaskWithOutboxTransaction, listPendingOutbox, markOutboxPublished } from "../db.js";
import { pinoLogger } from "../logger.js";

export class OutboxService {
  /**
   * 1. Menyimpan Task sekaligus mencatat Event ke Outbox dalam 1 Transaksi Atomik (Slide 38)
   */
  createTaskWithOutbox(taskData, userId, tenantId, teamId) {
    const taskId = `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const taskRecord = {
      id: taskId,
      title: taskData.title,
      description: taskData.description || null,
      status: "open",
      owner_id: userId,
      team_id: teamId,
      tenant_id: tenantId,
    };

    const outboxPayload = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      eventType: "task.created.v1",
      taskId: taskId,
      title: taskRecord.title,
      ownerId: userId,
      tenantId: tenantId,
      timestamp: new Date().toISOString(),
    };

    // Jalankan transaksi database (Slide 38: 01 Simpan task, 02 Simpan outbox, 03 Commit)
    const result = saveTaskWithOutboxTransaction(taskRecord, outboxPayload);

    pinoLogger.info(
      { taskId, outboxId: result.outboxId },
      "📦 [OUTBOX] Task dan Outbox Event berhasil disimpan secara atomik dalam 1 transaksi DB"
    );

    return result;
  }

  /**
   * 2. Simulator Outbox Relay Publisher: Membaca antrean pending lalu mengirim event (Slide 38 & 39)
   */
  async publishPendingEvents(simulateCrashAfterPublish = false) {
    const pendingEvents = listPendingOutbox();
    const published = [];

    for (const item of pendingEvents) {
      pinoLogger.info({ outboxId: item.id }, "📡 [OUTBOX PUBLISHER] Mengirim event ke message broker...");

      // Simulasi skenario Slide 39: Publisher crash SETELAH publish berhasil sebelum commit status DB!
      if (simulateCrashAfterPublish) {
        pinoLogger.warn(
          { outboxId: item.id },
          "⚠️ [OUTBOX SIMULASI CRASH] Publisher mati setelah publish! Status DB tidak sempat diperbarui -> akan terjadi redelivery (Slide 39)"
        );
        throw new Error("SimulatedPublisherCrashError: Worker crash before updating DB status to 'published'!");
      }

      // Jika normal, tandai status outbox menjadi 'published'
      markOutboxPublished(item.id);
      published.push({ id: item.id, status: "published" });
    }

    return published;
  }
}

export const outboxService = new OutboxService();
