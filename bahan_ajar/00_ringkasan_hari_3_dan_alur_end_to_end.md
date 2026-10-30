# 📖 Modul 00: Ringkasan Hari 3 & Menutup Alur End-to-End
**Rujukan Slide: Slide 1 – 4, 67, 69**

---

## 🎯 1. Filosofi Hari 3: Menutup Alur End-to-End (Slide 1 & 3)

Pelatihan API Development dirancang secara berjenjang dalam 3 hari pembelajaran yang saling mengunci:

```
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│     HARI 1: FONDASI     │     │    HARI 2: INTEGRASI    │     │      HARI 3: BUKTI      │
│                         │     │                         │     │                         │
│ • Kontrak RESTful       │ ──► │ • Keamanan Lanjutan     │ ──► │ • Webhook & Durable     │
│ • Skema & Validasi      │     │ • Ancaman BOLA/Mass-Asg │     │ • Anti-Tampering HMAC   │
│ • RBAC & Opaque Token   │     │ • Integrasi Pihak Ke-3  │     │ • Microservices & Saga  │
│ • Task dikelola aman    │     │ • Timeout & Circuit-Brk │     │ • Vitest & Operasi      │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
```

### Rantai Nilai Arsitektur (Slide 3)
1. **Fondasi (Hari 1)**: Entitas Task dikelola secara aman. Kontrak disepakati, otorisasi RBAC dipasang, dan basis data terlindungi dari SQL Injection.
2. **Delivery (Hari 2)**: Integrasi external memetakan cara mengonsumsi provider yang tidak dapat dipercaya (*Untrusted Third-Party*), menangani kegagalan jaringan, dan memasang Circuit Breaker.
3. **Bukti & Operasi (Hari 3)**: Menghubungkan **Kontrak &rarr; Delivery &rarr; Efek &rarr; Bukti**:
   - Event webhook diterima secara durabel (*Durable Inbox*).
   - Duplikasi event dan replay attack diuji secara empiris dengan pengujian otomatis, bukan sekadar diasumsikan aman.
   - Hasil perilaku sistem dapat dibuktikan melalui *Automated Test Suites* (Vitest + Supertest) dan pemantauan sinyal operasional (*Observability*).

---

## 🧭 2. Lima Pokok Bahasan Hari 3 (Slide 4)

| Ranah Bahasan | Fokus Utama | Pembuktian Konkret di Repository |
| :--- | :--- | :--- |
| **1. Webhook** | Pola *Event-Driven* & Tanda Tangan Kriptografi (*HMAC Signature*). | Verifikasi Buffer raw body pada endpoint `POST /webhooks/taskhub`. |
| **2. Inbox** | *Durable Inbox*, Deduplikasi berbasis hash payload, pemutaran ulang (*replay*), dan *Background Worker*. | Tabel `inbox` & `effects` di SQLite, mencegah kehilangan event jika server crash. |
| **3. Microservice** | Pola komunikasi Sinkron vs Asinkron, *Dual Write Prevention*, dan Transaksi Terdistribusi. | Pola *Transactional Outbox* dan *SAGA Pattern* dengan transaksi kompensasi. |
| **4. Pengujian** | *Functional Testing*, *Contract Testing*, *Security Matrix*, dan pengujian kinerja. | 30 test case di Vitest/Supertest + Runner 14 Langkah Postman/Insomnia. |
| **5. Operasi** | *Structured Logging* tanpa kebocoran data, Metrik SLO, *Alerting*, dan *Health Probes*. | Pino logger tersanitasi, route `/health/liveness`, `/health/readiness`, `/metrics`. |

---

## ⚖️ 3. Batasan Lab Edukasi vs Kebutuhan Produksi Nyata (Slide 67 & 69)

Penting bagi setiap peserta pelatihan untuk memahami perbedaan antara lingkungan laboratorium pelatihan dengan lingkungan produksi skala enterprise:

| Komponen | Implementasi di Lab / Pelatihan | Kebutuhan Wajib di Produksi Nyata |
| :--- | :--- | :--- |
| **Basis Data** | SQLite lokal (`taskhub.db` dengan WAL Mode) | PostgreSQL / MySQL berkerumun (*Clustered*), replikasi Multi-AZ, backup berkala |
| **Penyimpanan Inbox** | Polling SQLite query lokal (`getPendingInboxEvents`) | Message Broker enterprise: RabbitMQ, Apache Kafka, AWS SQS, atau Redis Streams |
| **Tanda Tangan Webhook** | Format custom TaskHub (`timestamp.rawBody`) | Standar industri vendor spesifik (e.g. Stripe `v1=...`, GitHub `sha256=...`) |
| **Rate Limiting** | In-memory `express-rate-limit` | Distributed cache (Redis / Valkey) di layer API Gateway |
| **Secret Management** | Berkas `.env` lokal | AWS Secrets Manager, HashiCorp Vault, Google Cloud Secret Manager |
| **Keamanan TLS** | HTTP plaintext `127.0.0.1` lokal | HTTPS mutlak (TLS 1.3), Sertifikat SSL otomatis, HSTS, Reverse Proxy (Nginx/Cloudflare) |

> [!IMPORTANT]
> **Slide 69:** Seluruh kode dalam repository ini dirancang untuk mendemonstrasikan prinsip arsitektur secara murni, transparan, dan dapat diuji. Kode lab ini **harus melalui proses hardening** (seperti checklist Slide 58) sebelum diterapkan pada lingkungan produksi komersial.
