// ==============================================================================
// BERKAS: src/middleware/rateLimiter.js
// TUJUAN: Membatasi laju permintaan (Rate Limiting) untuk mencegah DoS dan brute-force.
// RUJUKAN SLIDE:
//   - Slide 46: "Melewati rate limit -> 429"
//   - Slide 50: "Request melewati limit -> 429"
// ==============================================================================

import rateLimit from "express-rate-limit";

// Rate limiter standar untuk endpoint API TaskHub
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // Jendela waktu 1 menit
  max: 120, // Batas 120 request per IP per menit
  standardHeaders: true, // Kembalikan header RateLimit-* standar RFC
  legacyHeaders: false, // Matikan header lama X-RateLimit-*
  message: {
    error: "Too Many Requests",
    detail: "Batas laju permintaan terlampaui. Silakan coba kembali nanti.",
  },
  statusCode: 429,
});

// Rate limiter ketat untuk demonstrasi lab dan pengujian otomatis 429
export const strictRateLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 detik
  max: 5, // Maksimal 5 permintaan dalam 10 detik
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too Many Requests",
    detail: "Batas laju ketat terlampaui. HTTP 429 dikembalikan.",
  },
  statusCode: 429,
});
