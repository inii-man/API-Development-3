// ==============================================================================
// BERKAS: src/app.js
// TUJUAN: Inisialisasi aplikasi Express, perakitan middleware, dan rute utama.
// RUJUKAN SLIDE:
//   - Slide 19: "Urutan kerja receiver: Baca raw body (Buffer) dari express.raw, dipasang SEBELUM express.json."
//   - Slide 20: "router.post('/taskhub', express.raw({ type: 'application/json', limit: '64kb' }))"
//   - Slide 44: "import app from '../src/app.js' (Supertest mengimpor instance app tanpa listen)"
//   - Slide 46: "Rate limit (429) & CORS origin policy."
//   - Slide 54: "Structured Logging tanpa mencetak credential."
//   - Slide 57: "Liveness dan Readiness probes."
// ==============================================================================

import express from "express";
import { resolve } from "node:path";
import { corsMiddleware } from "./middleware/cors.js";
import { apiRateLimiter } from "./middleware/rateLimiter.js";
import { structuredLoggingMiddleware } from "./logger.js";
import { webhookRouter } from "./routes/webhooks.js";
import { authRouter } from "./routes/auth.js";
import { taskRouter } from "./routes/tasks.js";
import { healthRouter } from "./routes/health.js";
import { labRouter } from "./routes/lab.js";

export const app = express();

// 1. Pasang Structured Logging aman di urutan pertama (Slide 54 & 55)
app.use(structuredLoggingMiddleware);

// 2. Pasang middleware CORS (Slide 46)
app.use(corsMiddleware);

// 3. PENTING: Pasang Webhook Router SEBELUM express.json()! (Slide 19 & 20)
// express.raw membaca Buffer byte asli tanpa diubah atau di-reserialisasi oleh parser JSON.
app.use("/webhooks", webhookRouter);

// 4. Parser JSON standar untuk rute API lainnya dengan batas payload 1MB
app.use(express.json({ limit: "1mb" }));

// 5. Middleware penanganan kesalahan JSON sintaks rusak (Slide 45: JSON rusak -> 400)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      error: "Bad Request",
      detail: "Sintaks JSON pada request body rusak atau tidak valid",
    });
  }
  next(err);
});

// 6. Pasang Rate Limiter untuk proteksi endpoint API (Slide 46)
app.use("/api", apiRateLimiter);

// 7. Rute Autentikasi dan API Resource (Slide 44, 45, 48)
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/tasks", taskRouter);

// 8. Rute Operasi & Observabilitas (Health Checks & Metrics) (Slide 52, 55, 57)
app.use("/health", healthRouter);
app.use("/metrics", (req, res, next) => {
  req.url = "/metrics";
  healthRouter(req, res, next);
});

// 9. Rute Pembantu Lab & Playground
app.use("/api/lab", labRouter);

// 10. Melayani file statis untuk Web Playground Interaktif
app.use("/playground", express.static(resolve(process.cwd(), "playground")));

// 11. Halaman Beranda / Ringkasan API Root
app.get("/", (req, res) => {
  res.status(200).json({
    name: "TaskHub API - Training Hari 3 (NQA Syllabus)",
    description: "Webhook, Microservices, Pengujian, dan Proyek End-to-End",
    version: "1.0.0",
    links: {
      playground: "/playground",
      livenessProbe: "/health/liveness",
      readinessProbe: "/health/readiness",
      metrics: "/metrics",
      webhookEndpoint: "POST /webhooks/taskhub",
      tasksEndpoint: "/api/v1/tasks",
      authLoginEndpoint: "POST /api/v1/auth/login",
    },
  });
});

// 12. Handler 404 untuk rute yang tidak terdaftar
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    detail: `Endpoint '${req.method} ${req.path}' tidak ditemukan pada server`,
  });
});

// 13. Centralized Error Handler (Mencegah kebocoran stack trace ke pengguna eksternal)
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    error: err.name || "Internal Server Error",
    detail: err.message || "Terjadi kesalahan internal pada server",
  });
});

export default app;
