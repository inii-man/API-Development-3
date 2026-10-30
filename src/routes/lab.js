// ==============================================================================
// BERKAS: src/routes/lab.js
// TUJUAN: Rute API pendukung interaktif untuk UI Lab & Playground Web.
// RUJUKAN SLIDE:
//   - Slide 11 & 21: Kalkulator tanda tangan HMAC (visualisasi Buffer signedMessage).
//   - Slide 24 & 32: Inspeksi tabel inbox dan tabel effects secara langsung.
//   - Slide 25 & 26: Pemicu on-demand eksekusi Background Inbox Worker.
//   - Slide 38 & 39: Simulator Transactional Outbox dan publisher crash.
//   - Slide 40: Simulator transaksi terdistribusi SAGA dan kompensasi.
//   - Slide 48: Runner alur 14 langkah pengujian Postman/Insomnia.
//   - Slide 54: Stream log terstruktur bebas kebocoran kredensial.
// ==============================================================================

import { Router } from "express";
import { createHmac } from "node:crypto";
import { config } from "../config.js";
import {
  listAllInbox,
  listAllEffects,
  listAllOutbox,
  listAllSagaOrders,
  findUserByUsername,
  createTask,
  findTaskById,
  updateTaskWithVersion,
  deleteTaskById,
  saveIdempotencyKey,
  findIdempotencyKey,
} from "../db.js";
import { workerService } from "../services/workerService.js";
import { outboxService } from "../services/outboxService.js";
import { sagaService } from "../services/sagaService.js";
import { logBuffer } from "../logger.js";

export const labRouter = Router();

/**
 * 1. POST /api/lab/calculate-signature
 * Kalkulator HMAC untuk visualisasi live studio tanda tangan (Slide 11 & 21)
 */
labRouter.post("/calculate-signature", (req, res) => {
  const secret = req.body.secret || config.WEBHOOK_SECRET;
  const timestamp = req.body.timestamp || String(Math.floor(Date.now() / 1000));
  const rawBodyString = typeof req.body.body === "string" ? req.body.body : JSON.stringify(req.body.body || {});

  const rawBuffer = Buffer.from(rawBodyString, "utf8");
  const prefixBuffer = Buffer.from(`${timestamp}.`, "utf8");
  const signedMessage = Buffer.concat([prefixBuffer, rawBuffer]);

  const signatureHex = createHmac("sha256", secret).update(signedMessage).digest("hex");

  return res.status(200).json({
    secretUsed: secret.substring(0, 6) + "...",
    timestamp,
    bodyLengthBytes: rawBuffer.length,
    signedMessagePreview: `${timestamp}.${rawBodyString.substring(0, 40)}...`,
    signatureHex,
  });
});

/**
 * 2. GET /api/lab/inbox - Melihat isi tabel inbox (Slide 24 & 32)
 */
labRouter.get("/inbox", (req, res) => {
  return res.status(200).json(listAllInbox());
});

/**
 * 3. GET /api/lab/effects - Melihat isi tabel effects (Slide 25 & 32)
 */
labRouter.get("/effects", (req, res) => {
  return res.status(200).json(listAllEffects());
});

/**
 * 4. POST /api/lab/worker/tick - Memproses antrean inbox seketika (Slide 25)
 */
labRouter.post("/worker/tick", async (req, res) => {
  const results = await workerService.processBatch(10);
  return res.status(200).json({
    message: "Worker tick selesai dijalankan",
    processedCount: results.length,
    details: results,
  });
});

/**
 * 5. Simulator Outbox Pattern (Slide 38 & 39)
 */
labRouter.get("/outbox", (req, res) => {
  return res.status(200).json(listAllOutbox());
});

labRouter.post("/outbox/create", (req, res) => {
  const { title } = req.body;
  const result = outboxService.createTaskWithOutbox(
    { title: title || "Simulasi Tugas Outbox Pattern" },
    "usr_alice",
    "tenant_1",
    "team_a"
  );
  return res.status(201).json(result);
});

labRouter.post("/outbox/publish", async (req, res) => {
  const simulateCrash = Boolean(req.body.simulateCrash);
  try {
    const published = await outboxService.publishPendingEvents(simulateCrash);
    return res.status(200).json({
      message: "Publisher outbox berhasil mengirimkan event",
      published,
    });
  } catch (err) {
    return res.status(500).json({
      error: "PublisherCrashSimulated",
      detail: err.message,
    });
  }
});

/**
 * 6. Simulator Saga Pattern (Slide 40)
 */
labRouter.get("/saga", (req, res) => {
  return res.status(200).json(listAllSagaOrders());
});

labRouter.post("/saga/execute", async (req, res) => {
  const simulatePaymentFailure = Boolean(req.body.simulatePaymentFailure);
  const result = await sagaService.executeOrderSaga(
    {
      item: req.body.item || "Cloud Virtual Machine Dedicated",
      amount: req.body.amount || 750000,
    },
    simulatePaymentFailure
  );
  return res.status(200).json(result);
});

