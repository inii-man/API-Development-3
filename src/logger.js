// ==============================================================================
// BERKAS: src/logger.js
// TUJUAN: Logging terstruktur aman (Structured Logging) dengan sanitasi kredensial.
// RUJUKAN SLIDE:
//   - Slide 54: "Logging terstruktur yang aman: Dicatat di lab (requestId, method, path tanpa query, status, latencyMs).
//                TIDAK DICETAK: Token, password, body, dan signature!"
//   - Slide 55: "Korelasi: Request ID/correlation ID dan structured logs."
// PRINSIP KEAMANAN:
//   - Zero-Leak Logging: Redaksi otomatis terhadap authorization header, body payload, password, dan signature.
//   - Observabilitas Produksi: Menyediakan metrik latensi dan riwayat log untuk antarmuka Lab/Playground.
// ==============================================================================

import pino from "pino";
import { randomUUID } from "node:crypto";

// Riwayat log sirkular dalam memori (disimpan hingga 100 entri terbaru untuk UI Playground)
export const logBuffer = [];
const MAX_LOG_BUFFER = 100;

// Konfigurasi Pino Logger dengan proteksi redaksi ketat (Slide 54)
export const pinoLogger = pino({
  level: process.env.NODE_ENV === "test" ? "silent" : "info",
  // Melakukan masking/redaksi otomatis terhadap field sensitif
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers['x-signature']",
      "password",
      "token",
      "secret",
      "body",
    ],
    censor: "[REDACTED_FOR_SECURITY]",
  },
  transport:
    process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        }
      : undefined,
});

// Menyimpan catatan log terstruktur ke buffer in-memory untuk ditampilkan di Playground UI
function pushToBuffer(entry) {
  logBuffer.unshift(entry);
  if (logBuffer.length > MAX_LOG_BUFFER) {
    logBuffer.pop();
  }
}

// Objek metrik global untuk mencatat performa API (Slide 52 & 55)
export const metricsState = {
  totalRequests: 0,
  successfulRequests: 0,
  errorRequests: 0,
  latencies: [],
  statusCodes: {},
  // Menghitung persentil p50, p95, p99
  getStats() {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const count = sorted.length;
    if (count === 0) {
      return { p50: 0, p95: 0, p99: 0, total: 0, errorRate: "0%" };
    }
    const p50 = sorted[Math.floor(count * 0.5)] || 0;
    const p95 = sorted[Math.floor(count * 0.95)] || 0;
    const p99 = sorted[Math.floor(count * 0.99)] || 0;
    const errorRate = ((this.errorRequests / (this.totalRequests || 1)) * 100).toFixed(2) + "%";
    return { p50, p95, p99, total: this.totalRequests, errorRate, statusCodes: this.statusCodes };
  },
};

// Middleware Express untuk Structured Logging aman (Slide 54 & 55)
export function structuredLoggingMiddleware(req, res, next) {
  // 1. Dapatkan atau buat Request ID / Correlation ID unik
  const requestId = req.get("x-request-id") || `req_${randomUUID().substring(0, 8)}`;
  req.id = requestId;
  res.setHeader("X-Request-Id", requestId);

  // 2. Catat waktu mulai permintaan
  const startTime = performance.now();

  // 3. Sanitasi path: Hilangkan query string agar data sensitif di URL tidak tercetak (Slide 54)
  const sanitizedPath = req.baseUrl ? `${req.baseUrl}${req.path}` : req.path.split("?")[0];

  // 4. Hook saat response selesai dikirim
  res.on("finish", () => {
    const latencyMs = Math.round(performance.now() - startTime);
    const statusCode = res.statusCode;

    // Catat ke metrik
    metricsState.totalRequests++;
    if (statusCode >= 400) {
      metricsState.errorRequests++;
    } else {
      metricsState.successfulRequests++;
    }
    metricsState.latencies.push(latencyMs);
    if (metricsState.latencies.length > 1000) {
      metricsState.latencies.shift();
    }
    metricsState.statusCodes[statusCode] = (metricsState.statusCodes[statusCode] || 0) + 1;

    // Struktur payload log aman (Slide 54: requestId, method, path tanpa query, status, latencyMs)
    const logPayload = {
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      path: sanitizedPath,
      status: statusCode,
      latencyMs,
    };

    // Cetak log terstruktur via Pino (tanpa token, password, body, signature)
    if (statusCode >= 500) {
      pinoLogger.error(logPayload, "HTTP Request Server Error");
    } else if (statusCode >= 400) {
      pinoLogger.warn(logPayload, "HTTP Request Client Warning/Error");
    } else {
      pinoLogger.info(logPayload, "HTTP Request Processed");
    }

    // Teruskan ke buffer UI Playground
    pushToBuffer(logPayload);
  });

  next();
}
