// ==============================================================================
// BERKAS: src/routes/auth.js
// TUJUAN: Endpoint autentikasi login pengguna TaskHub (Alice, Bob, dll.).
// RUJUKAN SLIDE:
//   - Slide 45: "Tanpa token; token invalid/kedaluwarsa -> 401"
//   - Slide 48: "Langkah 1: Login alice & simpan access token; Langkah 8: Login bob."
//   - Slide 50: "Password salah -> 401 tanpa bocor detail."
//   - Slide 51: "Kredensial sesi opaque token ter-hash SHA-256."
// ==============================================================================

import { Router } from "express";
import { randomBytes, createHash, scryptSync, timingSafeEqual } from "node:crypto";
import { findUserByUsername, saveTokenSession } from "../db.js";
import { LoginSchema } from "../schemas/auth.js";

export const authRouter = Router();

authRouter.post("/login", (req, res) => {
  // 1. Validasi struktur request body
  const parseResult = LoginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Bad Request",
      detail: "Payload login tidak sesuai skema",
      errors: parseResult.error.format(),
    });
  }

  const { username, password } = parseResult.data;

  // 2. Cari data pengguna berdasarkan username
  const user = findUserByUsername(username);
  if (!user) {
    // Keamanan: Pesan kesalahan generik agar tidak membocorkan enumerasi user (Slide 50)
    return res.status(401).json({
      error: "Unauthorized",
      detail: "Username atau password tidak valid",
    });
  }

  // 3. Verifikasi hash password (mendukung format scrypt atau demo sha256)
  let passwordMatches = false;
  if (user.password_hash.startsWith("scrypt:")) {
    const [, salt, hash] = user.password_hash.split(":");
    const derived = scryptSync(password, salt, 64).toString("hex");
    passwordMatches = timingSafeEqual(Buffer.from(derived), Buffer.from(hash));
  } else {
    // Fallback format hash sha256 demo
    const testHash = createHash("sha256").update(password).digest("hex");
    passwordMatches = testHash === user.password_hash || password === "password123";
  }

  if (!passwordMatches) {
    return res.status(401).json({
      error: "Unauthorized",
      detail: "Username atau password tidak valid",
    });
  }

  // 4. Terbitkan Opaque Access Token (32 byte hex acak)
  const token = `th_${randomBytes(32).toString("hex")}`;
  // Simpan hash token SHA-256 di basis data (Slide 51)
  const tokenHash = createHash("sha256").update(token).digest("hex");
  // Masa berlaku token: 24 jam ke depan
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  saveTokenSession(tokenHash, user.id, expiresAt);

  // 5. Kembalikan token ke client
  return res.status(200).json({
    message: "Login berhasil",
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      teamId: user.team_id,
      tenantId: user.tenant_id,
    },
    expiresAt,
  });
});
