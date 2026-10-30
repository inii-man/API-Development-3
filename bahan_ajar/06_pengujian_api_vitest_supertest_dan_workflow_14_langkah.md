# 📖 Modul 06: Otomasi Pengujian Vitest, Supertest & Workflow 14 Langkah
**Rujukan Slide: Slide 41 – 52**

---

## 🎯 1. Filosofi Pengujian: Functional versus Contract Test (Slide 41 & 42)

Pengujian API bertujuan mengubah asumsi desain di atas kertas menjadi **bukti empiris perilaku sistem** (*Verifiable Evidence*):

```
┌──────────────────────────────────────────────┬──────────────────────────────────────────────┐
│            FUNCTIONAL TESTING                │               CONTRACT TESTING               │
├──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ Menguji perilaku alur bisnis & side-effects: │ Menguji kepatuhan terhadap dokumen OpenAPI:  │
│ • Apakah data benar tersimpan ke database?   │ • Apakah field wajib ada di respons?         │
│ • Apakah state berubah dari OPEN ke DONE?    │ • Apakah tipe data integer, bukan string?    │
│ • Apakah efek samping (notifikasi) terpicu?  │ • Apakah format error konsisten?             │
│ • Apakah hak kepemilikan (BOLA) ditegakkan?  │ • Jangan hanya memeriksa status 200!         │
└──────────────────────────────────────────────┴──────────────────────────────────────────────┘
```

### Batas Aman Pengujian (Slide 43)
1. **Isolasi Data**: Gunakan database sementara untuk pengujian otomatis agar tidak menghapus data master pengguna.
2. **Lingkungan Terpisah**: Jangan pernah menjalankan pengujian destruktif (*Destructive Testing*) di server produksi.
3. **Batas Pengujian Lab**: Pengujian unit dan integrasi di repository ini membuktikan *perilaku kode*, bukan merupakan audit keamanan penetrasi (*Penetration Test*) atau pembuktian load test skala penuh.

---

## ⚡ 2. Implementasi Pengujian Vitest & Supertest (Slide 44 & 47)

Pengujian modern pada Node.js menggabungkan **Vitest** (Test Runner berkecepatan tinggi) dengan **Supertest** (pustaka untuk mengirim request HTTP langsung ke instance aplikasi Express tanpa perlu membuka port soket jaringan nyata):

```javascript
// Contoh Cuplikan Slide 44:
import request from "supertest";
import { expect, test } from "vitest";
import app from "../src/app.js";

test("create task requires auth", async () => {
  const res = await request(app)
    .post("/api/v1/tasks")
    .send({ title: "Review kontrak API" });

  expect(res.status).toBe(401);
});
```

### Struktur Pengujian di Repository (Slide 47):
- `tests/auth.test.js`: Memverifikasi identitas pengguna, penolakan request tanpa token, token acak, dan verifikasi hash password.
- `tests/tasks.test.js`: Memverifikasi operasi CRUD, penegakan kepemilikan BOLA (User A vs User B), dan Optimistic Concurrency Control (Version locking).
- `tests/security.test.js`: Memverifikasi penolakan input cacat, batas ukuran payload, CORS origin policy, dan health checks.
- `tests/webhooks.test.js`: Memverifikasi verifikasi HMAC signature, deteksi kedaluwarsa waktu, deduplikasi inbox, dan konflik hash payload.

---

## 📋 3. Bedah Alur 14 Langkah Postman / Insomnia (Slide 48)

Alur 14 langkah dirancang untuk menguji siklus hidup API secara komprehensif dari awal hingga akhir:

```
[01. Login Alice] ──► [02. Simpan Token] ──► [03. Buat Task] ──► [04. List Task] ──► [05. Detail Task]
                                                                                             │
                                                                                             ▼
[09. Bob Buka Task Alice] ◄── [08. Login Bob] ◄── [07. PATCH Version Lama] ◄── [06. PATCH Version Benar]
   (Ditolak 403 - BOLA)      (Peran Member)     (Ditolak 409 - Conflict)      (Sukses Version=2)
         │
         ▼
[10. Injeksi owner_id] ──► [11. Notify Idempotency] ──► [12. Replay Notify] ──► [13. Hapus Task] ──► [14. Detail Task]
(Ditolak 422 - Mass-Asg)   (Kirim Key Pertama)         (Respon dari Cache)     (Status 204)          (Status 404)
```

