# 📖 Modul 01: Webhook, Fondasi & Kontrak Delivery TaskHub
**Rujukan Slide: Slide 5 – 10**

---

## 🔄 1. Polling versus Webhook (Slide 6)

Saat dua sistem perlu bertukar informasi mengenai perubahan status data (misalnya: status pembayaran atau penyelesaian task), terdapat dua pendekatan arsitektur utama:

```
A. PENDEKATAN POLLING (Tarik Status Berkala):
Client ──── [Ada perubahan?] ────► Server (Belum ada)
Client ──── [Ada perubahan?] ────► Server (Belum ada)
Client ──── [Ada perubahan?] ────► Server (Ada! Status=Done)

B. PENDEKATAN WEBHOOK (Dorong Event Real-Time):
Server ──── [Event: task.completed.v1] ────► Client Callback URL (Seketika!)
```

### Analisis Komparasi (Slide 6)

| Pendekatan | Mekanisme Kerja | Kelebihan | Kelemahan & Konsekuensi |
| :--- | :--- | :--- | :--- |
| **Polling** | Penerima secara berkala (misal tiap 5 detik) mengirim request GET ke server penyedia. | Mudah diimplementasikan di balik firewall/NAT tanpa perlu IP publik. | Latensi tinggi (perubahan baru diketahui pada siklus berikutnya), boros kuota bandwidth, dan membebani server dengan request kosong (*304 Not Modified*). |
| **Webhook** | Pengirim secara proaktif mendorong (*push*) data via HTTP POST ke URL callback penerima tepat saat peristiwa terjadi. | *Near Real-Time* (latensi dalam hitungan milidetik), sangat hemat sumber daya komputasi. | Penerima wajib memiliki endpoint HTTP publik yang selalu siaga (*high availability*), menangani kegagalan jaringan, dan memverifikasi keaslian pengirim. |

> [!TIP]
> **Kaidah Rekonsiliasi:** Penerima webhook **tetap memerlukan mekanisme polling terbatas atau proses rekonsiliasi terjadwal (batch reconciliation)**. Webhook bisa saja hilang di perjalanan jaringan akibat timeout atau gangguan internet. Polling rekonsiliasi harian/jam memastikan tidak ada transaksi yang tertinggal dalam status tidak pasti (*undetermined state*).

---

## 📢 2. Membedakan Event versus Command (Slide 7)

Salah satu kesalahan arsitektur paling fatal dalam integrasi API adalah memperlakukan notifikasi Webhook sebagai perintah (*Command*):

```
┌───────────────────────────────────────────────┬───────────────────────────────────────────────┐
│              EVENT (Fakta Sejarah)            │              COMMAND (Instruksi)              │
├───────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ "task.completed.v1"                           │ "complete_task"                               │
│ • Menyatakan suatu kejadian yang SUDAH terjadi│ • Meminta penerima melakukan tindakan tertentu│
│ • Bersifat objektif dan tidak dapat dibatalkan│ • Dapat ditolak oleh aturan domain penerima   │
│ • Receiver menafsirkan fakta secara berdaulat │ • Mengarahkan perubahan objek secara sepihak  │
└───────────────────────────────────────────────┴───────────────────────────────────────────────┘
```

### Snapshot vs Reference Payload (Slide 7)
Dalam merancang muatan (*payload*) event:
- **Reference (Minimal Data - Rekomendasi)**: Payload hanya memuat `{ "id": "evt_001", "type": "task.completed.v1", "data": { "taskId": "tsk_demo" } }`. Penerima menetapkan sumber kebenaran (*single source of truth*) dan memanggil API query resmi jika membutuhkan atribut terkini.
- **Snapshot (Full Data)**: Payload memuat seluruh entitas pada saat kejadian. Berisiko membocorkan data sensitif jika dikirim ke callback pihak ketiga dan rawan terjadi ketidaksesuaian data (*stale data*) jika urutan event terbalik.

---

## 🛡️ 3. Mengapa Receiver Lab Tidak Mengubah Database Task (Slide 8)

> [!CAUTION]
> **Prinsip Otorisasi Bisnis (Slide 8):**
> *"Receiver lab sengaja tidak memutakhirkan database task, supaya objek tidak berubah tanpa otorisasi bisnis."*

Di lingkungan nyata:
1. Webhook dikirim oleh penyedia eksternal (*untrusted provider*).
2. Jika setiap webhook yang masuk langsung melakukan `UPDATE tasks SET status='done'`, maka pihak luar dapat memanipulasi alur bisnis sistem internal Anda.
3. Yang benar:
   - Receiver menerima event &rarr; Memverifikasi integritas delivery.
   - Menyimpan event ke tabel `inbox`.
   - Worker mencatat **efek demonstrasi** ke tabel `effects`.
   - Domain produksi memetakan event provider ke state machine internal yang memiliki aturan transisi yang sah (*business domain rules*).

---

## 📜 4. Spesifikasi Kontrak Webhook TaskHub (Slide 9 & 10)

Kontrak webhook TaskHub disepakati secara ketat sebagai berikut:

```http
POST /webhooks/taskhub HTTP/1.1
Host: 127.0.0.1:3000
Content-Type: application/json
X-Timestamp: 1730272800
X-Signature: 34f8e89a6d8ba67c6d6fc6cc78ed885688bf152a04a01caf422aae928c95b5c6

{
  "id": "evt_demo_001",
  "type": "task.completed.v1",
  "data": {
    "taskId": "tsk_demo"
  }
}
```

### Butir-Butir Kontrak Wajib (Slide 9):
1. **Endpoint & Metode**: `POST /webhooks/taskhub`.
2. **Content-Type**: Wajib `application/json`.
3. **Batas Ukuran Body**: Maksimum **65.536 byte (64 KB)**. Body yang melampaui batas ini langsung ditolak (Slide 20: `express.raw({ limit: "64kb" })`).
4. **Header Otentikasi**:
   - `X-Timestamp`: Unix timestamp dalam satuan detik (bilangan bulat).
   - `X-Signature`: Hex-encoded HMAC-SHA256 dari `timestamp.rawBody`.
5. **Jendela Toleransi Waktu**: **300 detik (5 menit)** terhadap clock server penerima.
6. **Arti Kode Balasan HTTP 202 Accepted**:
   - Respon `202` dikirim **hanya setelah** event tersimpan secara durabel di basis data lokal (`inbox`).
   - `202` **TIDAK BERARTI** proses bisnis di belakang layar telah selesai!

### Dokumentasi Kontrak Delivery (Slide 10):
- **Event Subscription**: Pengirim mengetahui event apa saja yang didaftarkan.
- **Retry Policy**: Pengirim mengulang pengiriman jika menerima status selain 2xx atau terjadi network timeout.
- **Retention Deduplication**: Penerima menyimpan riwayat ID event selama periode retensi tertentu.
- **Ordering**: Jangan pernah menjanjikan urutan kedatangan jika transport HTTP tidak menjaminnya (*Out-of-Order Delivery*).
