# 📖 Modul 04: Pola Durable Inbox, Background Worker & Jalur Produksi
**Rujukan Slide: Slide 17 – 18, 25 – 27**

---

## 📥 1. Pola Durable Inbox: Jangan 2xx Sebelum Tersimpan (Slide 17)

Pola arsitektur **Durable Inbox** memisahkan secara tegas dua tanggung jawab yang berbeda:
1. **Penerimaan Cepat & Pengakuan Durabel (*Ingestion & Acknowledgement*)**: Dilakukan oleh HTTP Controller.
2. **Pelaksanaan Efek Samping Bisnis (*Side-Effect Execution*)**: Dilakukan oleh Background Worker.

### 6 Langkah Alur Receiver Wajib (Slide 17 & 19):

```
01. HTTP POST ──► 02. Verifikasi ──► 03. Validasi ──► 04. INSERT ──► 05. Commit ──► 06. Balas HTTP
    Diterima          Signature          Skema Zod         ke Inbox        ke Disk          202 Accepted
```

### Mengapa dilarang Enqueue In-Memory (misal `array.push` atau Node.js `EventEmitter`)?
Jika aplikasi memasukkan event ke dalam variabel memori RAM lalu langsung membalas HTTP 200/202 kepada pengirim:
- Ketika server tiba-tiba mati listrik, kehabisan memori (*OOM Killed*), atau di-restart saat *deployment*, seluruh data di memori akan **musnah seketika**.
- Pengirim telah menerima status 2xx sehingga menganggap event sudah sukses diproses dan **tidak akan pernah mengirim ulang**.
- Akibatnya: **Data hilang secara permanen tanpa jejak audit!**

> [!IMPORTANT]
> **Prinsip Durabilitas (Slide 17):**
> Simpan data ke basis data persisten (SQLite dengan Write-Ahead Log) dan lakukan **COMMIT** sebelum mengirimkan status HTTP 202 ke jaringan.

---

## ⚙️ 2. Alur Kerja Worker: Claim, Efek Demonstrasi, dan Commit (Slide 25 & 26)

Background Worker berjalan sebagai proses terpisah atau timer berkala yang mengambil pekerjaan dari tabel `inbox`:

```
┌──────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│ 01. AMBIL        │     │ 02. CATAT EFEK    │     │ 03. COMMIT BERSAMA│
│ Status 'received'│ ──► │ Catat ke tabel    │ ──► │ Status menjadi    │
│ Lakukan Lease    │     │ 'effects'         │     │ 'processed'       │
└──────────────────┘     └───────────────────┘     └───────────────────┘
```

### Penanganan Konkurensi: Claim / Lease (Slide 26)
Jika Anda menjalankan beberapa worker secara paralel (*concurrent workers*):
1. Worker melakukan klaim kepemilikan pekerjaan:
   ```sql
   UPDATE inbox SET status = 'processing' WHERE id = ? AND status = 'received';
   ```
2. Hanya worker yang berhasil mengubah baris tersebut yang berhak memproses efeknya.
3. Jika worker mati di tengah jalan sebelum selesai, mekanisme *Lease Recovery* (pemeriksaan berkala) akan mengembalikan status event yang 'stuck' di status `processing` kembali ke `received`.

---

## 🔄 3. Siklus Hidup Retry dan Dead Letter Queue (DLQ) (Slide 26)

Tidak semua pemrosesan efek samping selalu berjalan mulus. Bisa saja layanan database tujuan sedang sibuk atau terjadi kegagalan jaringan sementara:

```
[Event Gagal] ──► [Hitung retry_count] 
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
 (retry_count < 3)             (retry_count >= 3)
  Jadwalkan Ulang:              Pindahkan ke DLQ /
  status='received'             status='failed'
  next_attempt_at               (Butuh Investigasi Tim Ops!)
```

### Komponen Produksi (Slide 26):
1. **Retry Terukur**: Menggunakan *Exponential Backoff* dan *Jitter* agar tidak membanjiri sistem yang sedang pulih.
2. **Kategori Error**: Bedakan error sementara (*Transient Error* seperti timeout) yang layak di-retry dari error permanen (*Permanent Error* seperti validasi bisnis salah) yang tidak boleh di-retry.
3. **Dead Letter Queue (DLQ)**: Tempat penampungan event yang telah melampaui batas percobaan maksimal untuk dianalisis oleh teknisi (*Human-in-the-loop*).
4. **Replay Beraudit**: Proses pemutaran ulang event dari DLQ harus tercatat di log audit dan menggunakan kebijakan idempoten yang sama.

---

## 🧱 4. Batas Transaksi Database (Slide 27)

Salah satu ilusi terbesar dalam rekayasa perangkat lunak adalah mengira bahwa transaksi database lokal (`BEGIN TRANSACTION ... COMMIT`) dapat melindungi segalanya:

```
┌──────────────────────────────────────────────┬──────────────────────────────────────────────┐
│        DI DALAM DATABASE LOKAL               │            DI LUAR DATABASE LOKAL            │
├──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ • Efek lokal (tabel tasks, tabel effects)    │ • Mengirim Email Notifikasi via SendGrid     │
│ • Pembaruan status inbox ('processed')       │ • Memotong Saldo di Payment Gateway          │
│ • Dapat di-commit atau di-rollback bersamaan │ • TIDAK IKUT TRANSAKSI DATABASE LOKAL!       │
└──────────────────────────────────────────────┴──────────────────────────────────────────────┘
```

### Skenario Kerusakan (Slide 27):
1. Worker memanggil API Payment Gateway eksternal &rarr; **Pembayaran Sukses Terpotong!**
2. Sebelum worker sempat menjalankan `UPDATE inbox SET status='processed'`, server tiba-tiba mati mendadak (*Crash*).
3. Saat server hidup kembali, event masih berstatus `received`.
4. Worker menjalankan ulang pekerjaan tersebut &rarr; **Uang nasabah terpotong untuk kedua kalinya!**

### Solusi Arsitektur:
- Sertakan **Idempotency Key** unik saat memanggil API pihak ketiga.
- Terapkan pola **Transactional Outbox** dan **Rekonsiliasi berkala**.
