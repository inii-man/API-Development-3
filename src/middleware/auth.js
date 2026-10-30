// ==============================================================================
// BERKAS: src/middleware/auth.js
// TUJUAN: Memvalidasi kredensial Bearer Token dan mengidentifikasi subjek request.
// RUJUKAN SLIDE:
//   - Slide 44: "test('create task requires auth', async () => expect(res.status).toBe(401))"
//   - Slide 45: "Tanpa token; token invalid/kedaluwarsa -> 401"
//   - Slide 50: "Security test matrix: Tanpa token / token random/expired -> 401"
//   - Slide 51: "Tambahan untuk JWT/OAuth di aplikasi nyata (kontrol validasi & expiry)"
// PRINSIP KEAMANAN:
//   - Token Opaque Ter-hash: Database tidak pernah menyimpan token plaintext.
//   - Perlindungan Gagal Terbuka: Setiap request yang gagal otentikasi langsung ditolak 401.
// ==============================================================================

import { createHash } from "node:crypto";
import { findSessionByTokenHash } from "../db.js";

export function authenticate(req, res, next) {
  // 1. Ambil header Authorization
  const authHeader = req.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Unauthorized",
      detail: "Header Authorization Bearer token wajib disertakan",
    });
  }

  // 2. Ekstrak string token
  const token = authHeader.substring(7).trim();
  if (!token) {
    return res.status(401).json({
      error: "Unauthorized",
      detail: "Format token Bearer tidak valid atau kosong",
    });
  }

  // 3. Hash token dengan SHA-256 untuk pencarian aman di database (Slide 45)
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const session = findSessionByTokenHash(tokenHash);

  // 4. Periksa apakah session ditemukan di tabel tokens
  if (!session) {
    return res.status(401).json({
      error: "Unauthorized",
      detail: "Token tidak dikenali atau telah dicabut (Invalid Token)",
    });
  }

  // 5. Periksa kedaluwarsa waktu token
  const now = new Date();
  const expiresAt = new Date(session.expires_at);
  if (now > expiresAt) {
    return res.status(401).json({
      error: "Unauthorized",
      detail: "Token autentikasi telah kedaluwarsa (Expired Token)",
    });
  }

  // 6. Pasang informasi identitas user ke objek request
  req.user = {
    id: session.id,
    username: session.username,
    email: session.email,
    role: session.role,
    teamId: session.team_id,
    tenantId: session.tenant_id,
  };

  next();
}
