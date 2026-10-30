// ==============================================================================
// BERKAS: scripts/check_db.js
// TUJUAN: Memeriksa isi tabel inbox dan effects di database SQLite TaskHub.
// RUJUKAN SLIDE:
//   - Slide 32: "Lab: cek inbox dan effects:
//                import Database from 'better-sqlite3';
//                const db = new Database('taskhub.db', { readonly: true });
//                console.log(db.prepare('SELECT id,status FROM inbox').all());
//                console.log(db.prepare('SELECT event_id,task_id FROM effects').all());"
// ==============================================================================

import Database from "better-sqlite3";
import { resolve } from "node:path";

const dbFile = resolve(process.cwd(), "taskhub.db");
console.log(`🔍 [CHECK_DB] Membuka database: ${dbFile}\n`);

try {
  const db = new Database(dbFile, { readonly: true });

  console.log("📥 [TABEL INBOX] (Slide 24 & 32):");
  const inboxRows = db.prepare("SELECT id, provider, event_id, status, retry_count, received_at, processed_at FROM inbox").all();
  console.table(inboxRows);

  console.log("\n⚡ [TABEL EFFECTS] (Slide 25 & 32):");
  const effectRows = db.prepare("SELECT id, event_id, task_id, effect_type, applied_at FROM effects").all();
  console.table(effectRows);

  console.log("\n💡 Catatan Slide 32: Setelah worker jalan -> event processed, satu effect per event ID.");
  console.log("   Restart receiver & kirim ulang -> duplikat tetap terdeteksi karena database persisten.\n");
} catch (err) {
  console.error("❌ Gagal membaca database SQLite:", err.message);
  console.error("   Pastikan database taskhub.db sudah dibuat (jalankan npm run seed atau kirim event terlebih dahulu).");
}
