// ==============================================================================
// BERKAS: src/worker.js
// TUJUAN: Standalone Worker Entrypoint untuk memproses antrean inbox di proses terpisah.
// RUJUKAN SLIDE:
//   - Slide 17: "Worker: Ambil received -> efek demonstrasi + processed -> commit."
//   - Slide 25: "Worker inbox dan jalur produksi: 01 Ambil received, 02 Catat efek, 03 Commit bersama."
//   - Slide 26: "Dari worker lab ke worker produksi: Claim / lease, jadwalkan ulang, investigasi DLQ."
//   - Slide 57: "Pemisahan proses server HTTP dari background worker."
// ==============================================================================

import { workerService } from "./services/workerService.js";
import { pinoLogger } from "./logger.js";

console.log("==================================================================");
console.log("⚙️  [STANDALONE WORKER] TaskHub Background Inbox Worker");
console.log("📥  Membaca tabel inbox setiap 3 detik...");
console.log("==================================================================");

// Memulai worker loop setiap 3 detik
workerService.start(3000);

// Graceful shutdown
function shutdown() {
  console.log("\n🛑 Menghentikan worker secara bersih...");
  workerService.stop();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
