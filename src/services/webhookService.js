// ==============================================================================
// BERKAS: src/services/webhookService.js
// TUJUAN: Logika bisnis pemrosesan webhook, verifikasi tanda tangan HMAC, dan deduplikasi.
// RUJUKAN SLIDE:
//   - Slide 9: "Kontrak webhook TaskHub: X-Timestamp, X-Signature, toleransi 300 detik, 202 setelah durable insert."
//   - Slide 11: "signedMessage = Buffer.concat([Buffer.from(timestamp + '.'), rawBody]); signatureHex = HMAC_SHA256(secret, signedMessage)"
//   - Slide 12: "Mengapa raw body, bukan JSON yang diserialisasi ulang: Spasi & urutan key mengubah byte."
//   - Slide 13: "Timestamp bukan deduplikasi: Timestamp membatasi replay window, Event ID melakukan dedup."
//   - Slide 14: "At-least-once: duplikat adalah hal normal. Receiver harus idempoten."
//   - Slide 15: "Kunci dedup dan konflik hash payload:
//                - ID baru: Simpan inbox dan hash payload.
//                - ID sama, hash sama: Duplikat identik. Tidak menambah efek (202 duplicate=true).
//                - ID sama, hash beda: Isi berubah. Lab menolak dengan 409."
//   - Slide 17: "Durable inbox: jangan 2xx sebelum tersimpan."
//   - Slide 19: "Urutan kerja receiver: raw body -> signature -> baru parse JSON."
//   - Slide 21: "crypto.timingSafeEqual untuk mencegah serangan timing."
//   - Slide 22 & 23: "TaskCompletedEvent Zod schema + storeIfNew."
//   - Slide 33: "Uji negatif webhook: Signature salah (400), Expired (400), Schema salah (422), ID sama body beda (409)."
// ==============================================================================

import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";
import { findInboxEvent, insertInboxEvent } from "../db.js";
import { TaskCompletedEvent } from "../schemas/events.js";

export class WebhookService {
  /**
   * 1. Verifikasi Header Waktu (Timestamp Replay Window)
   * Rujukan Slide 13 & 20: Memastikan request berada di dalam jendela waktu toleransi (300 detik)
   */
  verifyTimestamp(timestampHeader) {
    const timestamp = Number(timestampHeader);

    // Wajib berupa bilangan bulat representasi detik epoch Unix (Slide 20)
    if (!Number.isInteger(timestamp)) {
      const err = new Error("Timestamp tidak valid");
      err.status = 400;
      throw err;
    }

    // Menghitung selisih waktu sistem dengan timestamp request (Slide 20)
    const currentSeconds = Math.floor(Date.now() / 1000);
    const diff = Math.abs(currentSeconds - timestamp);

    // Jika melebihi batas toleransi 300 detik (5 menit), tolak seketika (Slide 9 & 20)
    if (diff > config.WEBHOOK_TOLERANCE_SECONDS) {
      const err = new Error("Event sudah kedaluwarsa");
      err.status = 400;
      throw err;
    }

    return timestamp;
  }

  /**
   * 2. Verifikasi Tanda Tangan HMAC-SHA256 pada Raw Body (Buffer Asli)
   * Rujukan Slide 11 & 21: Mengikat verifikasi pada byte asli yang dikirim pengirim.
   */
  verifySignature(timestamp, rawBody, signatureHeader) {
    const signature = signatureHeader ?? "";

    // Membentuk pesan yang ditandatangani: Buffer `${timestamp}.` digabung dengan rawBody (Slide 11 & 21)
    const signedMessage = Buffer.concat([Buffer.from(`${timestamp}.`), rawBody]);

    // Menghitung digest HMAC SHA-256 menggunakan kunci rahasia endpoint (Slide 21)
    const expectedHex = createHmac("sha256", config.WEBHOOK_SECRET)
      .update(signedMessage)
      .digest("hex");

    const a = Buffer.from(expectedHex);
    const b = Buffer.from(signature);

    // Menggunakan perbandingan waktu-konstan (constant-time comparison) via timingSafeEqual
    // untuk mencegah Timing Attack yang dapat menebak tanda tangan karakter per karakter (Slide 21)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      const err = new Error("Signature tidak valid");
      err.status = 400;
      throw err;
    }

