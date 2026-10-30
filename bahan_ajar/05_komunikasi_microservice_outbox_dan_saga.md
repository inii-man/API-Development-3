# 📖 Modul 05: Komunikasi Microservice, Transactional Outbox & Saga Pattern
**Rujukan Slide: Slide 35 – 40**

---

## ⚡ 1. Pola Sinkron versus Asinkron (Slide 36)

Dalam arsitektur berbasis layanan mikro (*Microservices*), pemilihan pola komunikasi harus disesuaikan dengan kebutuhan hasil dan konsekuensi operasional:

| Karakteristik | Pola Sinkron (REST / gRPC) | Pola Asinkron (Message Queue / Pub-Sub / Webhook) |
| :--- | :--- | :--- |
| **Kapan Digunakan** | Saat pemanggil (*Caller*) **membutuhkan hasil seketika**: Memeriksa otentikasi login, mengecek saldo, atau menghitung harga diskon. | Saat pekerjaan dapat diproses di latar belakang: Pengiriman email, pembuatan invoice PDF, pengindeksan mesin pencari, atau pembaruan analitik. |
| **Ketergantungan** | *High Coupling*: Bergantung langsung pada ketersediaan (*availability*) dan latensi jaringan layanan tujuan. | *Loose Coupling*: Pengirim dapat terus berjalan meskipun penerima sedang offline atau down. |
| **Konsekuensi Operasional** | Membutuhkan *Timeout* ketat, *Circuit Breaker*, dan *Distributed Tracing* agar kegagalan di satu downstream tidak melumpuhkan seluruh sistem (*Cascading Failure*). | Memerlukan penanganan *Eventual Consistency*, pemantauan *Queue Backlog Lag*, dan deteksi event duplikat. |

---

## 📬 2. Membedakan Semantik: Queue vs Pub/Sub vs Webhook (Slide 37)

Ketiga pola distribusi ini memiliki semantik yang sangat berbeda:

```
A. MESSAGE QUEUE (Bagi Beban Pekerjaan):
Producer ────► [QUEUE] ────┬──► Consumer 1 (Mendapat Pesan A)
                           └──► Consumer 2 (Mendapat Pesan B)
Setiap pesan HANYA diproses oleh 1 Consumer (Load Balancing).

B. PUBLISH / SUBSCRIBE (Penyebaran Multi-Aplikasi):
Publisher ───► [TOPIC] ────┬──► Subscriber 1: Billing Service (Pesan A)
                           ├──► Subscriber 2: Email Service   (Pesan A)
                           └──► Subscriber 3: Analytics       (Pesan A)
Setiap subscriber mendapatkan salinan pesan yang sama.

C. WEBHOOK (Callback HTTP Terbalik):
System A ──── [HTTP POST via Internet] ────► System B Callback Endpoint
Mengirimkan notifikasi antar organisasi yang berbeda domain jaringan.
```

---

## 📦 3. Masalah Dual Write & Solusi Transactional Outbox (Slide 38 & 39)

### Apa itu Masalah *Dual Write*?
Bayangkan skenario berikut:
```javascript
// CONTOH KODE BERBAHAYA (DUAL WRITE ANTI-PATTERN):
await db.tasks.create(taskData);       // Operasi 1: Simpan ke DB
await messageBroker.publish(taskData); // Operasi 2: Kirim ke Kafka/RabbitMQ
```
**Celah Bencana**:
- Jika DB sukses menyimpan, namun jaringan ke Kafka tiba-tiba putus &rarr; **Task tersimpan tetapi event tidak pernah terkirim!**
- Jika urutannya dibalik (publish dulu baru simpan ke DB), dan DB gagal akibat validasi unik &rarr; **Event sudah terkirim padahal data tidak pernah ada di database!**

### Solusi: Pola *Transactional Outbox* (Slide 38)

```
01. Simpan Task       02. Simpan Outbox       03. Commit Database      04. Relay Publisher      05. Consumer
   (Tabel tasks)   +   (Tabel outbox)     ──►  (Atomik & Durabel)   ──►   Kirim ke Broker   ──►   Dedup & Proses
       │                     │                        │
       └─────────────────────┴────────────────────────┘
                    SATU TRANSAKSI DB
```

1. **Simpan Atomik**: Task dan pesan Outbox disimpan ke dalam database lokal yang sama menggunakan satu transaksi `BEGIN ... COMMIT`. Keduanya dijamin tersimpan bersama atau gagal bersama.
2. **Relay Publisher**: Proses di latar belakang membaca tabel `outbox` yang berstatus `pending`, mengirimkannya ke broker, lalu mengubah statusnya menjadi `published`.

### Mengapa Outbox Bukan Jaminan Exactly-Once? (Slide 39)
```
01. Publisher berhasil mengirim event ke Message Broker.
02. Publisher mengalami CRASH sebelum sempat menjalankan UPDATE outbox SET status='published'!
03. Saat publisher restart, ia membaca baris outbox yang masih berstatus 'pending'.
04. Publisher mengirim ulang event yang sama ke Broker!
```
> [!IMPORTANT]
> **Slide 39:** Outbox pattern memecahkan masalah Dual Write, namun **tetap menghasilkan duplikasi pengiriman jika terjadi crash**. Oleh karena itu, sistem penerima (*Consumer*) **tetap wajib idempoten**!

---

## 🎭 4. Pola SAGA: Transaksi Lintas Service dengan Kompensasi (Slide 40)

Ketika proses bisnis melibatkan beberapa microservice independen (misal: Layanan Pemesanan, Layanan Pembayaran, dan Layanan Tiket), transaksi basis data lokal tradisional tidak dapat digunakan.

Pola **SAGA** menyusun proses bisnis menjadi serangkaian transaksi lokal yang saling berantai:

```
ALUR NORMAL (HAPPY PATH):
[01. Reservasi Tiket] ──► [02. Bayar di Gateway] ──► [03. Konfirmasi Pesanan]
    (Status: RESERVED)       (Status: PAID)             (Status: CONFIRMED)

ALUR KEGAGALAN DENGAN TRANSAKSI KOMPENSASI:
[01. Reservasi Tiket] ──► [02. Bayar Ditolak Bank!]
    (Status: RESERVED)              │
                                    ▼
                         [TRANSAKSI KOMPENSASI]
                         Batalkan Reservasi Tiket!
                         (Status: CANCELLED)
```

### Peringatan Kritis Arsitektur SAGA (Slide 40):
- **Kompensasi Bukan Rollback Otomatis**: Rollback database universal mengembalikan state seolah-olah tidak terjadi apa-apa. Transaksi kompensasi adalah tindakan bisnis nyata (seperti mencatat transaksi pengembalian dana / *refund*).
- **Kompensasi Bisa Gagal Juga**: Sistem pihak ketiga bisa saja offline saat diminta melakukan refund. Oleh karena itu, alur Saga membutuhkan visibilitas status yang transparan (*Observability*) dan penanganan retry kompensasi yang tangguh.
