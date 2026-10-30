// ==============================================================================
// BERKAS: src/middleware/bola.js
// TUJUAN: Menegakkan otorisasi kepemilikan objek (BOLA / Broken Object Level Authorization).
// RUJUKAN SLIDE:
//   - Slide 45: "User A mengakses task User B -> 403"
//   - Slide 48: "Langkah 9: Bob akses task alice: 403"
//   - Slide 50: "Bob akses task alice; manager A akses task bob -> 403"
//   - Slide 64: "Lembar peer review: User A ditolak pada data user B? Status dan policy."
// PRINSIP KEAMANAN:
//   - Prinsip Hak Istimewa Terendah (Least Privilege):
//     Keberadaan token valid saja TIDAK CUKUP untuk mengakses resource milik akun lain.
//   - Memvalidasi owner_id task terhadap req.user.id sebelum operasi diizinkan.
// ==============================================================================

import { findTaskById } from "../db.js";

export function authorizeTaskOwnership(req, res, next) {
  const taskId = req.params.id;
  if (!taskId) {
    return next();
  }

  // 1. Cari resource task di basis data
  const task = findTaskById(taskId);
  if (!task) {
    // Jika tidak ditemukan, kembalikan 404 (Slide 48 langkah 14)
    return res.status(404).json({
      error: "Not Found",
      detail: `Task dengan ID '${taskId}' tidak ditemukan`,
    });
  }

  // 2. Simpan task di objek request agar controller tidak perlu melakukan kueri ulang
  req.task = task;

  // 3. Pengecekan multi-tenant dasar
  if (task.tenant_id !== req.user.tenantId) {
    return res.status(403).json({
      error: "Forbidden",
      detail: "Akses ditolak: Resource berada pada organisasi (tenant) yang berbeda",
    });
  }

  // 4. Pengecekan BOLA / Kepemilikan Objek (Slide 45 & 50)
  // Admin organisasi memiliki izin supervisi, namun sesama member (Alice vs Bob) atau antar-tim dilarang keras!
  if (req.user.role !== "admin" && task.owner_id !== req.user.id) {
    return res.status(403).json({
      error: "Forbidden",
      detail: "Akses ditolak (BOLA Violation): Anda tidak berhak membaca atau mengubah task milik pengguna lain",
    });
  }

  next();
}
