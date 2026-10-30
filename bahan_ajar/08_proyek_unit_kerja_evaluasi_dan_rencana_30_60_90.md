# 📖 Modul 08: Panduan Proyek Unit Kerja, Evaluasi & Rencana 30/60/90 Hari
**Rujukan Slide: Slide 59 – 69**

---

## 🎯 1. Brief Proyek Praktik Unit Kerja (Slide 60)

Tujuan sesi proyek adalah menerapkan seluruh konsep desain, keamanan, integrasi pihak ketiga, dan bukti operasional pada studi kasus nyata unit kerja masing-masing.

### Batasan Ruang Lingkup:
1. **Satu Kebutuhan Proses Bisnis**: Pilih alur proses yang spesifik dan berukuran cukup kecil agar dapat diselesaikan dan didemokan secara tuntas (contoh: *Persetujuan Cuti*, *Pengajuan Tiket Helpdesk*, *Pengadaan Barang Inventaris*, atau *Jadwal Pemeliharaan Server*).
2. **Minimal Dua Peran Aktor (Role)**: Misalnya Pemohon (*Member*) dan Penyetuju (*Manager* / *Admin*) untuk membuktikan penegakan RBAC dan mitigasi BOLA.
3. **Data Sintetis**: Dilarang keras menggunakan data riil instansi/perusahaan demi menjaga kerahasiaan.

---

## 📦 2. Sepuluh Butir Deliverable Proyek (Slide 61)

Setiap kelompok dinilai berdasarkan 10 artefak konkret:

| No | Butir Deliverable | Bentuk Artefak Pembuktian |
| :--- | :--- | :--- |
| **1** | Masalah bisnis, aktor, klasifikasi data, dan trust boundary | Dokumen ringkasan arsitektur (Markdown). |
| **2** | Desain Resource, endpoint, request/response, status code, error, dan versioning | Standar RESTful HTTP yang konsisten. |
| **3** | Kontrak formal OpenAPI (`openapi.yaml`) | Spesifikasi Contract-First OpenAPI 3.0 valid. |
| **4** | Kebijakan Auth, role, scope, ownership, dan multi-tenant | Middleware otorisasi dan kontrol kepemilikan. |
| **5** | Pemodelan Ancaman (Threat Model) | Mitigasi BOLA, Mass Assignment, Injection, Rate Limit, dan CORS. |
| **6** | Provider Adapter eksternal | Penerapan Timeout, Exponential Retry, Idempotency, dan Circuit Breaker. |
| **7** | Implementasi Webhook | Signature HMAC-SHA256, Replay Window timestamp, Durable Inbox, dan Dedup. |
| **8** | Otomasi Pengujian | Test Suite Vitest + Supertest, Postman Collection, dan matriks uji negatif. |
| **9** | Observabilitas & Rencana Operasional | Structured Logging tanpa leak, Health Probes, Alerting, dan Rencana 30/60/90 Hari. |
| **10** | Presentasi Demo Langsung | Menampilkan bukti hasil kerja pada terminal/web, bukan sekadar slide presentasi. |

---

## ⏱️ 3. Format Presentasi Proyek (Slide 62)

Alokasi waktu: **10 menit presentasi demo + 5 menit sesi tanya jawab**.

### Urutan Bahasan Wajib:
1. **Masalah & Resource (2 menit)**: Masalah bisnis apa yang diselesaikan dan apa saja resource API-nya?
2. **Demo & Kebijakan Otorisasi (3 menit)**: Tunjukkan alur normal dan pembuktian penolakan akses lintas-aktor (BOLA).
3. **Failure Scenario (2 menit)**: Simulasikan saat terjadi kegagalan jaringan, timeout, atau pengiriman webhook duplikat.
4. **Test & Observability (2 menit)**: Jalankan automated test suite dan tunjukkan log terstruktur aman.
5. **Rencana Implementasi (1 menit)**: Paparkan rencana transisi ke produksi (30/60/90 hari).

---

## 📊 4. Rubrik Penilaian Berbobot Resmi NQA (Slide 63)

Penilaian didasarkan pada **demonstrasi kontrol yang terbukti**, bukan pada jumlah slide atau library yang diinstal:

$$\text{Nilai Berbobot} = \sum \left( \frac{\text{Skor } (1-5)}{5} \times \text{Bobot} \right)$$

| Area Penilaian | Bobot | Kriteria Skor Tertinggi (Skor 5) |
| :--- | :--- | :--- |
| **Desain HTTP** | **20%** | Pola resource jelas, kode status HTTP semantik (200, 201, 202, 204, 400, 401, 403, 404, 409, 422), version locking optimis. |
| **OpenAPI** | **15%** | Dokumen OpenAPI 3.0 lengkap, valid, mendefinisikan skema error, headers, dan security schemes. |
| **Autentikasi & Otorisasi** | **20%** | Penegakan BOLA terbukti empiris, opaque token aman, hak akses least-privilege. |
| **Kontrol Keamanan** | **20%** | Pertahanan terhadap Mass Assignment, CORS, Rate Limit, dan zero-leak credential logging. |
| **Integrasi & Webhook** | **15%** | Tanda tangan HMAC constant-time, durable inbox SQLite, deduplikasi identik 202, dan penolakan konflik hash 409. |
| **Testing & Operasi** | **10%** | Test suite otomatis lulus 100%, liveness/readiness probes terpasang, metrik SLO terdefinisi. |