    return true;
  }

  /**
   * 3. Menghitung Hash Payload SHA-256 untuk Deteksi Perubahan Isi Payload
   * Rujukan Slide 15: "ID sama, hash beda: Isi berubah -> ditolak 409."
   */
  calculatePayloadHash(rawBody) {
    return createHash("sha256").update(rawBody).digest("hex");
  }

  /**
   * 4. Mem-parsing dan Memvalidasi Kontrak Skema Zod
   * Rujukan Slide 19, 22, 23: Setelah signature sah, baru parse JSON & validasi schema.
   */
  parseAndValidatePayload(rawBody) {
    let parsedJson;
    try {
      // Membaca string UTF-8 dari rawBody Buffer
      parsedJson = JSON.parse(rawBody.toString("utf8"));
    } catch (parseError) {
      const err = new Error("Sintaks JSON tidak valid atau rusak");
      err.status = 400;
      throw err;
    }

    // Validasi ketat menggunakan Zod (Slide 22)
    const parseResult = TaskCompletedEvent.safeParse(parsedJson);
    if (!parseResult.success) {
      // Format error informatif untuk client (Slide 33: Tipe salah -> 422, taskId bukan string -> 422)
      const err = new Error("Validasi kontrak skema payload webhook gagal");
      err.status = 422;
      err.validationErrors = parseResult.error.format();
      throw err;
    }

    return parseResult.data;
  }

  /**
   * 5. Penyimpanan Durabel & Deduplikasi Event ke Tabel Inbox
   * Rujukan Slide 15, 17, 23, 24:
   *   - ID baru: INSERT ke inbox -> kembalikan duplicate=false
   *   - ID sama, hash sama: Duplikat identik -> kembalikan duplicate=true
   *   - ID sama, hash beda: Tampered/Konflik -> Lempar 409 Conflict!
   */
  async storeIfNew(event, rawBody, provider = "taskhub") {
    const payloadHash = this.calculatePayloadHash(rawBody);

    // Periksa apakah event_id dari provider ini sudah pernah diterima sebelumnya
    const existing = findInboxEvent(provider, event.id);

    if (existing) {
      // KASUS A: Event ID sama dan hash payload sama persis (Duplikat Identik - Slide 15 & 31)
      if (existing.payload_hash === payloadHash) {
        return true; // duplicate = true (tidak menambah efek baru)
      }

      // KASUS B: Event ID sama tetapi hash berbeda (Isi Berubah / Tampering - Slide 15 & 33)
      const conflictError = new Error("Konflik hash payload: event ID sama dengan isi berbeda");
      conflictError.status = 409;
      throw conflictError;
    }

    // KASUS C: Event baru (ID belum pernah tercatat - Slide 15 & 17)
    // Simpan secara durabel ke database SQLite sebelum membalas HTTP 202 kepada pengirim
    insertInboxEvent({
      id: event.id,
      provider,
      event_id: event.id,
      event_type: event.type,
      payload_hash: payloadHash,
      raw_payload: rawBody.toString("utf8"),
      received_at: new Date().toISOString(),
    });

    return false; // duplicate = false
  }

  /**
   * Pipeline Utama Receiver Webhook (Sesuai Slide 23)
   */
  async parseAndStoreVerifiedEvent(rawBody, provider = "taskhub") {
    // Validasi skema payload Zod (Slide 23)
    const event = this.parseAndValidatePayload(rawBody);

    // Simpan ke inbox jika baru, atau tandai duplikat (Slide 23)
    const duplicate = await this.storeIfNew(event, rawBody, provider);

    // Mengembalikan status penerimaan kontrak: accepted: true, duplicate: boolean (Slide 23 & 31)
    return { accepted: true, duplicate, event };
  }
}

export const webhookService = new WebhookService();
