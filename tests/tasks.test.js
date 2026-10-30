// ==============================================================================
// BERKAS: tests/tasks.test.js
// TUJUAN: Pengujian otomatis fungsional dan keamanan untuk resource Task (CRUD, BOLA, Versioning).
// RUJUKAN SLIDE:
//   - Slide 45: "User A mengakses task User B -> 403"
//   - Slide 45: "owner_id/role dikirim client -> 422"
//   - Slide 45: "PATCH dengan version lama -> 409"
//   - Slide 47: "tasks.test.js: CRUD, ownership, version."
//   - Slide 48: "Postman/Insomnia: workflow 14 langkah."
// ==============================================================================

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { resetTestDatabase } from "../src/db.js";

describe("Skenario Pengujian Tasks: CRUD, BOLA, & Versioning (Slide 45, 47, 48)", () => {
  let aliceToken;
  let bobToken;
  let createdTaskId;
  let currentVersion = 1;

  beforeAll(async () => {
    resetTestDatabase();
    await import("../scripts/seed.js");

    // Login Alice (Slide 48 Langkah 1 & 2)
    const aliceRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ username: "alice", password: "password123" });
    aliceToken = aliceRes.body.token;

    // Login Bob (Slide 48 Langkah 8)
    const bobRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ username: "bob", password: "password123" });
    bobToken = bobRes.body.token;
  });

  it("01. Berhasil membuat task baru atas nama Alice (Slide 48 Langkah 3)", async () => {
    const res = await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({
        title: "Review Dokumen Kontrak OpenAPI TaskHub",
        description: "Pemeriksaan tipe data dan parameter boundary",
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.version).toBe(1);
    expect(res.body.owner_id).toBe("usr_alice");

    createdTaskId = res.body.id;
    currentVersion = res.body.version;
  });

  it("02. Menolak payload yang menyisipkan owner_id atau role (Mass Assignment Prevention -> 422) (Slide 45 & 48 Langkah 10)", async () => {
    const res = await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({
        title: "Eksploitasi Mass Assignment",
        owner_id: "usr_bob", // Mencoba menginjeksi kepemilikan orang lain
        role: "admin", // Mencoba privilege escalation
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe("Unprocessable Content");
    expect(res.body.detail).toContain("Mass Assignment terdeteksi");
  });

  it("03. Menampilkan daftar task milik tenant yang sama (Slide 48 Langkah 4)", async () => {
    const res = await request(app)
      .get("/api/v1/tasks")
      .set("Authorization", `Bearer ${aliceToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it("04. Alice dapat membaca rincian task miliknya sendiri (Slide 48 Langkah 5)", async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${createdTaskId}`)
      .set("Authorization", `Bearer ${aliceToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdTaskId);
    expect(res.body.title).toContain("Review Dokumen Kontrak");
  });

  it("05. Menolak Bob saat mengakses task milik Alice (BOLA / IDOR Protection -> 403) (Slide 45 & 48 Langkah 9)", async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${createdTaskId}`)
      .set("Authorization", `Bearer ${bobToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Forbidden");
    expect(res.body.detail).toContain("BOLA Violation");
  });

  it("06. Berhasil melakukan PATCH update dengan versi yang benar (Slide 48 Langkah 6)", async () => {
    const res = await request(app)
      .patch(`/api/v1/tasks/${createdTaskId}`)
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({
        title: "Review Dokumen Kontrak OpenAPI TaskHub (Revisi Selesai)",
        version: currentVersion, // Version 1
      });

    expect(res.status).toBe(200);
    expect(res.body.version).toBe(2);
    expect(res.body.title).toContain("(Revisi Selesai)");

    currentVersion = res.body.version; // Version sekarang = 2
  });

  it("07. Menolak PATCH dengan versi lama / stale (Optimistic Concurrency Control -> 409) (Slide 45 & 48 Langkah 7)", async () => {
    // Client mengirimkan versi lama (version: 1), padahal server sudah version 2
    const res = await request(app)
      .patch(`/api/v1/tasks/${createdTaskId}`)
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({
        title: "Perubahan Bentrok Konkurensi",
        version: 1, // Stale version!
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Conflict");
    expect(res.body.detail).toContain("Optimistic Concurrency Conflict");
    expect(res.body.currentVersion).toBe(2);
  });

  it("08. Pengujian notifikasi dengan Idempotency Key stabil (Slide 48 Langkah 11)", async () => {
    const key = `key_test_${Date.now()}`;
    const res = await request(app)
      .post(`/api/v1/tasks/${createdTaskId}/notify`)
      .set("Authorization", `Bearer ${aliceToken}`)
      .set("Idempotency-Key", key)
      .send({ channel: "webhook", priority: "high" });

    expect(res.status).toBe(200);
    expect(res.body.notificationId).toBeDefined();
    expect(res.body.idempotencyKey).toBe(key);
  });

  it("09. Pengujian pengulangan notifikasi dengan Idempotency Key sama mengembalikan respon tersimpan (Slide 48 Langkah 12)", async () => {
    const key = `key_replay_${Date.now()}`;

    // Request pertama
    const res1 = await request(app)
      .post(`/api/v1/tasks/${createdTaskId}/notify`)
      .set("Authorization", `Bearer ${aliceToken}`)
      .set("Idempotency-Key", key)
      .send({ message: "Pengingat deadline" });
    expect(res1.status).toBe(200);

    // Request kedua (Replay dengan key dan body sama)
    const res2 = await request(app)
      .post(`/api/v1/tasks/${createdTaskId}/notify`)
      .set("Authorization", `Bearer ${aliceToken}`)
      .set("Idempotency-Key", key)
      .send({ message: "Pengingat deadline" });

    expect(res2.status).toBe(200);
    expect(res2.body.idempotentReplay).toBe(true);
    expect(res2.body.notificationId).toBe(res1.body.notificationId);
  });

  it("10. Alice menghapus task (Slide 48 Langkah 13)", async () => {
    const res = await request(app)
      .delete(`/api/v1/tasks/${createdTaskId}`)
      .set("Authorization", `Bearer ${aliceToken}`);

    expect(res.status).toBe(204);
  });

  it("11. Membaca task yang telah dihapus mengembalikan HTTP 404 Not Found (Slide 48 Langkah 14)", async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${createdTaskId}`)
      .set("Authorization", `Bearer ${aliceToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Not Found");
  });
});
