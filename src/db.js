// ==============================================================================
// BERKAS: src/db.js
// TUJUAN: Inisialisasi basis data SQLite TaskHub, manajemen skema tabel, dan Prepared Statements.
// RUJUKAN SLIDE:
//   - Slide 17: "Durable inbox: jangan 2xx sebelum tersimpan. Lab INSERT di SQLite dan commit sebelum 202."
//   - Slide 18: "Perlindungan race condition: Gunakan unique constraint. INSERT ... ON CONFLICT."
//   - Slide 24: "Model webhook_inbox dan unique constraint: provider, event_id, payload_hash, UNIQUE(provider, event_id)."
//   - Slide 32: "Lab: cek inbox dan effects: SELECT id,status FROM inbox & SELECT event_id,task_id FROM effects."
//   - Slide 38: "Transactional Outbox: Simpan task & outbox dalam transaksi DB yang sama."
//   - Slide 45: "Optimistic Concurrency Control: PATCH dengan versioning."
// PRINSIP ARSITEKTUR:
//   - Durabilitas: Menggunakan SQLite Write-Ahead Logging (WAL) untuk konkurensi tinggi.
//   - Integritas Transaksional: Foreign key aktif, transaksi atomik untuk outbox dan inbox worker.
//   - Anti SQL Injection: 100% Prepared Statements dengan Parameter Binding.
// ==============================================================================

import Database from "better-sqlite3";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { config } from "./config.js";

// Menentukan path absolut berkas SQLite TaskHub
const dbPath = resolve(process.cwd(), config.DATABASE_URL);

// Menginisialisasi koneksi basis data SQLite synchronous (sesuai Slide 32)
// timeout: 5000 ms memberi waktu antrean jika basis data sedang diakses oleh thread uji lain
export const db = new Database(dbPath, { timeout: 5000 });

// Mengaktifkan WAL mode untuk konkurensi pembacaan & penulisan yang optimal
try {
  db.pragma("busy_timeout = 5000");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("synchronous = NORMAL");
} catch (e) {
  // Abaikan jika pragma telah diatur oleh proses lain
}

// ==============================================================================
// INISIALISASI SKEMA TABEL
// ==============================================================================

// 1. Tabel Users: Akun pengguna, peran RBAC (member/manager/admin), dan tenant
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('member', 'manager', 'admin')),
    team_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

