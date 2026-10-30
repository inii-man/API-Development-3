# 📖 Modul 07: Observabilitas, Operasi Aman & Kesiapan Produksi
**Rujukan Slide: Slide 53 – 58**

---

## 📜 1. Structured Logging yang Aman (Zero-Leak Logging) (Slide 54)

Logging adalah instrumen utama untuk mendiagnosis gangguan sistem di produksi. Namun, logging yang ceroboh adalah pintu utama terjadinya **kebocoran kredensial dan pelanggaran privasi (PII)**.

```
┌──────────────────────────────────────────────┬──────────────────────────────────────────────┐
│           DICATAT SECARA AMAN (LAB)          │            DILARANG KERAS DICETAK!           │
├──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ • requestId / correlationId                  │ • Token Autentikasi / Bearer Header          │
│ • method HTTP (GET, POST, PATCH)             │ • Kata Sandi / Password Plaintext            │
│ • path (tanpa query string berisiko)         │ • Body Payload Request Lengkap               │
│ • status HTTP (200, 401, 500)                │ • Tanda Tangan HMAC / Shared Secret          │
│ • latencyMs (waktu pemrosesan)               │ • Data Pribadi (NIK, Kartu Kredit, Email)    │
└──────────────────────────────────────────────┴──────────────────────────────────────────────┘
```

### Implementasi Pino Structured Logger:
```javascript
// Contoh Log Terstruktur yang Aman (Slide 54):
{
  "timestamp": "2026-10-30T08:15:00.123Z",
  "requestId": "req_8a7b3c2d",
  "method": "POST",
  "path": "/webhooks/taskhub",
  "status": 202,
  "latencyMs": 14
}
```

> [!CAUTION]
> **Mengapa path wajib dibersihkan dari query string?**
> Pengembang sering kali secara tidak sengaja melewatkan API Key atau token reset di query URL (`/tasks?token=secret123`). Mencatat path tanpa query mencegah rahasia tersebut tersimpan permanen di media penyimpanan log pihak ketiga.

---

## 📡 2. Sinyal Operasional, Korelasi, dan Distributed Tracing (Slide 55)

Dalam sistem terdistribusi, satu aksi pengguna bisa memicu rentetan pemanggilan layanan. Untuk melacak alur tersebut:
1. **Request ID / Correlation ID**: Setiap request yang masuk ke API Gateway diberi ID unik (misal: `req_cfb10b98`) yang disematkan ke header respons (`X-Request-Id`) dan diteruskan ke seluruh downstream service.
2. **Metrik Utama (The Golden Signals)**:
   - **Throughput (Request Count)**: Volume lalu lintas yang ditangani.
   - **Error Rate**: Persentase request yang menghasilkan status 5xx atau kegagalan bisnis.
   - **Latency Persentil (p50 / p95 / p99)**: Mengukur waktu respons; p95 menunjukkan latensi terburuk dari 95% pengguna.
   - **Saturation & Queue Backlog**: Memantau jumlah event yang masih tertahan di tabel `inbox` dengan status `received`.

---

## 🚨 3. Alerting yang Actionable (Slide 56)

Pemberitahuan peringatan (*Alert*) yang buruk akan menimbulkan **Alert Fatigue** (kelelahan teknisi karena terlalu banyak alarm palsu):

> [!IMPORTANT]
> **Slide 56:** *"Jangan membuat alert untuk setiap error tunggal tanpa konteks!"*

### 5 Komponen Alert yang Actionable (Slide 56):
1. **Pemilik Jelas (Owner)**: Siapa tim yang bertanggung jawab menangani insiden ini (misal: `@team-backend-core`).
2. **Ambang Batas & Jendela Waktu (Threshold & Window)**: Kriteria terukur, misalnya: `Error 5xx melebihi 2% selama 5 menit berturut-turut`.
3. **Dampak Bisnis (Impact)**: Penjelasan konsekuensi, misalnya: `Nasabah tidak dapat menyelesaikan proses checkout pembayaran`.
4. **Buku Petunjuk (Runbook)**: Tautan langsung ke dokumen SOP langkah pemulihan cepat (misal: cara me-restart worker atau membersihkan deadlock).
5. **Jalur Eskalasi (Escalation Path)**: Jika tidak tertangani dalam 15 menit, siapa level manajer berikutnya yang harus dihubungi.

---

## 🩺 4. Health Probes: Liveness versus Readiness (Slide 57)

Dalam orkestrator kontainer modern (seperti Kubernetes atau Docker Swarm), status kesehatan aplikasi dibagi menjadi dua jenis penyelidikan (*probe*):

```
┌──────────────────────────────────────────────┬──────────────────────────────────────────────┐
│           LIVENESS PROBE (/health/liveness)  │       READINESS PROBE (/health/readiness)    │
├──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ "Apakah proses aplikasi masih hidup?"        │ "Apakah aplikasi siap menerima traffic?"     │
│ • Mengecek event loop Node.js tidak hang.    │ • Mengecek koneksi basis data aktif.         │
│ • Jika gagal &rarr; Kontainer di-RESTART!    │ • Jika gagal &rarr; Trafik dialihkan ke pod  │
│                                              │   lain tanpa me-restart proses!              │
└──────────────────────────────────────────────┴──────────────────────────────────────────────┘
```

---

## ✅ 5. Checklist Kesiapan Produksi (Slide 58)

Jadikan daftar kesenjangan (*Production Gap*) sebagai tanggung jawab yang memiliki penanggung jawab (*Owner*):

| Kategori | Butir Wajib Checklist Produksi |
| :--- | :--- |
| **Platform** | Protokol HTTPS mutlak (TLS 1.3), Reverse Proxy (Nginx/Cloudflare), migrasi basis data ke PostgreSQL berkerumun. |
| **Credential** | Mengganti file `.env` dengan Secret Manager / KMS; rotasi kredensial otomatis; logging terstruktur tanpa kebocoran data. |
| **Proteksi** | Distributed Rate Limiting (Redis), WAF (Web Application Firewall), pemantauan metrik dan alerting aktif 24/7. |
| **Recovery** | Prosedur Disaster Recovery: pengujian berkala *Backup & Restore*; CI/CD pipeline yang mengeksekusi test otomatis sebelum deploy; SOP Rollback instan. |
| **Policy** | Kebijakan kontrol akses (Least Privilege), audit berkala terhadap hak istimewa pengguna, dan kepatuhan regulasi data. |
