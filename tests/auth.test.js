// ==============================================================================
// BERKAS: tests/auth.test.js
// TUJUAN: Pengujian otomatis fungsional dan keamanan untuk Autentikasi dan Token.
// RUJUKAN SLIDE:
//   - Slide 44: "test('create task requires auth', async () => expect(res.status).toBe(401))"
//   - Slide 45: "Tanpa token; token invalid/kedaluwarsa -> 401"
//   - Slide 47: "auth.test.js: Identitas dan penolakan token."
//   - Slide 50: "Security Test Matrix: Tanpa token / token random/expired -> 401; Password salah -> 401 tanpa bocor detail."
// ==============================================================================

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { resetTestDatabase } from "../src/db.js";

describe("Skenario Pengujian Autentikasi & Token (Slide 45, 47, 50)", () => {
  beforeAll(async () => {
    // Reset database dan seed data user untuk isolasi test (Slide 43)
    resetTestDatabase();
    await import("../scripts/seed.js");
  });

  it("01. Menolak request tanpa token otentikasi dengan HTTP 401 (Slide 44 & 45)", async () => {
    const res = await request(app)
      .post("/api/v1/tasks")
      .send({ title: "Review kontrak API" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
    expect(res.body.detail).toContain("Header Authorization Bearer token wajib disertakan");
  });

  it("02. Menolak request dengan token acak / invalid dengan HTTP 401 (Slide 45 & 50)", async () => {
    const res = await request(app)
      .get("/api/v1/tasks")
      .set("Authorization", "Bearer token_palsu_ngawur_12345");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
    expect(res.body.detail).toContain("Token tidak dikenali");
  });

  it("03. Menolak login dengan password salah dengan HTTP 401 tanpa membocorkan detail (Slide 50)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ username: "alice", password: "PasswordSalahTotal999" });

    expect(res.status).toBe(401);
    expect(res.body.detail).toBe("Username atau password tidak valid");
  });

  it("04. Menolak login dengan username yang tidak ada dengan HTTP 401 tanpa user enumeration (Slide 50)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ username: "user_fiktif_gaib", password: "password123" });

    expect(res.status).toBe(401);
    expect(res.body.detail).toBe("Username atau password tidak valid");
  });

  it("05. Berhasil login dengan kredensial sah dan mengembalikan Opaque Token (Slide 48 Langkah 1)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ username: "alice", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.token.startsWith("th_")).toBe(true);
    expect(res.body.user.username).toBe("alice");
    expect(res.body.user.role).toBe("member");
  });
});