// 2. Tabel Tokens: Token opaque ter-hash SHA-256 untuk sesi login
db.exec(`
  CREATE TABLE IF NOT EXISTS tokens (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// 3. Tabel Tasks: Resource tugas dengan kontrol versi optimis (Optimistic Locking)
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK(status IN ('open', 'done', 'completed')),
    version INTEGER NOT NULL DEFAULT 1,
    owner_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// 4. Tabel Inbox (Model webhook_inbox - Slide 24 & Slide 32)
// Menampung webhook yang masuk secara durabel sebelum mengirim balasan HTTP 202
db.exec(`
  CREATE TABLE IF NOT EXISTS inbox (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload_hash TEXT NOT NULL,
    raw_payload TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('received', 'processing', 'processed', 'failed')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    received_at TEXT NOT NULL,
    processed_at TEXT,
    last_error TEXT,
    CONSTRAINT unq_provider_event_id UNIQUE (provider, event_id)
  );
`);

// Membuat View webhook_inbox sebagai sinonim eksplisit sesuai penamaan di Slide 24
db.exec(`
  CREATE VIEW IF NOT EXISTS webhook_inbox AS 
  SELECT * FROM inbox;
`);

// 5. Tabel Effects (Slide 25 & Slide 32)
// Mencatat efek samping demonstrasi yang dieksekusi oleh worker (idempotent, 1 efek per event)
db.exec(`
  CREATE TABLE IF NOT EXISTS effects (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    effect_type TEXT NOT NULL DEFAULT 'task.completed.effect',
    applied_at TEXT NOT NULL,
    details TEXT,
    CONSTRAINT unq_event_effect UNIQUE (event_id)
  );
`);

// 6. Tabel Idempotency Keys (Slide 48 alur langkah 11 & 12)
// Menjamin pemanggilan ulang POST /tasks/:id/notify dengan kunci yang sama menghasilkan efek tunggal
db.exec(`
  CREATE TABLE IF NOT EXISTS idempotency_keys (
    key TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    response_body TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

// 7. Tabel Transactional Outbox (Slide 38: Dual write prevention)
// Menyimpan intent pengiriman event dalam transaksi basis data yang sama dengan penyimpanan entity
db.exec(`
  CREATE TABLE IF NOT EXISTS outbox (
    id TEXT PRIMARY KEY,
    aggregate_type TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'published', 'failed')),
    created_at TEXT NOT NULL,
    published_at TEXT
  );
`);

// 8. Tabel Simulator Transaksi Terdistribusi SAGA (Slide 40: Reservasi, Pembayaran, Kompensasi)
db.exec(`
  CREATE TABLE IF NOT EXISTS saga_orders (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    item TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('RESERVED', 'PAID', 'CONFIRMED', 'CANCELLED', 'REFUNDED')),
    step TEXT NOT NULL,
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

// ==============================================================================
// PREPARED STATEMENTS (Aman dari SQL Injection & Berkinerja Tinggi)
// ==============================================================================

// --- OPERASI PENGGUNA & AUTENTIKASI ---
const stmtFindUserByUsername = db.prepare("SELECT * FROM users WHERE username = ?");
export function findUserByUsername(username) {
  return stmtFindUserByUsername.get(username) || null;
}

const stmtFindUserById = db.prepare("SELECT id, username, email, role, team_id, tenant_id, created_at FROM users WHERE id = ?");
export function findUserById(id) {
  return stmtFindUserById.get(id) || null;
}

const stmtInsertUser = db.prepare(`
  INSERT OR REPLACE INTO users (id, username, email, password_hash, role, team_id, tenant_id, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
export function saveUser(user) {
  stmtInsertUser.run(
    user.id,
    user.username,
    user.email,
    user.password_hash,
    user.role,
    user.team_id,
    user.tenant_id,
    user.created_at || new Date().toISOString()
  );
}

const stmtInsertToken = db.prepare("INSERT INTO tokens (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)");
export function saveTokenSession(tokenHash, userId, expiresAt) {
  stmtInsertToken.run(tokenHash, userId, expiresAt, new Date().toISOString());
}

const stmtFindSessionByTokenHash = db.prepare(`
  SELECT t.token_hash, t.expires_at, u.id, u.username, u.email, u.role, u.team_id, u.tenant_id
  FROM tokens t
  JOIN users u ON t.user_id = u.id
  WHERE t.token_hash = ?
`);
export function findSessionByTokenHash(tokenHash) {
  return stmtFindSessionByTokenHash.get(tokenHash) || null;
}

// --- OPERASI RESOURCE TASK (DENGAN BOLA & OPTIMISTIC CONCURRENCY) ---
const stmtInsertTask = db.prepare(`
  INSERT INTO tasks (id, title, description, status, version, owner_id, team_id, tenant_id, created_at, updated_at)
  VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
`);
export function createTask(task) {
  stmtInsertTask.run(
    task.id,
    task.title,
    task.description || null,
    task.status || "open",
    task.owner_id,
    task.team_id,
    task.tenant_id,
    new Date().toISOString(),
    new Date().toISOString()
  );
  return findTaskById(task.id);
}

const stmtFindTaskById = db.prepare("SELECT * FROM tasks WHERE id = ?");
export function findTaskById(id) {
  return stmtFindTaskById.get(id) || null;
}

const stmtListTasksByTenant = db.prepare("SELECT * FROM tasks WHERE tenant_id = ? ORDER BY created_at DESC");
export function listTasksByTenant(tenantId) {
  return stmtListTasksByTenant.all(tenantId);
}

// Memperbarui task dengan Optimistic Locking: memeriksa apakah versi di DB sama persis dengan yang dikirim client
const stmtUpdateTaskWithVersion = db.prepare(`
  UPDATE tasks
  SET title = COALESCE(?, title),
      description = COALESCE(?, description),
      status = COALESCE(?, status),
      version = version + 1,
      updated_at = ?
  WHERE id = ? AND version = ?
`);
export function updateTaskWithVersion(id, currentVersion, updates) {
  const result = stmtUpdateTaskWithVersion.run(
    updates.title !== undefined ? updates.title : null,
    updates.description !== undefined ? updates.description : null,
    updates.status !== undefined ? updates.status : null,
    new Date().toISOString(),
    id,
    currentVersion
  );
  return result.changes > 0;
}

const stmtDeleteTaskById = db.prepare("DELETE FROM tasks WHERE id = ?");
export function deleteTaskById(id) {
  const result = stmtDeleteTaskById.run(id);
  return result.changes > 0;
}

// --- OPERASI DURABLE INBOX (Slide 15, 17, 18, 24) ---
// Mencari event inbox berdasarkan kombinasi kunci unik (provider, event_id)
const stmtFindInboxEvent = db.prepare("SELECT * FROM inbox WHERE provider = ? AND event_id = ?");
export function findInboxEvent(provider, eventId) {
  return stmtFindInboxEvent.get(provider, eventId) || null;
}

// Memasukkan event baru ke dalam inbox secara durabel
const stmtInsertInboxEvent = db.prepare(`
  INSERT INTO inbox (
    id, provider, event_id, event_type, payload_hash, raw_payload, status, retry_count, received_at, processed_at, last_error
  ) VALUES (?, ?, ?, ?, ?, ?, 'received', 0, ?, NULL, NULL)
`);
export function insertInboxEvent(record) {
  stmtInsertInboxEvent.run(
    record.id || record.event_id,
    record.provider,
    record.event_id,
    record.event_type,
    record.payload_hash,
    record.raw_payload,
    record.received_at || new Date().toISOString()
  );
}

// Mengambil batch event inbox yang berstatus 'received' untuk dieksekusi worker (Slide 25)
const stmtGetPendingInboxEvents = db.prepare(`
  SELECT * FROM inbox WHERE status = 'received' ORDER BY received_at ASC LIMIT ?
`);
export function getPendingInboxEvents(limit = 10) {
  return stmtGetPendingInboxEvents.all(limit);
}

// Mengunci event (lease/claim) menjadi status 'processing' untuk mencegah worker ganda (Slide 26)
const stmtClaimInboxEvent = db.prepare(`
  UPDATE inbox SET status = 'processing' WHERE id = ? AND status = 'received'
`);
export function claimInboxEvent(id) {
  const result = stmtClaimInboxEvent.run(id);
  return result.changes > 0;
}

// Menandai event berhasil diproses (status: 'processed')
const stmtMarkInboxProcessed = db.prepare(`
  UPDATE inbox SET status = 'processed', processed_at = ? WHERE id = ?
`);
export function markInboxProcessed(id) {
  stmtMarkInboxProcessed.run(new Date().toISOString(), id);
}

// Menandai event gagal diproses dan mencatat pesan kesalahan serta menambah hitungan retry
const stmtMarkInboxFailed = db.prepare(`
  UPDATE inbox 
  SET status = CASE WHEN retry_count + 1 >= 3 THEN 'failed' ELSE 'received' END,
      retry_count = retry_count + 1,
      last_error = ?
  WHERE id = ?
`);
export function markInboxFailed(id, errorMessage) {
  stmtMarkInboxFailed.run(errorMessage, id);
}

// Menampilkan seluruh data inbox untuk inspeksi lab / playground (Slide 32)
const stmtListAllInbox = db.prepare("SELECT * FROM inbox ORDER BY received_at DESC");
export function listAllInbox() {
  return stmtListAllInbox.all();
}

// --- OPERASI TABEL EFFECTS (Slide 25 & Slide 32) ---
const stmtInsertEffect = db.prepare(`
  INSERT OR IGNORE INTO effects (id, event_id, task_id, effect_type, applied_at, details)
  VALUES (?, ?, ?, ?, ?, ?)
`);
export function insertEffect(effect) {
  const result = stmtInsertEffect.run(
    effect.id || `eff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    effect.event_id,
    effect.task_id,
    effect.effect_type || "task.completed.effect",
    new Date().toISOString(),
    effect.details || null
  );
  return result.changes > 0;
}

const stmtFindEffectByEventId = db.prepare("SELECT * FROM effects WHERE event_id = ?");
export function findEffectByEventId(eventId) {
  return stmtFindEffectByEventId.get(eventId) || null;
}

const stmtListAllEffects = db.prepare("SELECT * FROM effects ORDER BY applied_at DESC");
export function listAllEffects() {
  return stmtListAllEffects.all();
}

// --- OPERASI IDEMPOTENCY KEY (Slide 48 Langkah 11 & 12) ---
const stmtFindIdempotencyKey = db.prepare("SELECT * FROM idempotency_keys WHERE key = ?");
export function findIdempotencyKey(key) {
  return stmtFindIdempotencyKey.get(key) || null;
}

const stmtSaveIdempotencyKey = db.prepare(`
  INSERT INTO idempotency_keys (key, user_id, request_hash, status_code, response_body, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);
export function saveIdempotencyKey(record) {
  stmtSaveIdempotencyKey.run(
    record.key,
    record.user_id,
    record.request_hash,
    record.status_code,
    record.response_body,
    new Date().toISOString()
  );
}

// --- OPERASI TRANSACTIONAL OUTBOX (Slide 38) ---
const stmtInsertOutboxEvent = db.prepare(`
  INSERT INTO outbox (id, aggregate_type, aggregate_id, event_type, payload, status, created_at, published_at)
  VALUES (?, ?, ?, ?, ?, 'pending', ?, NULL)
`);

// Transaksi atomik: Menyimpan entity task sekaligus menyisipkan catatan ke tabel outbox
export const saveTaskWithOutboxTransaction = db.transaction((task, outboxPayload) => {
  // 1. Simpan entity task ke basis data
  stmtInsertTask.run(
    task.id,
    task.title,
    task.description || null,
    task.status || "open",
    task.owner_id,
    task.team_id,
    task.tenant_id,
    new Date().toISOString(),
    new Date().toISOString()
  );

  // 2. Simpan record event ke outbox dalam transaksi yang sama persis (Slide 38)
  const outboxId = `out_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  stmtInsertOutboxEvent.run(
    outboxId,
    "task",
    task.id,
    "task.created.v1",
    JSON.stringify(outboxPayload),
    new Date().toISOString()
  );

  return { task: findTaskById(task.id), outboxId };
});

const stmtListPendingOutbox = db.prepare("SELECT * FROM outbox WHERE status = 'pending' ORDER BY created_at ASC");
export function listPendingOutbox() {
  return stmtListPendingOutbox.all();
}

const stmtMarkOutboxPublished = db.prepare(`
  UPDATE outbox SET status = 'published', published_at = ? WHERE id = ?
`);
export function markOutboxPublished(id) {
  stmtMarkOutboxPublished.run(new Date().toISOString(), id);
}

const stmtListAllOutbox = db.prepare("SELECT * FROM outbox ORDER BY created_at DESC");
export function listAllOutbox() {
  return stmtListAllOutbox.all();
}

// --- OPERASI SAGA TRANSACTION SIMULATOR (Slide 40) ---
const stmtInsertSagaOrder = db.prepare(`
  INSERT INTO saga_orders (id, order_id, item, amount, status, step, error_message, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
export function createSagaOrder(order) {
  stmtInsertSagaOrder.run(
    order.id,
    order.order_id,
    order.item,
    order.amount,
    order.status,
    order.step,
    order.error_message || null,
    new Date().toISOString(),
    new Date().toISOString()
  );
}

const stmtUpdateSagaOrder = db.prepare(`
  UPDATE saga_orders
  SET status = ?, step = ?, error_message = ?, updated_at = ?
  WHERE id = ?
`);
export function updateSagaOrder(id, status, step, errorMessage = null) {
  stmtUpdateSagaOrder.run(status, step, errorMessage, new Date().toISOString(), id);
}

const stmtListAllSagaOrders = db.prepare("SELECT * FROM saga_orders ORDER BY created_at DESC");
export function listAllSagaOrders() {
  return stmtListAllSagaOrders.all();
}

// Inisialisasi seed default jika basis data kosong
export function ensureDefaultSeed() {
  const userCount = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  if (userCount === 0) {
    const defaultUsers = [
      { id: "usr_alice", username: "alice", email: "alice@taskhub.example.com", password_hash: "password123", role: "member", team_id: "team_a", tenant_id: "tenant_1" },
      { id: "usr_bob", username: "bob", email: "bob@taskhub.example.com", password_hash: "password123", role: "member", team_id: "team_b", tenant_id: "tenant_1" },
      { id: "usr_charlie", username: "charlie", email: "charlie@taskhub.example.com", password_hash: "password123", role: "manager", team_id: "team_a", tenant_id: "tenant_1" },
      { id: "usr_diana", username: "diana", email: "diana@taskhub.example.com", password_hash: "password123", role: "admin", team_id: "team_a", tenant_id: "tenant_1" },
      { id: "usr_eve", username: "eve", email: "eve@taskhub.example.com", password_hash: "password123", role: "member", team_id: "team_a", tenant_id: "tenant_2" },
    ];
    for (const u of defaultUsers) {
      saveUser(u);
      // Buat token statis untuk kemudahan lab/test
      const staticToken = `th_test_token_${u.username}`;
      const tokenHash = createHash("sha256").update(staticToken).digest("hex");
      saveTokenSession(tokenHash, u.id, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
    }
  }
}

// Jalankan ensureDefaultSeed otomatis
ensureDefaultSeed();

// Membersihkan basis data untuk isolasi pengujian otomatis (Slide 43)
export function resetTestDatabase() {
  db.exec("DELETE FROM effects;");
  db.exec("DELETE FROM inbox;");
  db.exec("DELETE FROM outbox;");
  db.exec("DELETE FROM saga_orders;");
  db.exec("DELETE FROM idempotency_keys;");
  db.exec("DELETE FROM tasks;");
  db.exec("DELETE FROM tokens;");
  db.exec("DELETE FROM users;");
  ensureDefaultSeed();
}
