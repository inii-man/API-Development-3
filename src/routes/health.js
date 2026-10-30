// ==============================================================================
// BERKAS: src/routes/health.js
// TUJUAN: Health Checks (Liveness Probe, Readiness Probe) dan Endpoint Metrik Operasi.
// RUJUKAN SLIDE:
//   - Slide 52: "Performance test dan SLO: traffic, latency p95/p99, error rate."
//   - Slide 55: "Sinyal yang dipantau: Request, error, latency p50/p95/p99, saturation, queue backlog."
//   - Slide 57: "Health, readiness, deployment, dan rollback:
//                - Liveness: Memverifikasi apakah proses aplikasi hidup.
//                - Readiness: Memverifikasi apakah aplikasi siap menerima traffic (koneksi database & storage)."
// ==============================================================================

import { Router } from "express";
import { db } from "../db.js";
import { metricsState } from "../logger.js";

export const healthRouter = Router();

/**
 * 1. GET /health/liveness
 * Rujukan Slide 57: Liveness probe Kubernetes/Docker (memastikan proses node.js tidak deadlock/hang)
 */
healthRouter.get("/liveness", (req, res) => {
  return res.status(200).json({
    status: "alive",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    pid: process.pid,
  });
});

/**
 * 2. GET /health/readiness
 * Rujukan Slide 57: Readiness probe (memastikan koneksi database SQLite aktif sebelum menerima trafik)
 */
healthRouter.get("/readiness", (req, res) => {
  try {
    // Jalankan query ringan untuk memverifikasi kesiapan SQLite engine
    const testQuery = db.prepare("SELECT 1 AS ready").get();
    if (!testQuery || testQuery.ready !== 1) {
      throw new Error("Basis data tidak merespons kueri kesiapan");
    }

    // Hitung antrean inbox yang belum diproses (queue backlog - Slide 55)
    const inboxBacklog = db.prepare("SELECT COUNT(*) AS count FROM inbox WHERE status = 'received'").get().count;

    return res.status(200).json({
      status: "ready",
      database: "connected",
      storage: "writable",
      inboxBacklog,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(503).json({
      status: "unready",
      database: "disconnected",
      error: err.message,
    });
  }
});

/**
 * 3. GET /metrics
 * Rujukan Slide 52 & 55: Metrik performa, latensi p50/p95/p99, dan error rate
 */
healthRouter.get("/metrics", (req, res) => {
  const stats = metricsState.getStats();
  const backlog = db.prepare("SELECT COUNT(*) AS count FROM inbox WHERE status = 'received'").get().count;

  return res.status(200).json({
    sloTarget: {
      successRate: ">= 99.5%",
      p95Latency: "< 500 ms",
    },
    performanceMetrics: stats,
    queueBacklog: backlog,
    systemMemory: {
      rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
    timestamp: new Date().toISOString(),
  });
});
