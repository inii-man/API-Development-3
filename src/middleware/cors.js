// ==============================================================================
// BERKAS: src/middleware/cors.js
// TUJUAN: Menegakkan kebijakan Cross-Origin Resource Sharing (CORS) yang aman.
// RUJUKAN SLIDE:
//   - Slide 46: "Origin asing: Tidak mendapat CORS allow-origin"
//   - Slide 50: "Origin asing -> Tanpa header allow-origin"
// PRINSIP KEAMANAN:
//   - Browser Boundary Enforcement: Origin luar tidak otomatis diberikan izin.
//   - Jangan gunakan wildcard '*' bila kredensial diizinkan.
// ==============================================================================

import cors from "cors";
import { config } from "../config.js";

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Izinkan request tanpa origin (seperti Supertest, cURL, server-to-server, playground lokal)
    if (!origin) {
      return callback(null, true);
    }

    // Periksa apakah origin cocok dengan domain resmi yang diizinkan di config
    // atau jika berasal dari localhost/127.0.0.1 untuk keperluan playground & development
    const allowedOrigins = [
      config.ALLOWED_ORIGIN,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:8000",
      "http://127.0.0.1:8000",
    ];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Origin asing: JANGAN beri header Access-Control-Allow-Origin (Slide 46 & 50)
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Request-Id",
    "X-Timestamp",
    "X-Signature",
    "Idempotency-Key",
  ],
});
