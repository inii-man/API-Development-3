# 📚 Silabus & Modul Bahan Ajar: API Development Training (Hari 3)
**Fokus: Webhook, Microservices, Pengujian, dan Proyek End-to-End (Operasi & Evaluasi)**

Selamat datang di modul pembelajaran resmi **API Development Training - Hari 3**.
Bahan ajar ini disusun secara komprehensif untuk membedah **seluruh 69 slide presentasi pelatihan resmi NQA**. Modul ini menjembatani teori pengiriman event terdistribusi (*Event-Driven Architecture*), jaminan keandalan (*Delivery Guarantees*), transaksi lintas layanan (*Outbox & SAGA*), otomatisasi pengujian (*Vitest & Supertest*), hingga operasional produksi (*Observability & Health Probes*) pada stack **Node.js 20+, Express, SQLite (WAL Mode), dan modul bawaan `node:crypto`**.

---

## 🎯 Tujuan & Output Hari 3 (Slide 1, 3, & 4)

Tujuan utama dari Hari 3 adalah **menutup alur end-to-end dengan bukti penerimaan, pengujian, dan operasi**:
1. **Fondasi (Hari 1 & 2)**: Task dikelola aman pada Hari 1. Integrasi menangani kegagalan pihak ketiga pada Hari 2.
2. **Delivery (Hari 3 - Bagian 1 & 2)**: Event webhook diterima secara durabel (*Durable Inbox*). Duplikat dan pemutaran ulang (*replay*) diuji secara empiris, bukan diasumsikan aman.
3. **Komunikasi Microservice (Hari 3 - Bagian 3)**: Memilih pola sinkron vs asinkron, mencegah masalah *Dual Write* via *Transactional Outbox*, dan merancang pemulihan kegagalan lintas-layanan via *Saga Pattern*.
4. **Bukti & Pengujian (Hari 3 - Bagian 4)**: Hasil dapat diuji secara otomatis melalui *Test Collection* (Vitest + Supertest) dan matriks 15 skenario keamanan.
5. **Operasi & Observabilitas (Hari 3 - Bagian 5)**: Memantau sistem melalui *Structured Logging* tanpa kebocoran rahasia, indikator metrik latensi persentil (p50/p95/p99), *Health Probes* (*Liveness* & *Readiness*), serta rencana penerapan 30/60/90 hari.

---

## ⏱️ Struktur Agenda & Alokasi Waktu (Slide 2)

| Sesi Silabus | Topik Utama | Alokasi Waktu | Rujukan Slide |
| :--- | :--- | :--- | :--- |
| **Sesi 6** | **Webhook dan Komunikasi Antar-Microservice** (HMAC, Raw Body, Deduplikasi, Durable Inbox, Worker, Outbox, SAGA) | 150 Menit | Slide 5 – 40 |
| **Sesi 7** | **Pengujian dan Pemantauan API** (Functional & Contract Test, Supertest, Vitest, 14 Langkah Postman, Logging, Metrics, SLO, Health) | 75 Menit | Slide 41 – 58 |
| **Sesi 8** | **Proyek Praktik, Presentasi, dan Evaluasi** (Brief Unit Kerja, 10 Deliverables, Peer Review, Rubrik Nilai, 30/60/90 Hari, 6 Kunci Evaluasi) | 135 Menit (90m Praktik, 45m Evaluasi) | Slide 59 – 69 |

---

## 🧭 Peta Modul Pembelajaran Mandiri

Setiap dokumen di bawah ini membedah topik secara rinci disertai penjelasan konsep, analogi, diagram arsitektur, dan penjelasan baris per baris kode:

