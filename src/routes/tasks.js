// ==============================================================================
// BERKAS: src/routes/tasks.js
// TUJUAN: Manajemen resource Tugas (CRUD, BOLA, Concurrency Versioning, Idempotency).
// RUJUKAN SLIDE:
//   - Slide 44: "test('create task requires auth', async () => expect(res.status).toBe(401))"
//   - Slide 45: "User A mengakses task User B -> 403; owner_id dikirim client -> 422; PATCH version lama -> 409"
//   - Slide 48: "Workflow 14 langkah: 3 Buat task, 4 List, 5 Detail, 6 PATCH version benar, 7 PATCH ulang version lama (409), 9 Bob akses task alice (403), 10 Payload owner_id (422), 11 Notify idempotency, 12 Replay notify, 13 Hapus task, 14 Detail task (404)."
//   - Slide 50: "Security test matrix: 15 skenario pengujian."
// ==============================================================================

import { Router } from "express";
import { createHash } from "node:crypto";
import { authenticate } from "../middleware/auth.js";
import { authorizeTaskOwnership } from "../middleware/bola.js";
import { CreateTaskSchema, UpdateTaskSchema } from "../schemas/tasks.js";
import {
  createTask,
  listTasksByTenant,
  findTaskById,
  updateTaskWithVersion,
  deleteTaskById,
  findIdempotencyKey,
  saveIdempotencyKey,
} from "../db.js";

export const taskRouter = Router();

// Seluruh rute task mewajibkan autentikasi Bearer token (Slide 44 & 45)
taskRouter.use(authenticate);

