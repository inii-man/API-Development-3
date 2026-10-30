// ==============================================================================
// BERKAS: src/server.js
// TUJUAN: Titik masuk utama aplikasi (Entrypoint) untuk menjalankan HTTP Server.
// RUJUKAN SLIDE:
//   - Slide 30: "Lab: set secret dan jalankan TaskHub: node --watch src/server.js"
//   - Slide 17 & 25: "Background worker mengambil event inbox received -> effects + processed."
//   - Slide 57: "Graceful shutdown dan pemisahan proses server."
// ==============================================================================

import app from "./app.js";
import { config } from "./config.js";
import { pinoLogger } from "./logger.js";
import { workerService } from "./services/workerService.js";

const PORT = config.PORT;

// Memulai server HTTP
const server = app.listen(PORT, "0.0.0.0", () => {
  pinoLogger.info(
    { port: PORT, env: config.NODE_ENV },
    `🚀 Server TaskHub Hari 3 aktif di http://127.0.0.1:${PORT}`
  );
  console.log("==================================================================");
  console.log(`🌐 TaskHub API Server Hari 3 running on: http://127.0.0.1:${PORT}`);
  console.log(`🎨 Web Playground Interaktif:          http://127.0.0.1:${PORT}/playground`);
  console.log(`📨 Webhook Receiver Endpoint:          POST http://127.0.0.1:${PORT}/webhooks/taskhub`);
  console.log(`🩺 Health Readiness Probe:             http://127.0.0.1:${PORT}/health/readiness`);
  console.log(`📊 Metrics & SLO Endpoint:             http://127.0.0.1:${PORT}/metrics`);
  console.log("==================================================================");

  // Memulai Background Inbox Worker secara otomatis (Slide 25)
  workerService.start(3000);
});

// Penanganan penghentian server secara bersih (Graceful Shutdown)
function handleShutdown(signal) {
  pinoLogger.info({ signal }, "Menerima sinyal terminasi, mematikan server secara graceful...");
  workerService.stop();
  server.close(() => {
    pinoLogger.info("Server HTTP berhasil ditutup. Basis data SQLite aman.");
    process.exit(0);
  });
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
