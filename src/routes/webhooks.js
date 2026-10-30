// ==============================================================================
// BERKAS: src/routes/webhooks.js
// TUJUAN: Endpoint penerimaan Webhook TaskHub (/webhooks/taskhub).
// RUJUKAN SLIDE:
//   - Slide 9: "POST /webhooks/taskhub; Content-Type application/json; X-Timestamp dan X-Signature; body maks 64kb."
//   - Slide 19: "Urutan kerja receiver: raw body (Buffer) dari express.raw -> validasi timestamp -> hitung HMAC -> parse JSON & Zod -> simpan inbox -> balas 202."
//   - Slide 20: "Kode: webhook receiver Express, verifikasi (1/2): express.raw, Number.isInteger, Math.abs > 300."
//   - Slide 21: "Kode: webhook receiver Express, verifikasi (2/2): createHmac, Buffer.concat, timingSafeEqual."
//   - Slide 22 & 23: "TaskCompletedEvent Zod schema, parseAndStoreVerifiedEvent -> return { accepted: true, duplicate }."
//   - Slide 31: "Lab: kirim event dua kali -> pertama 202 accepted=true duplicate=false, kedua 202 duplicate=true."
//   - Slide 33: "Uji negatif webhook: Signature salah (400), Timestamp stale (400), Event type salah (422), taskId bukan string (422), ID sama body beda (409)."
// ==============================================================================

import { Router } from "express";
import express from "express";
import { webhookService } from "../services/webhookService.js";

export const webhookRouter = Router();

// Memasang parser express.raw khusus pada rute /taskhub dengan batas 64kb (Slide 9 & 20)
// Penting: Dipasang sebelum express.json() agar signature menandatangani byte asli tanpa re-serialisasi! (Slide 12 & 19)
webhookRouter.post(
  "/taskhub",
  express.raw({ type: "application/json", limit: "64kb" }),
  async (req, res) => {
    try {
      // 1. Baca raw body sebagai Buffer asli (Slide 20)
      const rawBody = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body || {}));

      // 2. Baca header X-Timestamp dan validasi toleransi 300 detik (Slide 20)
      const timestampHeader = req.get("x-timestamp");
      const timestamp = webhookService.verifyTimestamp(timestampHeader);

      // 3. Baca header X-Signature dan verifikasi dengan HMAC constant-time comparison (Slide 21)
      const signatureHeader = req.get("x-signature") ?? "";
      webhookService.verifySignature(timestamp, rawBody, signatureHeader);

      // 4. Parse JSON & validasi kontrak schema Zod, lalu simpan durabel ke inbox (Slide 22 & 23)
      const { accepted, duplicate } = await webhookService.parseAndStoreVerifiedEvent(rawBody);

      // 5. Balas status HTTP 202 Accepted (Slide 9, 23, 31)
      // Catatan Slide 23 & 66: "202 berarti event diterima dan tersimpan durabel, BUKAN seluruh efek bisnis selesai!"
      return res.status(202).json({
        accepted,
        duplicate,
      });
    } catch (err) {
      // Pemetaan status error HTTP sesuai matriks uji negatif (Slide 33)
      const statusCode = err.status || 400;

      return res.status(statusCode).json({
        detail: err.message,
        errors: err.validationErrors || undefined,
      });
    }
  }
);