// ------------------------------------------------------------------------------
// 1. POST /api/v1/tasks - Membuat Task Baru
// ------------------------------------------------------------------------------
taskRouter.post("/", (req, res) => {
  // A. Deteksi Mass Assignment: Larang client mengirimkan owner_id atau role (Slide 45 & 50)
  if (req.body.owner_id !== undefined || req.body.role !== undefined) {
    return res.status(422).json({
      error: "Unprocessable Content",
      detail: "Mass Assignment terdeteksi: Properti 'owner_id' dan 'role' tidak boleh disuplai oleh client",
    });
  }

  // B. Validasi skema input Zod
  const parseResult = CreateTaskSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(422).json({
      error: "Unprocessable Content",
      detail: "Validasi data pembuatan task gagal",
      errors: parseResult.error.format(),
    });
  }

  const { title, description, status } = parseResult.data;
  const taskId = `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // C. Simpan task dengan kepemilikan terikat pada identitas token login (req.user)
  const newTask = createTask({
    id: taskId,
    title,
    description,
    status: status || "open",
    owner_id: req.user.id,
    team_id: req.user.teamId,
    tenant_id: req.user.tenantId,
  });

  return res.status(201).json(newTask);
});

// ------------------------------------------------------------------------------
// 2. GET /api/v1/tasks - Menampilkan Daftar Task
// ------------------------------------------------------------------------------
taskRouter.get("/", (req, res) => {
  // Hanya menampilkan task dalam tenant pengguna aktif (Multi-tenant isolation)
  const tasks = listTasksByTenant(req.user.tenantId);
  return res.status(200).json({
    data: tasks,
    total: tasks.length,
  });
});

// ------------------------------------------------------------------------------
// 3. GET /api/v1/tasks/:id - Mengambil Rincian Task Tunggal
// ------------------------------------------------------------------------------
// Menggunakan middleware authorizeTaskOwnership untuk memverifikasi BOLA (Slide 45 & 48)
taskRouter.get("/:id", authorizeTaskOwnership, (req, res) => {
  return res.status(200).json(req.task);
});

// ------------------------------------------------------------------------------
// 4. PATCH /api/v1/tasks/:id - Memperbarui Task dengan Version Locking
// ------------------------------------------------------------------------------
taskRouter.patch("/:id", authorizeTaskOwnership, (req, res) => {
  // A. Deteksi Mass Assignment pada update (Slide 45)
  if (req.body.owner_id !== undefined || req.body.role !== undefined) {
    return res.status(422).json({
      error: "Unprocessable Content",
      detail: "Mass Assignment terdeteksi: 'owner_id' atau 'role' tidak dapat diubah",
    });
  }

  // B. Validasi skema update
  const parseResult = UpdateTaskSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(422).json({
      error: "Unprocessable Content",
      detail: "Validasi pembaruan task gagal",
      errors: parseResult.error.format(),
    });
  }

  const { title, description, status, version } = parseResult.data;

  // C. Optimistic Concurrency Control (Slide 45, 48 langkah 6 & 7):
  // Jika versi yang dikirim client tidak sama dengan versi di DB, tolak dengan HTTP 409 Conflict!
  if (req.task.version !== version) {
    return res.status(409).json({
      error: "Conflict",
      detail: `Versi task tidak cocok (Optimistic Concurrency Conflict). Versi di server: ${req.task.version}, versi yang dikirim: ${version}`,
      currentVersion: req.task.version,
    });
  }

  // Lakukan update atomik dan naikkan versi (version + 1)
  const updated = updateTaskWithVersion(req.params.id, version, { title, description, status });
  if (!updated) {
    return res.status(409).json({
      error: "Conflict",
      detail: "Gagal memperbarui task karena konflik versi konkurensi",
    });
  }

  const freshTask = findTaskById(req.params.id);
  return res.status(200).json(freshTask);
});

// ------------------------------------------------------------------------------
// 5. POST /api/v1/tasks/:id/notify - Notifikasi Pihak Ketiga dengan Idempotency Key
// ------------------------------------------------------------------------------
taskRouter.post("/:id/notify", authorizeTaskOwnership, (req, res) => {
  // Slide 48 Langkah 11: Header Idempotency-Key wajib disertakan
  const idempotencyKey = req.get("idempotency-key");
  if (!idempotencyKey) {
    return res.status(400).json({
      error: "Bad Request",
      detail: "Header 'Idempotency-Key' wajib disertakan untuk endpoint ini",
    });
  }

  // Hitung hash request payload untuk mendeteksi perubahan parameter pada kunci yang sama
  const requestPayloadString = JSON.stringify(req.body || {});
  const requestHash = createHash("sha256").update(requestPayloadString).digest("hex");

  // Periksa apakah Idempotency-Key sudah pernah digunakan sebelumnya (Slide 48 Langkah 12)
  const existingKeyRecord = findIdempotencyKey(idempotencyKey);
  if (existingKeyRecord) {
    // Jika kunci sama tetapi payload berbeda -> Konflik!
    if (existingKeyRecord.request_hash !== requestHash) {
      return res.status(409).json({
        error: "Conflict",
        detail: "Idempotency-Key telah digunakan sebelumnya dengan payload request yang berbeda",
      });
    }

    // Jika identik, kembalikan response tersimpan tanpa mengeksekusi ulang notifikasi (Replay cached response)
    const cachedResponse = JSON.parse(existingKeyRecord.response_body);
    return res.status(existingKeyRecord.status_code).json({
      ...cachedResponse,
      idempotentReplay: true,
    });
  }

  // Jalankan proses notifikasi perdana
  const responseData = {
    message: "Notifikasi eksternal berhasil dikirim",
    taskId: req.task.id,
    notificationId: `notif_${Date.now()}`,
    status: "dispatched",
    idempotencyKey,
  };

  // Simpan hasil eksekusi ke tabel idempotency_keys
  saveIdempotencyKey({
    key: idempotencyKey,
    user_id: req.user.id,
    request_hash: requestHash,
    status_code: 200,
    response_body: JSON.stringify(responseData),
  });

  return res.status(200).json(responseData);
});

// ------------------------------------------------------------------------------
// 6. DELETE /api/v1/tasks/:id - Menghapus Task
// ------------------------------------------------------------------------------
taskRouter.delete("/:id", authorizeTaskOwnership, (req, res) => {
  // Slide 48 Langkah 13: Hapus task
  deleteTaskById(req.params.id);
  // Balas status 204 No Content
  return res.status(204).send();
});