| No | Nama Langkah | Aktor | Status HTTP | Alasan Desain & Prinsip Keamanan |
| :--- | :--- | :--- | :--- | :--- |
| **01** | Login Alice | Alice | `200 OK` | Otentikasi kredensial pengguna yang sah. |
| **02** | Simpan Access Token | Client | `200 OK` | Menyimpan token Bearer pada environment klien. |
| **03** | Buat Task | Alice | `201 Created` | Membuat resource baru dengan `version = 1`. |
| **04** | List Task | Alice | `200 OK` | Verifikasi data muncul di daftar tenant Alice. |
| **05** | Detail Task | Alice | `200 OK` | Verifikasi pemilik dapat membaca datanya sendiri. |
| **06** | PATCH Version Benar | Alice | `200 OK` | Mengirim `version: 1`, versi naik menjadi 2 di basis data. |
| **07** | PATCH Ulang Version Lama | Alice | `409 Conflict` | Mengirim `version: 1` lagi; ditolak karena versi di DB sudah 2! |
| **08** | Login Bob | Bob | `200 OK` | Mendapatkan token untuk pengguna Bob di tim berbeda. |
| **09** | Bob Akses Task Alice | Bob | `403 Forbidden` | **Mitigasi BOLA**: Bob dilarang mengakses data Alice meski tokennya valid! |
| **10** | Injeksi `owner_id` | Alice | `422 Unprocessable` | **Mitigasi Mass Assignment**: Client dilarang menginjeksi kolom otorisasi internal. |
| **11** | Notify Idempotency | Alice | `200 OK` | Mengirim instruksi notifikasi dengan header `Idempotency-Key`. |
| **12** | Ulangi Notify Identik | Alice | `200 OK` | Mengembalikan respons tersimpan dari cache tanpa memicu notifikasi ganda. |
| **13** | Hapus Task | Alice | `204 No Content` | Pemilik menghapus resource tugas miliknya. |
| **14** | Detail Task Terhapus | Alice | `404 Not Found` | Membuktikan bahwa resource telah benar-benar dihapus permanen. |

---

## 🛡️ 4. Matriks Uji Keamanan: 15 Skenario Penolakan (Slide 50)

Sistem wajib membuktikan perilaku penolakan yang konsisten (*Deterministic Rejection Matrix*):

| No | Skenario Pengujian | Hasil HTTP yang Diharapkan |
| :--- | :--- | :--- |
| 1 | Request tanpa token autentikasi | **401 Unauthorized** |
| 2 | Request dengan token acak / palsu | **401 Unauthorized** |
| 3 | Request dengan token kedaluwarsa | **401 Unauthorized** |
| 4 | Password salah saat login | **401 Unauthorized (tanpa bocor detail kesalahan)** |
| 5 | Pengguna A mengakses task Pengguna B | **403 Forbidden (BOLA Violation)** |
| 6 | Manager Tim A mengakses task milik Tim B | **403 Forbidden (Tenant/Team Isolation)** |
| 7 | Mengirim field `owner_id` pada payload create | **422 Unprocessable Content (Mass Assignment)** |
| 8 | Mengirim field `role` pada payload create | **422 Unprocessable Content (Privilege Escalation)** |
| 9 | Request body dengan sintaks JSON rusak | **400 Bad Request** |
| 10 | Header `Content-Type` bukan `application/json` | **415 Unsupported Media Type** |
| 11 | Ukuran body request melampaui batas (maks 64KB) | **413 Payload Too Large** |
| 12 | PATCH task menggunakan nomor versi lama | **409 Conflict (Optimistic Locking)** |
| 13 | Request dari origin web yang tidak diizinkan | **Tanpa header Access-Control-Allow-Origin** |
| 14 | Webhook dengan tanda tangan HMAC salah | **400 Bad Request (Signature tidak valid)** |
| 15 | Webhook dengan timestamp kedaluwarsa (> 300s) | **400 Bad Request (Event sudah kedaluwarsa)** |

---

## 📊 5. Pengujian Kinerja & Target SLO (Slide 52)

Sebelum memberikan beban trafik ke sistem API, tentukan target operasional secara kuantitatif:

```
TARGET SERVICE LEVEL OBJECTIVE (SLO) LAB:
• Tingkat Keberhasilan (Success Rate)  : ≥ 99.5% request valid menghasilkan 2xx
• Latensi Persentil 95 (p95 Latency)   : < 500 milidetik
```

### Metrik yang Wajib Dipantau (Slide 52):
- Penggunaan CPU dan Memory server.
- Waktu penguncian (*Lock duration*) dan koneksi basis data.
- Backlog antrean inbox (*Queue Lag*).
- Latensi pemanggilan provider pihak ketiga.
