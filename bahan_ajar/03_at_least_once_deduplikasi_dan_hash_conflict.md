# 📖 Modul 03: At-Least-Once Delivery, Deduplikasi & Deteksi Konflik Hash
**Rujukan Slide: Slide 14 – 16, 22 – 24, 31, 33**

---

## 🌐 1. Realitas Jaringan: At-Least-Once Delivery adalah Normal (Slide 14)

Dalam komputasi terdistribusi, pengiriman event melalui protokol HTTP hampir mustahil mencapai *Exactly-Once Delivery* pada level transport. Jaminan pengiriman standar adalah **At-Least-Once Delivery** (Paling tidak sekali terkirim):

```
┌─────────────────┐                                  ┌─────────────────┐
│     PENGIRIM    │                                  │     RECEIVER    │
└────────┬────────┘                                  └────────┬────────┘
         │                                                    │
         │ 1. POST /webhooks/taskhub (Event X)                │
         ├───────────────────────────────────────────────────►│ (Tersimpan ke DB!)
         │                                                    │
         │ 2. HTTP 202 Response terputus oleh Timeout Jaringan│
         │    x - - - - - - - - - - - - - - - - - - - - - - - ┤
         │                                                    │
         │ 3. Pengirim berasumsi paket gagal terkirim         │
         │    Mengirim ulang Event X (Retry!)                 │
         ├───────────────────────────────────────────────────►│ (Event X datang lagi!)
         │                                                    │
```

> [!IMPORTANT]
> **Kaidah Emas Slide 14:**
> *"Receiver HARUS idempoten. Jangan pernah mengklaim 'Exactly-Once' hanya karena arsitektur Anda menggunakan antrean (Queue)!"*

---

## 🧩 2. Kunci Deduplikasi dan Matriks Konflik Hash Payload (Slide 15 & 24)

Untuk mewujudkan receiver yang idempoten, kita mengandalkan **kunci gabungan (Composite Key)** dan **pemeriksaan hash payload**:
- **Lingkungan Lab**: Memakai `event_id` unik dari satu sumber TaskHub.
- **Lingkungan Produksi**: Memakai kunci gabungan `provider + tenant_id + event_id` (karena dua penyedia berbeda bisa secara kebetulan menghasilkan ID acak yang sama).

### Matriks Keputusan 3 Skenario (Slide 15):

| Skenario | Karakteristik Data | Tindakan Receiver TaskHub | Status HTTP | Dampak Efek Samping |
| :--- | :--- | :--- | :--- | :--- |
| **1. ID Baru** | `event_id` belum pernah ada di tabel `inbox`. | Simpan record baru ke tabel `inbox` dengan `status='received'`, catat `payload_hash` SHA-256. | **202 Accepted** (`accepted: true, duplicate: false`) | Menunggu eksekusi oleh worker (efek baru akan dicatat). |
| **2. ID Sama, Hash Sama** | `event_id` sudah ada di tabel `inbox`, dan hash payload-nya **identik 100%**. | Kenali sebagai **Duplikat Identik**. Jangan masukkan baris baru ke antrean worker. | **202 Accepted** (`accepted: true, duplicate: true`) | **TIDAK menambah efek ganda** (Idempoten aman). |
| **3. ID Sama, Hash Beda** | `event_id` sudah pernah tercatat, tetapi hash payload-nya **berbeda**. | **Konflik / Modifikasi Terdeteksi!** Payload telah diubah setelah ID diterbitkan. | **409 Conflict** (`Konflik hash payload: event ID sama dengan isi berbeda`) | Request ditolak seketika demi menjaga integritas audit. |

---

## ⏳ 3. Masalah Out-of-Order Delivery: Jangan Percaya Waktu Tiba (Slide 16)

Dalam sistem jaringan, paket yang dikirim lebih awal bisa saja tiba lebih lambat karena perbedaan rute jaringan (*routing lag*):

```
WAKTU KIRIM PENGIRIM:
Detik 01: Event task.updated.v1 (status='in_progress')
Detik 02: Event task.completed.v1 (status='completed')

WAKTU KEDATANGAN DI RECEIVER (TERBALIK!):
Detik 03: Menerima task.completed.v1 (State diupdate menjadi 'completed')
Detik 05: Baru menerima task.updated.v1 (PAKET LAMPAU TIBA TERLAMBAT!)
```

### Prinsip Pertahanan (Slide 16):
- **Waktu kedatangan BUKAN urutan domain bisnis!**
- Jika sistem Anda mempercayai waktu tiba secara naif, maka event lama (`updated`) akan menimpa state baru (`completed`) sehingga status task kembali mundur ke masa lalu (*State Regression*).
- **Solusi Produksi**:
  1. Periksa atribut urutan domain: **Nomor Versi (Version)** atau **Sequence Number**.
  2. Implementasikan *State Machine* resmi: Status `completed` adalah *Terminal State* yang tidak boleh diubah kembali oleh event `updated`.
  3. Lakukan query konfirmasi ke sistem sumber (*fetch single source of truth*).

---

## 🗄️ 4. Desain Skema Basis Data `webhook_inbox` (Slide 24)

Sesuai Slide 24, record penerimaan dirancang dengan kelompok field berikut:

```sql
CREATE TABLE IF NOT EXISTS inbox (
  -- 1. Kelompok Identitas
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,

  -- 2. Kelompok Payload & Integritas
  payload_hash TEXT NOT NULL, -- SHA-256 dari raw body Buffer
  raw_payload TEXT NOT NULL,

  -- 3. Kelompok Pemrosesan & Keandalan
  status TEXT NOT NULL CHECK(status IN ('received', 'processing', 'processed', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,

  -- 4. Kelompok Diagnosis & Audit
  received_at TEXT NOT NULL,
  processed_at TEXT,
  last_error TEXT,

  -- 5. Penegakan Integritas Konkurensi
  CONSTRAINT unq_provider_event_id UNIQUE (provider, event_id)
);
```

> [!TIP]
> **Perlindungan Race Condition (Slide 18 & 24):**
> Jangan hanya mengandalkan pola `SELECT` lalu `INSERT` di level kode aplikasi. Dua request duplikat yang tiba secara bersamaan (*concurrent*) dapat lolos dari pengecekan SELECT secara paralel. **Serahkan arbitrasinya kepada database engine** melalui `UNIQUE constraint` dan `INSERT ... ON CONFLICT`!
