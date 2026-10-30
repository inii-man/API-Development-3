# 🛠️ Panduan Instalasi & Menjalankan Lab - API Development Hari 3

Panduan ini memandu Anda langkah demi langkah dalam menyiapkan lingkungan lokal (*local development environment*), menginisialisasi basis data SQLite, menjalankan pengujian otomatis, serta mengakses Web Playground interaktif.

---

## 💻 1. Prasyarat Sistem & Perangkat Lunak

Sebelum memulai, pastikan komputer Anda telah terinstal:
- **Node.js**: Versi **20.x** atau lebih baru (Disarankan versi LTS atau Node 22/24).
  - Periksa versi di terminal: `node -v`
- **NPM**: Versi **9.x** atau lebih baru.
  - Periksa versi di terminal: `npm -v`
- **Git**: Untuk manajemen versi source code.
  - Periksa versi: `git --version`

---

## 📥 2. Langkah Instalasi Langkah demi Langkah

### Langkah 1: Masuk ke Direktori Proyek
Buka terminal (macOS / Linux) atau Command Prompt / PowerShell (Windows), lalu navigasikan ke folder proyek:
```bash
cd /Users/sulaimansaleh/Documents/API-Development-3
```

### Langkah 2: Menginstal Dependensi NPM
Instal seluruh paket pustaka yang didefinisikan pada `package.json`:
```bash
npm install
```
*Paket yang diinstal meliputi: Express 5, Better-SQLite3, Zod, Pino, Pino-Pretty, Cors, Express-Rate-Limit, Vitest, dan Supertest.*

### Langkah 3: Menyiapkan Konfigurasi Lingkungan (`.env`)
Salin file konfigurasi templat `.env.example` menjadi `.env`:
```bash
# macOS / Linux:
cp .env.example .env

# Windows (Command Prompt):
copy .env.example .env

# Windows (PowerShell):
Copy-Item .env.example .env
```

Isi default pada `.env`:
```env
PORT=3000
DATABASE_URL=./taskhub.db
WEBHOOK_SECRET=4f8b2d1c9e7a6f5e3d2c1b0a9f8e7d6c5b4a39281706f5e4d3c2b1a0f9e8d7c6
ALLOWED_ORIGIN=https://app.taskhub.example.com
NODE_ENV=development
```

### Langkah 4: Inisialisasi Basis Data (Seeding)
Jalankan skrip seeder untuk membuat tabel-tabel SQLite dan mengisi data pengguna awal (Alice, Bob, Charlie, Diana, Eve) serta task awal:
```bash
npm run seed
```
*Output yang berhasil:*
```text
🌱 [SEED] Memulai inisialisasi basis data TaskHub...
  👤 User tersimpan: alice (member · team_a · tenant_1)
  👤 User tersimpan: bob (member · team_b · tenant_1)
  ...
✅ [SEED] Inisialisasi basis data TaskHub selesai sempurna!
```

---

## 🧪 3. Menjalankan Otomasi Pengujian (Vitest & Supertest)

Untuk memverifikasi bahwa seluruh logika bisnis, keamanan, tanda tangan HMAC, BOLA, dan versioning bekerja sesuai 69 slide presentasi:
```bash
npm test
```
*Hasil yang diharapkan: **Seluruh 4 Test Suites dan 30 Test Cases LULUS (Passed)!***

Untuk menjalankan pengujian dalam mode pemantauan (*watch mode*):
```bash
npm run test:watch
```

---

## 🚀 4. Menjalankan Server & Membuka Playground

### Mode Produksi / Standar:
```bash
npm start
```

### Mode Pengembangan (Auto-Reload saat Kode Berubah):
```bash
npm run dev
```

Saat server berjalan, output konsol akan menampilkan banner:
```text
==================================================================
🌐 TaskHub API Server Hari 3 running on: http://127.0.0.1:3000
🎨 Web Playground Interaktif:          http://127.0.0.1:3000/playground
📨 Webhook Receiver Endpoint:          POST http://127.0.0.1:3000/webhooks/taskhub
🩺 Health Readiness Probe:             http://127.0.0.1:3000/health/readiness
📊 Metrics & SLO Endpoint:             http://127.0.0.1:3000/metrics
==================================================================
```

### Buka Web Playground di Browser:
Akses tautan: **[http://127.0.0.1:3000/playground](http://127.0.0.1:3000/playground)**

Di dalam Web Playground, Anda dapat mencoba:
1. **Webhook & HMAC Studio**: Mengirim event sah (202), duplikat (202 duplicate), modifikasi hash (409), tanda tangan rusak (400), timestamp kedaluwarsa (400), dan skema cacat (422).
2. **Durable Inbox & Worker**: Melihat tabel `inbox` dan `effects` serta memicu worker tick secara manual.
3. **Outbox & SAGA Simulator**: Menguji transaksi atomik outbox, publisher crash, dan alur SAGA dengan transaksi kompensasi.
4. **Workflow 14-Langkah**: Menjalankan pengujian 14 langkah Postman/Insomnia secara otomatis dengan sekali klik.
5. **Matriks Uji Keamanan**: Menguji 15 skenario keamanan satu per satu.
6. **Observabilitas**: Memantau structured logging Pino bebas kebocoran kredensial dan metrik persentil latensi.

---

## ⚙️ 5. Menjalankan Skrip Laboratorium CLI (Opsional)

Jika server sedang berjalan di satu terminal, Anda dapat membuka tab/jendela terminal kedua untuk menjalankan eksperimen berikut:

### 1. Mengirim Event Webhook Bertanda Tangan 2 Kali (Slide 29 & 31)
```bash
npm run send:event
```

### 2. Memeriksa Isi Basis Data SQLite Secara Langsung (Slide 32)
```bash
npm run check:db
```

### 3. Menguji 5 Skenario Uji Negatif Webhook (Slide 33)
```bash
npm run test:negative
```

### 4. Menjalankan Background Worker di Proses Terpisah (Slide 25 & 57)
```bash
npm run worker
```

---

## ❓ 6. Penyelesaian Masalah Umum (Troubleshooting)

### Error: `PORT 3000 is already in use`
- **Penyebab**: Terdapat proses Node.js atau aplikasi lain yang sedang menggunakan port 3000.
- **Solusi**: Matikan proses lama dengan perintah:
  - macOS / Linux: `lsof -ti:3000 | xargs kill -9`
  - Windows: `netstat -ano | findstr :3000` lalu `taskkill /PID <PID> /F`
  - Atau ubah `PORT=3005` pada berkas `.env`.

### Error: `SqliteError: database is locked`
- **Penyebab**: Basis data SQLite diakses bersamaan tanpa batas timeout yang memadai.
- **Solusi**: Kode `src/db.js` telah mengaktifkan mode WAL (`PRAGMA journal_mode = WAL`) dan `timeout: 5000`. Jika terjadi saat pengujian paralel, jalankan pengujian dengan skrip resmi `npm test` yang menyertakan flag `--fileParallelism=false`.