---

## 📝 5. Lembar Peer Review Antar-Kelompok (Slide 64)

Saat kelompok lain melakukan presentasi, kelompok peninjau wajib memverifikasi 4 pertanyaan kunci:

| Pertanyaan Reviewer | Bukti yang Wajib Diminta | Catatan Verifikasi |
| :--- | :--- | :--- |
| *Apakah tim konsumen API dapat membuat request dari kontrak tanpa bertanya ke developer backend?* | Endpoint, contoh payload, dan dokumentasi OpenAPI. | Jika masih harus bertanya secara lisan, kontrak OpenAPI dianggap gagal. |
| *Apakah Pengguna A ditolak secara tegas saat mencoba memanipulasi data Pengguna B?* | Respon HTTP 403 Forbidden dan bukti kebijakan di middleware. | Membuktikan pertahanan BOLA/IDOR bekerja. |
| *Apakah percobaan pengiriman ulang (retry) dan duplikasi webhook hanya menghasilkan 1 efek bisnis?* | Pengecekan tabel basis data (`inbox` & `effects`). | Membuktikan deduplikasi bekerja dan tidak terjadi efek samping ganda. |
| *Apakah kesalahan server dapat didiagnosis tanpa harus membocorkan rahasia kredensial?* | Log terstruktur dengan Request ID / Correlation ID. | Membuktikan token/password/signature ter-redaksi. |

---

## 📅 6. Rencana Tindak Lanjut 30 / 60 / 90 Hari (Slide 65)

Mengubah daftar kesenjangan arsitektur menjadi tindakan terencana yang berorientasi pada risiko:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 30 HARI PERTAMA: FONDASI KONTRAK & REMEDIASI CELAH KRITIS                       │
│ • Melakukan inventarisasi seluruh endpoint dan sistem konsumen yang terhubung.  │
│ • Klasifikasi data (Publik vs Rahasia).                                         │
│ • Merumuskan kontrak formal OpenAPI contract-first.                             │
│ • Menutup celah autentikasi, menambal BOLA, dan mengaktifkan HTTPS wajib.       │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 60 HARI KEDUA: OTOMASI PENGUJIAN & KETAHANAN INTEGRASI                          │
│ • Mengintegrasikan test automation (Vitest/Supertest) ke dalam CI/CD pipeline.  │
│ • Migrasi secret ke Secret Manager / KMS.                                       │
│ • Memasang distributed rate limiting (Redis).                                   │
│ • Memasang timeout dan retry bertahap pada pemanggilan pihak ketiga.            │
│ • Mengaktifkan structured logging dan penyiapan dashboard metrik operasional.   │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 90 HARI KETIGA: SKALABILITAS, WEBHOOK IDEMPOTEN & ROLLOUT PRODUKSI              │
│ • Menerapkan Durable Inbox dan Transactional Outbox pada sistem transaksi utama.│
│ • Otomasi Contract Testing dan Security Scan pada pipeline deployment.          │
│ • Latihan simulasi penanganan insiden darurat (*Incident Drill & Runbook*).     │
│ • Audit hak akses pengguna berkala dan pelaksanaan rollout produksi bertahap.   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔑 7. Enam Poin Kunci Evaluasi Hari 3 (Slide 66)

Gunakan 6 poin ini sebagai pegangan utama untuk memastikan integritas arsitektur Anda:

1. **Byte Asli (Raw Body)**: Raw body mutlak diperlukan karena verifikasi tanda tangan digital HMAC memeriksa byte mentah yang dikirim di jaringan.
2. **Arti Status 202**: Status HTTP `202 Accepted` berarti event telah diterima dan tersimpan durabel di inbox, **bukan bukti bahwa seluruh proses bisnis telah selesai**.
3. **Constraint Basis Data**: Penegakan `UNIQUE constraint` pada database engine melindungi deduplikasi dari bahaya *race condition*.
4. **Idempotensi Konsumen**: Penggunaan Message Queue maupun Outbox Pattern tetap mewajibkan Consumer bersifat idempoten karena crash setelah publish dapat memicu pengiriman ulang.
5. **Batas Transaksi Database**: Transaksi basis data lokal tidak dapat mencakup efek samping pada API eksternal (email, payment gateway).
6. **Hasil Bisnis**: Observabilitas harus memantau hasil bisnis nyata dan backlog antrean (*Queue Backlog*), bukan sekadar status uptime server.
