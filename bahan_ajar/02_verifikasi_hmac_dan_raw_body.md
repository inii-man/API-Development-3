# 📖 Modul 02: Kriptografi Tanda Tangan HMAC & Urutan Raw Body
**Rujukan Slide: Slide 11 – 13, 19 – 21**

---

## 🔏 1. Mengapa Tanda Tangan HMAC-SHA256? (Slide 11 & 21)

Dalam arsitektur Webhook, komunikasi terjadi melalui jaringan internet publik. Siapa pun dapat mengirimkan request HTTP POST ke endpoint callback Anda. Oleh karena itu, kita memerlukan jaminan:
1. **Otentisitas Pengirim**: Membuktikan bahwa request benar-benar dibuat oleh pemegang *Shared Secret* yang sah.
2. **Integritas Pesan**: Membuktikan bahwa payload tidak dimodifikasi di tengah jalan (*anti-tampering*).

### Rumus Perhitungan Tanda Tangan TaskHub (Slide 11):
```javascript
// Menggabungkan Buffer timestamp dengan Buffer byte asli yang diterima
const signedMessage = Buffer.concat([
  Buffer.from(timestamp + "."),
  rawBody
]);

// Menghitung tanda tangan HMAC SHA-256 dalam representasi Hexadecimal
const signatureHex = createHmac("sha256", secret)
  .update(signedMessage)
  .digest("hex");
```

---

## ⚠️ 2. Mengapa Wajib Raw Body, Bukan JSON Hasil Serialisasi Ulang? (Slide 12)

Ini adalah salah satu jebakan paling sering terjadi pada pengembang perangkat lunak pemula:

```
PENGIRIM MENGIRIM BYTE ASLI:
{"id":"evt_demo_001","data":{}}

JIKA PENERIMA MEM-PARSE LALU MENJALANKAN JSON.stringify():
{"data":{},"id":"evt_demo_001"}   <-- URUTAN KUNCI BERUBAH!
{"id": "evt_demo_001", "data": {}}  <-- SPASI BERTAMBAH!
```

### Konsekuensi Kriptografis:
Fungsi Hash Kriptografi bersifat deterministik pada level **byte per byte**. Perubahan satu spasi, karakter baris baru (`\n`), atau urutan properti objek akan menghasilkan nilai digest yang **berbeda 100%** (*Avalanche Effect*). Akibatnya, verifikasi tanda tangan akan selalu gagal!

> [!IMPORTANT]
> **Aturan Wajib (Slide 19):**
> 1. Baca **Raw Body (Buffer)** menggunakan middleware `express.raw({ type: "application/json", limit: "64kb" })`.
> 2. Middleware ini **wajib dipasang sebelum** `express.json()`.
> 3. Verifikasi signature pada byte mentah asli tersebut.
> 4. Baru setelah signature terbukti sah, lakukan `JSON.parse()` dan validasi skema runtime menggunakan Zod.

---

## ⏱️ 3. Mencegah Serangan Waktu dengan `crypto.timingSafeEqual` (Slide 21)

Perhatikan cuplikan kode dari Slide 21:

```javascript
const expected = createHmac("sha256", config.webhookSecret)
  .update(Buffer.concat([Buffer.from(`${timestamp}.`), rawBody]))
  .digest("hex");

const a = Buffer.from(expected);
const b = Buffer.from(signature);

// Constant-time comparison:
if (a.length !== b.length || !timingSafeEqual(a, b)) {
  return res.status(400).json({ detail: "Signature tidak valid" });
}
```

### Mengapa dilarang menggunakan operator perbandingan biasa (`===` atau `==`)?
Operator string comparison standar berhenti membandingkan karakter pada saat pertama kali menemukan perbedaan (*early exit*):
- Jika karakter ke-1 salah &rarr; fungsi berhenti dalam 1 nanodetik.
- Jika karakter ke-1 benar tapi karakter ke-2 salah &rarr; fungsi berhenti dalam 2 nanodetik.

Perbedaan mikro-waktu ini dapat diukur oleh penyerang (*Timing Attack*) untuk menebak karakter tanda tangan secara bertahap. Fungsi `timingSafeEqual()` membandingkan setiap byte dengan waktu eksekusi yang konstan (*constant-time*) terlepas dari lokasi karakter yang salah, sehingga menutup celah serangan tersebut secara total.

---

## ⌛ 4. Timestamp Bukan Deduplikasi: Mengatasi Replay Window & Clock Skew (Slide 13 & 20)

Perhatikan perbedaan fungsi antara `X-Timestamp` dan `Event ID` (Slide 13):

| Parameter | Fungsi Utama | Keterangan |
| :--- | :--- | :--- |
| **X-Timestamp** | Membatasi **Replay Window** (Jendela Waktu Pemutaran Ulang). | Mencegah penyerang mengambil paket sah dari 3 hari lalu dan mengirimkannya kembali ke server Anda. |
| **Event ID** | Melakukan **Deduplikasi Identitas Event**. | Mendeteksi request sah yang dikirim ulang oleh pengirim yang sama di dalam jendela toleransi waktu yang masih berlaku. |

### Toleransi Clock Skew 300 Detik (Slide 20):
```javascript
const timestamp = Number(req.get("x-timestamp"));

if (!Number.isInteger(timestamp)) {
  return res.status(400).json({ detail: "Timestamp tidak valid" });
}

// Menghitung selisih mutlak antara waktu server dan timestamp pengirim
if (Math.abs(Date.now() / 1000 - timestamp) > 300) {
  return res.status(400).json({ detail: "Event sudah kedaluwarsa" });
}
```

> [!WARNING]
> **Slide 12:** *"Clock salah? Perbaiki sinkronisasi waktunya dengan NTP (Network Time Protocol), JANGAN matikan verifikasi timestamp!"*