1. [**Modul 00: Ringkasan Hari 3 & Menutup Alur End-to-End**](file:///Users/sulaimansaleh/Documents/API-Development-3/bahan_ajar/00_ringkasan_hari_3_dan_alur_end_to_end.md)
   - Kilas balik korelasi Hari 1, Hari 2, dan Hari 3 (Slide 1 & 3).
   - 5 Ranah pembuktian praktik: Webhook, Inbox, Microservice, Pengujian, Operasi (Slide 4).
   - Batasan lab edukasi vs persyaratan hardening produksi (Slide 67 & 69).

2. [**Modul 01: Webhook, Fondasi & Kontrak Delivery TaskHub**](file:///Users/sulaimansaleh/Documents/API-Development-3/bahan_ajar/01_webhook_fondasi_dan_kontrak_delivery.md)
   - Komparasi mendalam *Polling* vs *Webhook* (Slide 6).
   - Perbedaan filosofis *Event* (fakta masa lalu) vs *Command* (instruksi tindakan) (Slide 7).
   - Mengapa *Receiver Lab* sengaja tidak memutakhirkan tabel task secara langsung (Slide 8).
   - Kontrak spesifikasi webhook TaskHub: endpoint, batasan body 64KB, timestamp, toleransi 300 detik, dan balasan HTTP 202 (Slide 9 & 10).

3. [**Modul 02: Kriptografi Tanda Tangan HMAC & Urutan Raw Body**](file:///Users/sulaimansaleh/Documents/API-Development-3/bahan_ajar/02_verifikasi_hmac_dan_raw_body.md)
   - Anatomi tanda tangan digital HMAC-SHA256 (Slide 11).
   - Bahaya fatal memverifikasi JSON hasil serialisasi ulang (*Re-serialized JSON*) vs Raw Body Buffer (Slide 12).
   - Urutan kerja receiver wajib: Raw Body Buffer &rarr; Verifikasi Waktu & Signature &rarr; Parsing JSON & Skema Zod (Slide 19).
   - Pencegahan *Timing Attack* menggunakan `crypto.timingSafeEqual` (Slide 21).
   - Mitigasi *Replay Attack* dan penanganan *Clock Skew* (Slide 13 & 20).

4. [**Modul 03: At-Least-Once Delivery, Deduplikasi & Deteksi Konflik Hash**](file:///Users/sulaimansaleh/Documents/API-Development-3/bahan_ajar/03_at_least_once_deduplikasi_dan_hash_conflict.md)
   - Realitas jaringan terdistribusi: *At-Least-Once Delivery* adalah keniscayaan (Slide 14).
   - Mengapa antrean (*Queue*) bukan jaminan *Exactly-Once Delivery* (Slide 14).
   - Strategi kunci deduplikasi dan matriks keputusan hash (Slide 15):
     - ID Baru: Simpan ke inbox dan catat hash payload (202 duplicate=false).
     - ID Sama, Hash Sama: Duplikat identik, abaikan efek ganda (202 duplicate=true).
     - ID Sama, Hash Beda: Isi payload berubah/tampered, tolak dengan **HTTP 409 Conflict**!
   - Masalah *Out-of-Order Delivery* (Slide 16).

5. [**Modul 04: Pola Durable Inbox, Background Worker & Jalur Produksi**](file:///Users/sulaimansaleh/Documents/API-Development-3/bahan_ajar/04_durable_inbox_worker_dan_dlq.md)
   - Mengapa dilarang mengirim 2xx sebelum data tersimpan di basis data (*Durable Commit*) (Slide 17).
   - Arti sesungguhnya dari status **HTTP 202 Accepted** (Slide 18 & 23).
   - Model tabel `webhook_inbox` dan penegakan `UNIQUE(provider, event_id)` (Slide 24).
   - Alur kerja worker: *Claim/Lease*, eksekusi efek demonstrasi, commit status `processed` (Slide 25 & 26).
   - Batas transaksi database: Mengapa efek eksternal (email/bank) tidak dilindungi rollback DB lokal (Slide 27).

6. [**Modul 05: Komunikasi Microservice, Transactional Outbox & Saga Pattern**](file:///Users/sulaimansaleh/Documents/API-Development-3/bahan_ajar/05_komunikasi_microservice_outbox_dan_saga.md)
   - Sinkron (REST/gRPC) vs Asinkron (Queue/Pub-Sub/Webhook) (Slide 36 & 37).
   - Masalah *Dual Write* dan mitigasi via *Transactional Outbox Pattern* (Slide 38).
   - Bukti bahwa Outbox bukan jaminan *Exactly-Once* (Celah publisher crash & republish) (Slide 39).
   - *SAGA Pattern*: Orkestrasi transaksi lintas-service dengan Transaksi Kompensasi (Slide 40).

7. [**Modul 06: Otomasi Pengujian Vitest, Supertest & Workflow 14 Langkah**](file:///Users/sulaimansaleh/Documents/API-Development-3/bahan_ajar/06_pengujian_api_vitest_supertest_dan_workflow_14_langkah.md)
   - *Functional Testing* vs *Contract-First Testing* (Slide 42).
   - Isolasi basis data sementara per test suite (Slide 43 & 47).
   - Implementasi pengujian terotomatisasi Vitest + Supertest (Slide 44).
   - Bedah lengkap *Workflow 14 Langkah* Postman/Insomnia (Slide 48).
   - Matriks 15 Skenario Uji Keamanan (Slide 50).
   - Pengujian Kinerja (*Performance Test*) dan Target SLO (Slide 52).

8. [**Modul 07: Observabilitas, Operasi Aman & Kesiapan Produksi**](file:///Users/sulaimansaleh/Documents/API-Development-3/bahan_ajar/07_observability_operasi_dan_kesiapan_produksi.md)
   - *Structured Logging* Pino tanpa kebocoran token, password, body, atau signature (Slide 54).
   - Korelasi log dengan Request ID / Correlation ID (Slide 55).
   - *Alert yang Actionable*: Ambang batas, pemilik, dampak, dan runbook tanggap darurat (Slide 56).
   - *Health Probes*: Membedah perbedaan fundamental *Liveness* vs *Readiness* (Slide 57).
   - *Production Readiness Checklist*: Platform, Kredensial, Proteksi, Recovery, Kebijakan (Slide 58).

9. [**Modul 08: Panduan Proyek Unit Kerja, Evaluasi & Rencana 30/60/90 Hari**](file:///Users/sulaimansaleh/Documents/API-Development-3/bahan_ajar/08_proyek_unit_kerja_evaluasi_dan_rencana_30_60_90.md)
   - Brief proyek unit kerja: 1 kebutuhan proses bisnis, minimal 2 role (Slide 60).
   - 10 Butir Deliverable Proyek yang dinilai (Slide 61).
   - Format presentasi demo 10 menit + 5 menit tanya jawab (Slide 62).
   - Rubrik Penilaian Resmi NQA berbobot (Slide 63).
   - Lembar kerja evaluasi antar-kelompok (*Peer Review Sheet*) (Slide 64 & 68).
   - Rencana Tindak Lanjut Berbasis Risiko 30 / 60 / 90 Hari (Slide 65).
   - 6 Kunci Evaluasi Hari 3 (Slide 66).

10. [**Modul 09: Glosarium Komprehensif Kosakata & Istilah Teknis**](file:///Users/sulaimansaleh/Documents/API-Development-3/bahan_ajar/09_glosarium_dan_kamus_istilah.md)
    - Kamus kosakata lengkap menerjemahkan seluruh istilah teknis bahasa Inggris yang muncul di 69 slide PDF ke dalam Bahasa Indonesia.
    - Setiap istilah dilengkapi: Terjemahan Baku, Definisi Formal, Analogi Sederhana Sehari-hari, Risiko Fatal Jika Diabaikan, dan Contoh Konkret pada Kode/Sistem.

---

## 🚀 Panduan Ringkas Menjalankan Lab & Playground

```bash
# 1. Pastikan Anda berada di direktori project
cd /Users/sulaimansaleh/Documents/API-Development-3

# 2. Inisialisasi basis data dan data pengguna awal
npm run seed

# 3. Jalankan pengujian otomatis untuk memverifikasi 30 skenario pengujian
npm test

# 4. Jalankan server aplikasi TaskHub
npm start

# 5. Buka Web Playground Interaktif di browser Anda:
# 👉 http://127.0.0.1:3000/playground
```
