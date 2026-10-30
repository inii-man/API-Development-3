// ==============================================================================
// BERKAS: scripts/send_event.js
// TUJUAN: Mengirim event bertanda tangan HMAC sebanyak 2 kali untuk menguji deduplikasi.
// RUJUKAN SLIDE:
//   - Slide 29: "Kode send_event.js: kirim event bertanda tangan dua kali.
//                Loop membangun dua request dengan event ID, raw body, timestamp, dan signature yang sama."
//   - Slide 30: "export WEBHOOK_SECRET=... node send_event.js"
//   - Slide 31: "Lab: kirim event dua kali:
//                Pertama -> 202, accepted=true, duplicate=false
//                Kedua   -> 202, duplicate=true"
// ==============================================================================

import "dotenv/config";
import { createHmac } from "node:crypto";

// 1. Membaca secret webhook dari environment (Slide 29 & 30)
const secret =
  process.env.WEBHOOK_SECRET || "4f8b2d1c9e7a6f5e3d2c1b0a9f8e7d6c5b4a39281706f5e4d3c2b1a0f9e8d7c6";

// 2. Membentuk payload event sesuai kontrak TaskHub (Slide 9 & 29)
const event = {
  id: "evt_demo_001",
  type: "task.completed.v1",
  data: { taskId: "tsk_demo" },
};

// 3. Mengonversi event ke Buffer raw body (Slide 11 & 29)
const raw = Buffer.from(JSON.stringify(event));

// 4. Mengambil Unix timestamp saat ini dalam detik (Slide 20 & 29)
const ts = String(Math.floor(Date.now() / 1000));

// 5. Menghitung signature HMAC SHA-256 pada Buffer concat(`${ts}.`, raw) (Slide 21 & 29)
const signature = createHmac("sha256", secret)
  .update(Buffer.concat([Buffer.from(ts + "."), raw]))
  .digest("hex");

console.log("==================================================================");
console.log("📡 [SEND_EVENT] Mengirim event bertanda tangan HMAC ke TaskHub API");
console.log(`🔑 Secret digunakan: ${secret.substring(0, 8)}...`);
console.log(`⏱️ Timestamp:        ${ts}`);
console.log(`🔏 Signature:        ${signature}`);
console.log(`📦 Event ID:         ${event.id}`);
console.log("==================================================================\n");

// 6. Loop mengirim 2 request dengan byte dan header yang identik (Slide 29 & 31)
const endpoint = "http://127.0.0.1:3000/webhooks/taskhub";

for (let attempt = 0; attempt < 2; attempt++) {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      body: raw,
      headers: {
        "Content-Type": "application/json",
        "X-Timestamp": ts,
        "X-Signature": signature,
      },
    });

    const body = await res.json();
    console.log(`👉 Pengiriman ke-${attempt + 1}:`);
    console.log(`   HTTP Status: ${res.status}`);
    console.log(`   Response:   `, body);

    if (attempt === 0) {
      console.log("   ✅ Ekspektasi: 202, accepted=true, duplicate=false (Slide 31)\n");
    } else {
      console.log("   ✅ Ekspektasi: 202, duplicate=true (Slide 31)\n");
    }
  } catch (err) {
    console.error(`❌ Gagal terhubung ke ${endpoint}. Pastikan server TaskHub sudah berjalan (npm start)!`);
    console.error(`   Error: ${err.message}`);
    process.exit(1);
  }
}