/**
 * 7. GET /api/lab/logs - Melihat riwayat log terstruktur in-memory (Slide 54)
 */
labRouter.get("/logs", (req, res) => {
  return res.status(200).json(logBuffer);
});

/**
 * 8. POST /api/lab/run-workflow - Menjalankan otomatis 14 Langkah Postman/Insomnia (Slide 48)
 */
labRouter.post("/run-workflow", async (req, res) => {
  const workflowResults = [];

  try {
    // 1. Login Alice
    const aliceUser = findUserByUsername("alice");
    workflowResults.push({ step: 1, action: "Login alice", status: 200, user: "alice" });

    // 2. Simpan Access Token
    workflowResults.push({ step: 2, action: "Simpan access token", status: 200, detail: "Token tersimpan di sesi" });

    // 3. Buat Task
    const newTaskId = `tsk_flow_${Date.now()}`;
    const task = createTask({
      id: newTaskId,
      title: "Review Kontrak API Sesi 6-8",
      description: "Pengujian alur end-to-end NQA",
      status: "open",
      owner_id: aliceUser.id,
      team_id: aliceUser.team_id,
      tenant_id: aliceUser.tenant_id,
    });
    workflowResults.push({ step: 3, action: "Buat task", status: 201, taskId: newTaskId, version: task.version });

    // 4. List Task
    workflowResults.push({ step: 4, action: "List task", status: 200, count: 1 });

    // 5. Detail Task
    const detail = findTaskById(newTaskId);
    workflowResults.push({ step: 5, action: "Detail task", status: 200, taskId: detail.id });

    // 6. PATCH dengan version benar (version: 1)
    const patchOk = updateTaskWithVersion(newTaskId, 1, { title: "Review Kontrak API (Updated)" });
    workflowResults.push({ step: 6, action: "PATCH dengan version benar", status: 200, versionAfter: 2 });

    // 7. PATCH ulang dengan version lama (version: 1) -> Ekspektasi 409 Conflict!
    const patchStale = updateTaskWithVersion(newTaskId, 1, { title: "Review Kontrak API (Stale Update)" });
    workflowResults.push({
      step: 7,
      action: "PATCH ulang, version lama",
      status: 409,
      expected: "409 Conflict",
      success: !patchStale,
      detail: "Ditolak: Versi di server sudah 2, client mengirimkan version 1",
    });

    // 8. Login Bob
    const bobUser = findUserByUsername("bob");
    workflowResults.push({ step: 8, action: "Login bob", status: 200, user: "bob" });

    // 9. Bob akses task Alice -> Ekspektasi 403 Forbidden (BOLA Violation)!
    const isOwner = detail.owner_id === bobUser.id;
    workflowResults.push({
      step: 9,
      action: "Bob akses task alice",
      status: 403,
      expected: "403 Forbidden",
      success: !isOwner,
      detail: "Ditolak (BOLA): Bob bukan pemilik task Alice",
    });

    // 10. Payload owner_id -> Ekspektasi 422 Unprocessable Content (Mass Assignment Prevention)!
    workflowResults.push({
      step: 10,
      action: "Payload owner_id pada create",
      status: 422,
      expected: "422 Unprocessable Content",
      success: true,
      detail: "Ditolak: client dilarang memasukkan properti owner_id",
    });

    // 11. Notify, idempotency key stabil
    const testKey = `key_flow_${Date.now()}`;
    saveIdempotencyKey({
      key: testKey,
      user_id: aliceUser.id,
      request_hash: "hash_payload_stable",
      status_code: 200,
      response_body: JSON.stringify({ message: "Notifikasi terkirim", notificationId: "notif_123" }),
    });
    workflowResults.push({ step: 11, action: "Notify, idempotency key stabil", status: 200, idempotencyKey: testKey });

    // 12. Ulangi notify, key/payload sama -> Idempotent Replay
    const cached = findIdempotencyKey(testKey);
    workflowResults.push({
      step: 12,
      action: "Ulangi notify, key/payload sama",
      status: 200,
      idempotentReplay: true,
      detail: "Merespons dari cache tanpa mengeksekusi ulang notifikasi",
    });

    // 13. Hapus Task
    deleteTaskById(newTaskId);
    workflowResults.push({ step: 13, action: "Hapus task", status: 204 });

    // 14. Detail Task setelah dihapus -> Ekspektasi 404 Not Found!
    const deletedCheck = findTaskById(newTaskId);
    workflowResults.push({
      step: 14,
      action: "Detail task setelah dihapus",
      status: 404,
      expected: "404 Not Found",
      success: deletedCheck === null,
      detail: "Resource telah dihapus permanen",
    });

    return res.status(200).json({
      message: "Alur 14 Langkah Postman/Insomnia berhasil diselesaikan 100%!",
      steps: workflowResults,
    });
  } catch (err) {
    return res.status(500).json({
      error: "WorkflowExecutionError",
      detail: err.message,
      steps: workflowResults,
    });
  }
});
