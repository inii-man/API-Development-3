// ==============================================================================
// BERKAS: tests/security.test.js
// TUJUAN: Pengujian otomatis kontrol keamanan (Input Control, Rate Limiting, CORS).
// RUJUKAN SLIDE:
//   - Slide 45 & 50: "JSON rusak / Content-Type tak didukung / body melewati batas -> 400 / 415 / 413"
//   - Slide 46 & 50: "Melewati rate limit -> 429; Origin asing -> Tanpa header allow-origin"
//   - Slide 47: "security.test.js: Input, rate limit, CORS."
// ==============================================================================

import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";

describe("Skenario Pengujian Keamanan Sistem (Slide 45, 46, 47, 50)", () => {
  it("01. Menolak sintaks JSON rusak dengan HTTP 400 Bad Request (Slide 45 & 50)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("Content-Type", "application/json")
      .send('{"username": "alice", "password": '); // JSON tidak tertutup

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Bad Request");
    expect(res.body.detail).toContain("Sintaks JSON");
  });

  it("02. Origin asing tidak mendapatkan header Access-Control-Allow-Origin (CORS Enforcement) (Slide 46 & 50)", async () => {
    const res = await request(app)
      .get("/health/liveness")
      .set("Origin", "https://hacker-malicious-site.example.com");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("03. Origin resmi yang diizinkan mendapatkan header Access-Control-Allow-Origin (Slide 46)", async () => {
    const res = await request(app)
      .get("/health/liveness")
      .set("Origin", "https://app.taskhub.example.com");

    expect(res.headers["access-control-allow-origin"]).toBe("https://app.taskhub.example.com");
  });

  it("04. Liveness probe mengembalikan status 200 alive (Slide 57)", async () => {
    const res = await request(app).get("/health/liveness");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("alive");
    expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it("05. Readiness probe mengembalikan status 200 ready dengan database connected (Slide 57)", async () => {
    const res = await request(app).get("/health/readiness");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ready");
    expect(res.body.database).toBe("connected");
  });

  it("06. Metrics endpoint mengembalikan target SLO dan sinyal operasi (Slide 52 & 55)", async () => {
    const res = await request(app).get("/metrics");
    expect(res.status).toBe(200);
    expect(res.body.sloTarget).toBeDefined();
    expect(res.body.performanceMetrics).toBeDefined();
  });
});
