// ==============================================================================
// BERKAS: scripts/run_negative_tests.js
// TUJUAN: Menjalankan 5 skenario uji negatif Webhook sesuai Slide 33.
// RUJUKAN SLIDE:
//   - Slide 33: "Uji negatif webhook:
//                1. Signature diubah                   -> 400
//                2. Timestamp lebih tua dari toleransi -> 400
//                3. Event type tidak sesuai            -> 422
//                4. taskId bukan string                -> 422
//                5. ID sama, body beda, signature sah  -> 409"
// ==============================================================================

import "dotenv/config";
import { createHmac } from "node:crypto";

const secret = process.env.WEBHOOK_SECRET || "4f8b2d1c9e7a6f5e3d2c1b0a9f8e7d6c5b4a39281706f5e4d3c2b1a0f9e8d7c6";
const endpoint = "http://127.0.0.1:3000/webhooks/taskhub";

function sign(timestamp, bodyBuffer) {
  return createHmac("sha256", secret)
    .update(Buffer.concat([Buffer.from(timestamp + "."), bodyBuffer]))
    .digest("hex");
}

async function runTest(name, eventPayload, timestampDelta, modifySig = false, expectedStatus = 400) {
  const raw = Buffer.from(JSON.stringify(eventPayload));
  const ts = String(Math.floor(Date.now() / 1000) + timestampDelta);
  let signature = sign(ts, raw);
  if (modifySig) {
    signature = signature.replace(/^../, "ff"); // Rusak signature
  }

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
    const passed = res.status === expectedStatus;
    console.log(`[${passed ? "PASS ✅" : "FAIL ❌"}] ${name}`);
    console.log(`   Ekspektasi Status: ${expectedStatus} | Diterima: ${res.status}`);
    console.log(`   Detail Response:  `, body);
    console.log("------------------------------------------------------------------");
    return passed;
  } catch (err) {
    console.error(`❌ Gagal koneksi: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log("==================================================================");
  console.log("🧪 [NEGATIVE TESTS] Menjalankan 5 Uji Negatif Webhook (Slide 33)");
  console.log("==================================================================\n");

  // Pastikan ID acak untuk pengujian isolasi
  const baseId = `evt_neg_${Date.now()}`;

  // Skenario 1: Signature diubah -> 400
  await runTest(
    "1. Signature diubah / dipalsukan",
    { id: `${baseId}_1`, type: "task.completed.v1", data: { taskId: "tsk_01" } },
    0,
    true, // modifySig
    400
  );

  // Skenario 2: Timestamp lebih tua dari toleransi (>300 detik) -> 400
  await runTest(
    "2. Timestamp lebih tua dari toleransi (stale 360 detik)",
    { id: `${baseId}_2`, type: "task.completed.v1", data: { taskId: "tsk_02" } },
    -360, // 360 detik lalu (>300s toleransi)
    false,
    400
  );

  // Skenario 3: Event type tidak sesuai kontrak -> 422
  await runTest(
    "3. Event type tidak sesuai (misal: 'task.deleted.v1')",
    { id: `${baseId}_3`, type: "task.deleted.v1", data: { taskId: "tsk_03" } },
    0,
    false,
    422
  );

  // Skenario 4: taskId bukan string -> 422
  await runTest(
    "4. taskId bukan string (misal: angka 12345)",
    { id: `${baseId}_4`, type: "task.completed.v1", data: { taskId: 12345 } },
    0,
    false,
    422
  );

  // Skenario 5: ID sama, body beda, signature sah -> 409 Conflict
  const conflictId = `${baseId}_conflict`;
  // Kirim pertama kali dengan benar
  await runTest(
    "5a. Mengirim event awal secara sah",
    { id: conflictId, type: "task.completed.v1", data: { taskId: "tsk_original" } },
    0,
    false,
    202
  );
  // Kirim ulang dengan ID sama persis tapi taskId diubah
  await runTest(
    "5b. ID sama, body beda, signature sah (Deteksi Tampering / Konflik Hash)",
    { id: conflictId, type: "task.completed.v1", data: { taskId: "tsk_MODIFIED_PAYLOAD" } },
    0,
    false,
    409
  );
}

main();
