// ==============================================================================
// BERKAS: tests/webhooks.test.js
// TUJUAN: Pengujian otomatis Webhook TaskHub (HMAC Signature, Replay Window, Dedup, & Conflict).
// RUJUKAN SLIDE:
//   - Slide 9: "POST /webhooks/taskhub; X-Timestamp, X-Signature; 202 setelah durable insert."
//   - Slide 11 & 21: "Verifikasi HMAC constant-time comparison."
//   - Slide 15: "Kunci dedup & konflik hash payload (ID baru -> 202, ID sama hash sama -> 202 duplicate, ID sama hash beda -> 409)."
//   - Slide 24 & 32: "Durable inbox dan effects table persistence."
//   - Slide 31: "Kirim event dua kali (attempt 1 vs attempt 2)."
//   - Slide 33: "Uji negatif webhook: 5 skenario penolakan."
//   - Slide 47: "webhooks.test.js: Signature, replay, dedup."
// ==============================================================================

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createHmac } from "node:crypto";
import app from "../src/app.js";
import { config } from "../src/config.js";
import { workerService } from "../src/services/workerService.js";
import { findInboxEvent, findEffectByEventId, resetTestDatabase } from "../src/db.js";

describe("Skenario Pengujian Webhook Receiver TaskHub (Slide 9-33, 47)", () => {
  const secret = config.WEBHOOK_SECRET;

  function generateSignature(timestamp, bodyBuffer) {
    return createHmac("sha256", secret)
      .update(Buffer.concat([Buffer.from(timestamp + "."), bodyBuffer]))
      .digest("hex");
  }

  beforeAll(() => {
    resetTestDatabase();
  });

  it("01. Berhasil menerima event valid baru -> 202 accepted=true, duplicate=false (Slide 31)", async () => {
    const event = {
      id: "evt_vitest_001",
      type: "task.completed.v1",
      data: { taskId: "tsk_test_01" },
    };
    const raw = Buffer.from(JSON.stringify(event));
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = generateSignature(ts, raw);

    const res = await request(app)
      .post("/webhooks/taskhub")
      .set("Content-Type", "application/json")
      .set("X-Timestamp", ts)
      .set("X-Signature", sig)
      .send(raw.toString("utf8"));

    expect(res.status).toBe(202);
    expect(res.body.accepted).toBe(true);
    expect(res.body.duplicate).toBe(false);

    // Verifikasi bahwa event tersimpan durabel di SQLite inbox (Slide 17 & 24)
    const stored = findInboxEvent("taskhub", "evt_vitest_001");
    expect(stored).toBeDefined();
    expect(stored.status).toBe("received");
  });

  it("02. Menerima event duplikat identik -> 202, duplicate=true tanpa menambah efek (Slide 31)", async () => {
    const event = {
      id: "evt_vitest_001", // ID sama
      type: "task.completed.v1",
      data: { taskId: "tsk_test_01" }, // Payload sama
    };
    const raw = Buffer.from(JSON.stringify(event));
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = generateSignature(ts, raw);

    const res = await request(app)
      .post("/webhooks/taskhub")
      .set("Content-Type", "application/json")
      .set("X-Timestamp", ts)
      .set("X-Signature", sig)
      .send(raw.toString("utf8"));

    expect(res.status).toBe(202);
    expect(res.body.accepted).toBe(true);
    expect(res.body.duplicate).toBe(true);
  });

  it("03. Menolak event dengan ID sama tapi body beda (Tampering / Konflik Hash) dengan HTTP 409 (Slide 15 & 33)", async () => {
    const eventTampered = {
      id: "evt_vitest_001", // ID sama
      type: "task.completed.v1",
      data: { taskId: "tsk_DIUBAH_HACKER_99" }, // Data payload berbeda!
    };
    const raw = Buffer.from(JSON.stringify(eventTampered));
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = generateSignature(ts, raw);

    const res = await request(app)
      .post("/webhooks/taskhub")
      .set("Content-Type", "application/json")
      .set("X-Timestamp", ts)
      .set("X-Signature", sig)
      .send(raw.toString("utf8"));

    expect(res.status).toBe(409);
    expect(res.body.detail).toContain("Konflik hash payload");
  });

  it("04. Menolak signature yang salah / diubah dengan HTTP 400 (Slide 33)", async () => {
    const event = {
      id: "evt_vitest_002",
      type: "task.completed.v1",
      data: { taskId: "tsk_test_02" },
    };
    const raw = Buffer.from(JSON.stringify(event));
    const ts = String(Math.floor(Date.now() / 1000));
    const fakeSig = "bad0000000000000000000000000000000000000000000000000000000000000";

    const res = await request(app)
      .post("/webhooks/taskhub")
      .set("Content-Type", "application/json")
      .set("X-Timestamp", ts)
      .set("X-Signature", fakeSig)
      .send(raw.toString("utf8"));

    expect(res.status).toBe(400);
    expect(res.body.detail).toContain("Signature tidak valid");
  });

  it("05. Menolak timestamp kedaluwarsa (> 300 detik) dengan HTTP 400 (Slide 20 & 33)", async () => {
    const event = {
      id: "evt_vitest_003",
      type: "task.completed.v1",
      data: { taskId: "tsk_test_03" },
    };
    const raw = Buffer.from(JSON.stringify(event));
    const staleTs = String(Math.floor(Date.now() / 1000) - 350); // 350 detik lalu
    const sig = generateSignature(staleTs, raw);

    const res = await request(app)
      .post("/webhooks/taskhub")
      .set("Content-Type", "application/json")
      .set("X-Timestamp", staleTs)
      .set("X-Signature", sig)
      .send(raw.toString("utf8"));

    expect(res.status).toBe(400);
    expect(res.body.detail).toContain("Event sudah kedaluwarsa");
  });

  it("06. Menolak event type tidak sesuai kontrak dengan HTTP 422 (Slide 33)", async () => {
    const event = {
      id: "evt_vitest_004",
      type: "task.updated.v1", // Kontrak TaskHub Hari 3 mewajibkan 'task.completed.v1'
      data: { taskId: "tsk_test_04" },
    };
    const raw = Buffer.from(JSON.stringify(event));
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = generateSignature(ts, raw);

    const res = await request(app)
      .post("/webhooks/taskhub")
      .set("Content-Type", "application/json")
      .set("X-Timestamp", ts)
      .set("X-Signature", sig)
      .send(raw.toString("utf8"));

    expect(res.status).toBe(422);
    expect(res.body.detail).toContain("Validasi kontrak skema payload webhook gagal");
  });

  it("07. Menolak taskId yang bukan string dengan HTTP 422 (Slide 33)", async () => {
    const event = {
      id: "evt_vitest_005",
      type: "task.completed.v1",
      data: { taskId: 99999 }, // Angka, bukan string!
    };
    const raw = Buffer.from(JSON.stringify(event));
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = generateSignature(ts, raw);

    const res = await request(app)
      .post("/webhooks/taskhub")
      .set("Content-Type", "application/json")
      .set("X-Timestamp", ts)
      .set("X-Signature", sig)
      .send(raw.toString("utf8"));

    expect(res.status).toBe(422);
  });

  it("08. Worker memproses event inbox dan mencatat efek demonstrasi tunggal (Slide 25 & 32)", async () => {
    // Jalankan tick worker
    await workerService.processBatch(10);

    // Periksa status di inbox berubah menjadi 'processed' (Slide 18 & 25)
    const stored = findInboxEvent("taskhub", "evt_vitest_001");
    expect(stored).toBeDefined();
    expect(stored.status).toBe("processed");
    expect(stored.processed_at).toBeDefined();

    // Periksa tabel effects mencatat 1 efek demonstrasi (Slide 25 & 32)
    const effect = findEffectByEventId("evt_vitest_001");
    expect(effect).toBeDefined();
    expect(effect.task_id).toBe("tsk_test_01");
  });
});
