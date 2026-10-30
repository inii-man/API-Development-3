// ==============================================================================
// BERKAS: scripts/seed.js
// TUJUAN: Menginisialisasi data awal (seeding) pengguna, sesi token, dan task awal.
// RUJUKAN SLIDE:
//   - Slide 45: "User A (Alice) mengakses task User B (Bob) -> 403"
//   - Slide 48: "Alur 14 Langkah: Login Alice & Login Bob"
//   - Slide 50: "Security Test Matrix: Multi-user dan Multi-tenant isolation"
// ==============================================================================

import { createHash, scryptSync, randomBytes } from "node:crypto";
import { saveUser, saveTokenSession, createTask } from "../src/db.js";

console.log("🌱 [SEED] Memulai inisialisasi basis data TaskHub...");

// Fungsi pembuat hash password dengan scrypt (Slide 50 & 51)
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

// 1. Data Akun Pengguna Lab
const users = [
  {
    id: "usr_alice",
    username: "alice",
    email: "alice@taskhub.example.com",
    password_hash: hashPassword("password123"),
    role: "member",
    team_id: "team_a",
    tenant_id: "tenant_1",
  },
  {
    id: "usr_bob",
    username: "bob",
    email: "bob@taskhub.example.com",
    password_hash: hashPassword("password123"),
    role: "member",
    team_id: "team_b",
    tenant_id: "tenant_1",
  },
  {
    id: "usr_charlie",
    username: "charlie",
    email: "charlie@taskhub.example.com",
    password_hash: hashPassword("password123"),
    role: "manager",
    team_id: "team_a",
    tenant_id: "tenant_1",
  },
  {
    id: "usr_diana",
    username: "diana",
    email: "diana@taskhub.example.com",
    password_hash: hashPassword("password123"),
    role: "admin",
    team_id: "team_a",
    tenant_id: "tenant_1",
  },
  {
    id: "usr_eve",
    username: "eve",
    email: "eve@taskhub.example.com",
    password_hash: hashPassword("password123"),
    role: "member",
    team_id: "team_a",
    tenant_id: "tenant_2", // Organisasi / Tenant terpisah
  },
];

for (const user of users) {
  saveUser(user);
  console.log(`  👤 User tersimpan: ${user.username} (${user.role} · ${user.team_id} · ${user.tenant_id})`);

  // Buat sesi token aktif instan untuk memudahkan pengujian
  const staticToken = `th_test_token_${user.username}`;
  const tokenHash = createHash("sha256").update(staticToken).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  saveTokenSession(tokenHash, user.id, expiresAt);
}

// 2. Data Task Awal
const aliceTask = createTask({
  id: "tsk_demo_alice_01",
  title: "Review Kontrak API Sesi 6-8 NQA",
  description: "Menyiapkan verifikasi webhook HMAC dan arsitektur microservices",
  status: "open",
  owner_id: "usr_alice",
  team_id: "team_a",
  tenant_id: "tenant_1",
});

const bobTask = createTask({
  id: "tsk_demo_bob_01",
  title: "Setup CI/CD Pipeline & Vitest Test Automation",
  description: "Pengujian fungsional dan kontrak API otomatis",
  status: "open",
  owner_id: "usr_bob",
  team_id: "team_b",
  tenant_id: "tenant_1",
});

console.log(`  📝 Task dibuat: ${aliceTask.id} (Milik Alice)`);
console.log(`  📝 Task dibuat: ${bobTask.id} (Milik Bob)`);
console.log("✅ [SEED] Inisialisasi basis data TaskHub selesai sempurna!\n");
console.log("Token pengujian siap pakai:");
console.log("  Alice:   Bearer th_test_token_alice");
console.log("  Bob:     Bearer th_test_token_bob");
console.log("  Charlie: Bearer th_test_token_charlie");
console.log("  Diana:   Bearer th_test_token_diana");
