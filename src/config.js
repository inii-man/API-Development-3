// ==============================================================================
// BERKAS: src/config.js
// TUJUAN: Memvalidasi konfigurasi variabel lingkungan (Environment Variables) saat startup.
// RUJUKAN SLIDE:
//   - Slide 9: "Kontrak webhook TaskHub: HMAC timestamp.raw-body, toleransi 300 detik."
//   - Slide 21: "const expected = createHmac('sha256', config.webhookSecret)..."
//   - Slide 30: "export WEBHOOK_SECRET=... node --watch src/server.js"
//   - Slide 45: "Konfigurasi terisolasi dari kode, validasi variabel runtime."
//   - Slide 58: "Checklist produksi: Platform, Credential, Secret manager/KMS."
// PRINSIP KEAMANAN:
//   - Fail-Fast: Hentikan server seketika jika secret atau port tidak valid.
//   - Validasi Runtime Ketat: Menggunakan Zod agar tipe data terjamin.
// ==============================================================================

// Mengimpor library dotenv untuk membaca file .env secara otomatis
import "dotenv/config";

// Mengimpor Zod untuk validasi skema runtime
import { z } from "zod";

// Skema konfigurasi lingkungan menggunakan Zod
const EnvSchema = z.object({
  // Port HTTP server TaskHub (Default 3000 sesuai Slide 29)
  PORT: z
    .string()
    .default("3000")
    .transform((val) => parseInt(val, 10))
    .refine((port) => port > 0 && port < 65536, {
      message: "PORT harus berupa angka port TCP yang valid (1-65535)",
    }),

  // Lokasi path database SQLite TaskHub (Slide 17, 24, 32)
  DATABASE_URL: z
    .string()
    .default("./taskhub.db")
    .describe("Path file database SQLite lokal"),

  // Secret kunci bersama (shared secret) HMAC-SHA256 untuk webhook TaskHub
  // Slide 21: createHmac("sha256", config.webhookSecret)
  // Slide 30: Nilai acak 32 bytes (64 karakter hex)
  WEBHOOK_SECRET: z
    .string()
    .min(16, "WEBHOOK_SECRET harus minimal 16 karakter demi ketahanan brute-force HMAC"),

  // Origin yang diizinkan untuk CORS peramban (Slide 46)
  ALLOWED_ORIGIN: z
    .string()
    .default("https://app.taskhub.example.com")
    .describe("Origin client frontend resmi TaskHub"),

  // Lingkungan operasional server: development, test, atau production (Slide 57)
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Toleransi clock skew tanda tangan webhook dalam satuan detik (Slide 9 & 20)
  WEBHOOK_TOLERANCE_SECONDS: z
    .string()
    .default("300")
    .transform((val) => parseInt(val, 10)),

  // Batas ukuran maksimal raw body webhook dalam byte (Slide 9: 65536 byte / 64kb)
  WEBHOOK_MAX_BODY_BYTES: z
    .string()
    .default("65536")
    .transform((val) => parseInt(val, 10)),
});

// Fungsi pembantu untuk memvalidasi seluruh environment variables
function loadAndValidateConfig() {
  // Mengeksekusi validasi aman terhadap variabel process.env
  const parsed = EnvSchema.safeParse(process.env);

  // Jika terdapat kegagalan validasi, hentikan proses seketika (Fail-Fast)
  if (!parsed.success) {
    console.error("❌ [FATAL CONFIG ERROR] Konfigurasi environment tidak memenuhi syarat:");
    console.error(JSON.stringify(parsed.error.format(), null, 2));
    process.exit(1);
  }

  // Mengembalikan objek konfigurasi yang bersih dan aman
  return parsed.data;
}

// Mengekspor objek konfigurasi tunggal (singleton)
export const config = loadAndValidateConfig();
