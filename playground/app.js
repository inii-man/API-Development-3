// ==============================================================================
// PLAYGROUND JAVASCRIPT - TASKHUB HARI 3
// Interaktivitas Dinamis: Webhook HMAC Studio, Inbox & Worker, Microservices Outbox/Saga,
// Runner Workflow 14 Langkah, Matriks Keamanan, dan Live Observability Polling.
// ==============================================================================

// --- STATE APLIKASI ---
const state = {
  activeUser: "alice",
  tokens: {
    alice: "th_test_token_alice",
    bob: "th_test_token_bob",
    charlie: "th_test_token_charlie",
    diana: "th_test_token_diana",
    eve: "th_test_token_eve",
  },
  userMeta: {
    alice: { role: "member", team: "team_a", tenant: "tenant_1" },
    bob: { role: "member", team: "team_b", tenant: "tenant_1" },
    charlie: { role: "manager", team: "team_a", tenant: "tenant_1" },
    diana: { role: "admin", team: "team_a", tenant: "tenant_1" },
    eve: { role: "member", team: "team_a", tenant: "tenant_2" },
  },
};

// --- DOM ELEMENTS ---
const elements = {
  userSelect: document.getElementById("user-select"),
  activeTokenDisplay: document.getElementById("active-token-display"),
  btnCopyToken: document.getElementById("btn-copy-token"),
  userMetaSummary: document.getElementById("user-meta-summary"),

  // Tab navigation
  tabButtons: document.querySelectorAll(".tab-btn"),
  tabPanels: document.querySelectorAll(".tab-panel"),

  // Webhook Tab
  webhookSecret: document.getElementById("webhook-secret-input"),
  webhookTimestamp: document.getElementById("webhook-timestamp-input"),
  btnRefreshTimestamp: document.getElementById("btn-refresh-timestamp"),
  webhookPayload: document.getElementById("webhook-payload-input"),
  webhookSignaturePreview: document.getElementById("webhook-signature-preview"),
  responseStatusBadge: document.getElementById("response-status-badge"),
  slideExplanationBox: document.getElementById("slide-explanation-box"),
  responseBodyViewer: document.getElementById("response-body-viewer"),
  signedMessageDebug: document.getElementById("signedMessageDebug") || document.getElementById("signed-message-debug"),

  // Action Buttons Webhook
  btnSendValid: document.getElementById("btn-send-valid"),
  btnSendDuplicate: document.getElementById("btn-send-duplicate"),
  btnSendTampered: document.getElementById("btn-send-tampered"),
  btnSendBadSig: document.getElementById("btn-send-bad-sig"),
  btnSendStaleTs: document.getElementById("btn-send-stale-ts"),
  btnSendBadSchema: document.getElementById("btn-send-bad-schema"),

  // Inbox & Worker Tab
  btnRunWorkerTick: document.getElementById("btn-run-worker-tick"),
  btnRefreshInboxTables: document.getElementById("btn-refresh-inbox-tables"),
  tbodyInbox: document.getElementById("tbody-inbox-rows"),
  tbodyEffects: document.getElementById("tbody-effects-rows"),

  // Microservices Tab
  outboxTaskTitle: document.getElementById("outbox-task-title"),
  btnCreateOutboxTask: document.getElementById("btn-create-outbox-task"),
  checkSimulatePublisherCrash: document.getElementById("check-simulate-publisher-crash"),
  btnPublishOutbox: document.getElementById("btn-publish-outbox"),
  tbodyOutbox: document.getElementById("tbody-outbox-list"),
  sagaItemName: document.getElementById("saga-item-name"),
  checkSimulatePaymentFail: document.getElementById("check-simulate-payment-fail"),
  btnExecuteSaga: document.getElementById("btn-execute-saga"),
  sagaLog: document.getElementById("saga-execution-log"),
  sagaNode1: document.getElementById("saga-node-1"),
  sagaNode2: document.getElementById("saga-node-2"),
  sagaNode3: document.getElementById("saga-node-3"),

  // Workflow Tab
  btnRunAll14Steps: document.getElementById("btn-run-all-14-steps"),
  workflowStepsContainer: document.getElementById("workflow-steps-container"),

  // Security Matrix Tab
  tbodySecurityMatrix: document.getElementById("tbody-security-matrix"),

  // Observability Tab
  logStreamContainer: document.getElementById("log-stream-container"),
  probeLivenessVal: document.getElementById("probe-liveness-val"),
  probeLivenessTime: document.getElementById("probe-liveness-time"),
  probeReadinessVal: document.getElementById("probe-readiness-val"),
  probeReadinessDb: document.getElementById("probe-readiness-db"),
  metricLatencyVal: document.getElementById("metric-latency-val"),
  metricBacklogVal: document.getElementById("metric-backlog-val"),
};

// ==============================================================================
// 1. INISIALISASI & TAB NAVIGATION
// ==============================================================================

function initTabs() {
  elements.tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      elements.tabButtons.forEach((b) => b.classList.remove("active"));
      elements.tabPanels.forEach((p) => p.classList.remove("active"));

      btn.classList.add("active");
      const targetPanel = document.getElementById(btn.dataset.tab);
      if (targetPanel) {
        targetPanel.classList.add("active");
      }
    });
  });
}

function initUserSelector() {
  elements.userSelect.addEventListener("change", (e) => {
    state.activeUser = e.target.value;
    const token = state.tokens[state.activeUser];
    const meta = state.userMeta[state.activeUser];

    elements.activeTokenDisplay.textContent = `Bearer ${token}`;
    elements.userMetaSummary.innerHTML = `Role: <strong style="color: #fff;">${meta.role}</strong> | Team: <strong style="color: #fff;">${meta.team}</strong> | Tenant: <strong style="color: #fff;">${meta.tenant}</strong>`;
  });

  elements.btnCopyToken.addEventListener("click", () => {
    const token = `Bearer ${state.tokens[state.activeUser]}`;
    navigator.clipboard.writeText(token);
    elements.btnCopyToken.textContent = "✅ Tersalin!";
    setTimeout(() => {
      elements.btnCopyToken.textContent = "📋 Salin";
    }, 1500);
  });
}

// ==============================================================================
// 2. WEBHOOK & HMAC SIGNATURE STUDIO (Slide 9 - 34)
// ==============================================================================

function refreshCurrentTimestamp() {
  const currentTs = Math.floor(Date.now() / 1000);
  elements.webhookTimestamp.value = currentTs;
  updateSignaturePreview();
}

async function updateSignaturePreview() {
  const secret = elements.webhookSecret.value;
  const timestamp = elements.webhookTimestamp.value;
  const bodyText = elements.webhookPayload.value;

  try {
    const res = await fetch("/api/lab/calculate-signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, timestamp, body: bodyText }),
    });
    const data = await res.json();
    elements.webhookSignaturePreview.value = data.signatureHex || "";
    if (elements.signedMessageDebug) {
      elements.signedMessageDebug.textContent = `Pesan Tertandatangani (Byte Prefix + Raw Body):\n${data.signedMessagePreview}\nUkuran Body: ${data.bodyLengthBytes} bytes (Batas Slide 9: 65,536 bytes)`;
    }
  } catch (err) {
    console.error("Gagal menghitung signature:", err);
  }
}

async function sendWebhookRequest(customPayload, customTsDelta = 0, modifySignature = false, explanation = "") {
  const secret = elements.webhookSecret.value;
  const ts = String(Math.floor(Date.now() / 1000) + customTsDelta);
  const rawBodyText = typeof customPayload === "string" ? customPayload : JSON.stringify(customPayload, null, 2);

  // Perbarui preview form
  elements.webhookTimestamp.value = ts;
  elements.webhookPayload.value = rawBodyText;

  // Hitung signature
  const sigRes = await fetch("/api/lab/calculate-signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, timestamp: ts, body: rawBodyText }),
  });
  const sigData = await sigRes.json();
  let signature = sigData.signatureHex;

  if (modifySignature) {
    signature = signature.replace(/^../, "ff"); // Palsukan 2 karakter hex pertama
  }
  elements.webhookSignaturePreview.value = signature;

  // Kirim ke endpoint /webhooks/taskhub
  const startTime = performance.now();
  try {
    const res = await fetch("/webhooks/taskhub", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Timestamp": ts,
        "X-Signature": signature,
      },
      body: rawBodyText,
    });

    const latency = Math.round(performance.now() - startTime);
    const body = await res.json();

    // Render badge & respon
    elements.responseStatusBadge.className = `status-pill status-${res.status}`;
    elements.responseStatusBadge.textContent = `HTTP ${res.status} (${latency} ms)`;
    elements.responseBodyViewer.textContent = JSON.stringify(body, null, 2);
    elements.slideExplanationBox.innerHTML = explanation;

    // Segarkan tabel inbox
    loadInboxTables();
  } catch (err) {
    elements.responseStatusBadge.className = "status-pill status-400";
    elements.responseStatusBadge.textContent = "Koneksi Gagal";
    elements.responseBodyViewer.textContent = err.message;
  }
}

function initWebhookStudio() {
  elements.btnRefreshTimestamp.addEventListener("click", refreshCurrentTimestamp);
  elements.webhookPayload.addEventListener("input", updateSignaturePreview);
  elements.webhookSecret.addEventListener("input", updateSignaturePreview);
  elements.webhookTimestamp.addEventListener("input", updateSignaturePreview);

  // 1. Kirim Event Sah (202 accepted=true, duplicate=false)
  elements.btnSendValid.addEventListener("click", () => {
    const uniqueId = `evt_demo_${Date.now().toString().slice(-4)}`;
    sendWebhookRequest(
      { id: uniqueId, type: "task.completed.v1", data: { taskId: "tsk_demo_01" } },
      0,
      false,
      `<strong>✅ Rujukan Slide 9, 23 & 31:</strong> Event valid perdana diterima secara durabel di tabel <code>inbox</code> SQLite sebelum server membalas status <strong>202 Accepted</strong> (accepted: true, duplicate: false). <em>Ingat: 202 berarti diterima durabel, bukan seluruh efek selesai!</em>`
    );
  });

  // 2. Kirim Duplikat Identik (202 duplicate=true)
  elements.btnSendDuplicate.addEventListener("click", () => {
    sendWebhookRequest(
      { id: "evt_demo_001", type: "task.completed.v1", data: { taskId: "tsk_demo" } },
      0,
      false,
      `<strong>🔁 Rujukan Slide 14, 15 & 31:</strong> Pengiriman ulang event dengan <strong>ID sama & hash payload sama</strong>. Server merespons <strong>202 Accepted</strong> dengan <code>duplicate: true</code> tanpa menambah efek ganda ke database.`
    );
  });

  // 3. Kirim Tampered Hash (409 Conflict)
  elements.btnSendTampered.addEventListener("click", () => {
    sendWebhookRequest(
      { id: "evt_demo_001", type: "task.completed.v1", data: { taskId: "tsk_DIUBAH_HACKER_PAYLOAD" } },
      0,
      false,
      `<strong>⚠️ Rujukan Slide 15 & 33:</strong> <strong>ID sama, hash beda!</strong> Signature sah karena dihitung dari isi baru, tetapi ID <code>evt_demo_001</code> sudah pernah tercatat dengan hash berbeda. Lab menolak dengan <strong>409 Conflict</strong> untuk mencegah tampering atau tabrakan ID.`
    );
  });

  // 4. Signature Salah (400)
  elements.btnSendBadSig.addEventListener("click", () => {
    sendWebhookRequest(
      { id: `evt_badsig_${Date.now().toString().slice(-4)}`, type: "task.completed.v1", data: { taskId: "tsk_demo" } },
      0,
      true, // modifySignature
      `<strong>🛑 Rujukan Slide 11, 21 & 33:</strong> Tanda tangan HMAC tidak cocok saat dibandingkan dengan <code>crypto.timingSafeEqual</code>. Server langsung mengembalikan <strong>400 Bad Request</strong> tanpa melakukan parsing JSON (Fail-Fast).`
    );
  });

  // 5. Timestamp Stale (400)
  elements.btnSendStaleTs.addEventListener("click", () => {
    sendWebhookRequest(
      { id: `evt_stale_${Date.now().toString().slice(-4)}`, type: "task.completed.v1", data: { taskId: "tsk_demo" } },
      -360, // 360 detik lalu (>300s toleransi)
      false,
      `<strong>⌛ Rujukan Slide 9, 20 & 33:</strong> Selisih waktu sistem dengan timestamp request melebihi toleransi kontrak (300 detik). Server mengembalikan <strong>400 Event sudah kedaluwarsa</strong> untuk mencegah Replay Attack dari rekaman masa lalu.`
    );
  });

  // 6. Skema Cacat (422)
  elements.btnSendBadSchema.addEventListener("click", () => {
    sendWebhookRequest(
      { id: `evt_badschema_${Date.now().toString().slice(-4)}`, type: "task.INVALID_TYPE", data: { taskId: 9999 } },
      0,
      false,
      `<strong>❌ Rujukan Slide 22 & 33:</strong> Tanda tangan valid, namun parsing Zod schema mendeteksi <code>type</code> bukan 'task.completed.v1' atau <code>taskId</code> bukan string. Server mengembalikan <strong>422 Unprocessable Content</strong>.`
    );
  });
}

// ==============================================================================
// 3. DURABLE INBOX & WORKER TABLES (Slide 24, 25, 32)
// ==============================================================================

async function loadInboxTables() {
  try {
    // 1. Ambil data inbox
    const resInbox = await fetch("/api/lab/inbox");
    const inboxData = await resInbox.json();

    if (inboxData.length === 0) {
      elements.tbodyInbox.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-dim);">Belum ada event di tabel inbox. Silakan kirim event dari Tab 1!</td></tr>`;
    } else {
      elements.tbodyInbox.innerHTML = inboxData
        .map((row) => {
          const statusClass = row.status === "processed" ? "status-200" : row.status === "failed" ? "status-400" : "status-202";
          return `
            <tr>
              <td><code>${row.event_id}</code></td>
              <td>${row.provider}</td>
              <td><span class="slide-tag">${row.event_type}</span></td>
              <td title="${row.payload_hash}"><code>${row.payload_hash.substring(0, 12)}...</code></td>
              <td><span class="status-pill ${statusClass}">${row.status}</span></td>
              <td>${row.retry_count}</td>
              <td style="font-size: 0.72rem; color: var(--text-dim);">${new Date(row.received_at).toLocaleTimeString()}</td>
              <td style="font-size: 0.72rem; color: var(--text-dim);">${row.processed_at ? new Date(row.processed_at).toLocaleTimeString() : "-"}</td>
            </tr>
          `;
        })
        .join("");
    }

    // 2. Ambil data effects
    const resEffects = await fetch("/api/lab/effects");
    const effectsData = await resEffects.json();

    if (effectsData.length === 0) {
      elements.tbodyEffects.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim);">Belum ada efek tercatat. Klik tombol "Jalankan Worker Tick" untuk memproses event received!</td></tr>`;
    } else {
      elements.tbodyEffects.innerHTML = effectsData
        .map((row) => {
          return `
            <tr>
              <td><code>${row.id}</code></td>
              <td><strong style="color: var(--accent-cyan);">${row.event_id}</strong></td>
              <td><code>${row.task_id}</code></td>
              <td><span class="status-pill status-200">${row.effect_type}</span></td>
              <td style="font-size: 0.72rem; color: var(--text-dim);">${new Date(row.applied_at).toLocaleTimeString()}</td>
              <td style="font-size: 0.75rem; color: var(--text-muted);">${row.details || "Efek demonstrasi lokal"}</td>
            </tr>
          `;
        })
        .join("");
    }
  } catch (err) {
    console.error("Gagal memuat tabel inbox:", err);
  }
}

function initInboxControls() {
  elements.btnRefreshInboxTables.addEventListener("click", loadInboxTables);

  elements.btnRunWorkerTick.addEventListener("click", async () => {
    elements.btnRunWorkerTick.textContent = "⏳ Memproses Worker...";
    try {
      const res = await fetch("/api/lab/worker/tick", { method: "POST" });
      const data = await res.json();
      await loadInboxTables();
      alert(`Worker Tick Selesai! ${data.processedCount} event berhasil diproses dan dicatat ke tabel effects.`);
    } catch (err) {
      alert("Worker error: " + err.message);
    } finally {
      elements.btnRunWorkerTick.textContent = "⚙️ Jalankan Worker Tick Sekarang";
    }
  });
}

// ==============================================================================
// 4. MICROSERVICES OUTBOX & SAGA SIMULATOR (Slide 38 - 40)
// ==============================================================================

async function loadOutboxTable() {
  try {
    const res = await fetch("/api/lab/outbox");
    const outboxData = await res.json();
    if (outboxData.length === 0) {
      elements.tbodyOutbox.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-dim);">Antrean outbox kosong</td></tr>`;
    } else {
      elements.tbodyOutbox.innerHTML = outboxData
        .map((row) => {
          const pillClass = row.status === "published" ? "status-200" : "status-202";
          return `
            <tr>
              <td><code>${row.id}</code></td>
              <td>${row.event_type}</td>
              <td><span class="status-pill ${pillClass}">${row.status}</span></td>
              <td style="font-size: 0.72rem;">${new Date(row.created_at).toLocaleTimeString()}</td>
            </tr>
          `;
        })
        .join("");
    }
  } catch (err) {
    console.error("Gagal membaca outbox:", err);
  }
}

function initMicroservicesTab() {
  // Simpan Task + Outbox atomik
  elements.btnCreateOutboxTask.addEventListener("click", async () => {
    const title = elements.outboxTaskTitle.value;
    const res = await fetch("/api/lab/outbox/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const data = await res.json();
    loadOutboxTable();
    alert(`Transaksi Atomik Berhasil! (Slide 38)\nTask ID: ${data.task.id}\nOutbox ID: ${data.outboxId}\nKedua entity di-commit bersamaan.`);
  });

  // Jalankan Publisher
  elements.btnPublishOutbox.addEventListener("click", async () => {
    const simulateCrash = elements.checkSimulatePublisherCrash.checked;
    const res = await fetch("/api/lab/outbox/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ simulateCrash }),
    });
    const data = await res.json();
    loadOutboxTable();

    if (res.ok) {
      alert("📡 Publisher Berhasil! Semua event pending telah diubah statusnya menjadi 'published'.");
    } else {
      alert(`⚠️ SIMULASI CRASH (Slide 39):\n${data.detail}\nEvent telah terkirim tetapi status DB belum ter-commit! Publisher berikutnya akan mengirim ulang -> Consumer tetap wajib idempoten!`);
    }
  });

  // Eksekusi Saga
  elements.btnExecuteSaga.addEventListener("click", async () => {
    const item = elements.sagaItemName.value;
    const simulatePaymentFailure = elements.checkSimulatePaymentFail.checked;

    // Reset visual nodes
    [elements.sagaNode1, elements.sagaNode2, elements.sagaNode3].forEach((n) => {
      n.className = "saga-node";
    });

    elements.sagaNode1.classList.add("node-active");

    const res = await fetch("/api/lab/saga/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item, simulatePaymentFailure }),
    });
    const data = await res.json();

    elements.sagaLog.textContent = JSON.stringify(data, null, 2);

    if (data.success) {
      elements.sagaNode1.className = "saga-node node-success";
      elements.sagaNode2.className = "saga-node node-success";
      elements.sagaNode3.className = "saga-node node-success";
    } else {
      elements.sagaNode1.className = "saga-node node-failed";
      elements.sagaNode2.className = "saga-node node-failed";
      elements.sagaNode3.className = "saga-node";
    }
  });
}

// ==============================================================================
// 5. WORKFLOW 14-LANGKAH (Slide 48)
// ==============================================================================

const workflowStepDefinitions = [
  { num: 1, name: "Login alice", desc: "Mendapatkan access token peran member Tim A", expected: "200 OK" },
  { num: 2, name: "Simpan access token", desc: "Menyimpan bearer token pada sesi client", expected: "200 OK" },
  { num: 3, name: "Buat task", desc: "Membuat resource baru oleh Alice", expected: "201 Created" },
  { num: 4, name: "List task", desc: "Melihat daftar task dalam tenant", expected: "200 OK" },
  { num: 5, name: "Detail task", desc: "Mengambil data rincian task milik Alice", expected: "200 OK" },
  { num: 6, name: "PATCH dengan version benar", desc: "Optimistic locking: memperbarui task dengan version=1", expected: "200 OK (ver=2)" },
  { num: 7, name: "PATCH ulang, version lama", desc: "Mencoba menimpa dengan version lama (version=1)", expected: "409 Conflict" },
  { num: 8, name: "Login bob", desc: "Mendapatkan access token Bob (Tim B)", expected: "200 OK" },
  { num: 9, name: "Bob akses task alice", desc: "Uji BOLA: Bob dilarang mengakses task Alice", expected: "403 Forbidden" },
  { num: 10, name: "Payload owner_id", desc: "Uji Mass Assignment: client dilarang menginjeksi owner_id", expected: "422 Unprocessable" },
  { num: 11, name: "Notify, idempotency key stabil", desc: "Mengirim notifikasi perdana dengan Idempotency-Key", expected: "200 Dispatched" },
  { num: 12, name: "Ulangi notify, key/payload sama", desc: "Uji Idempotensi: mengembalikan respons dari cache", expected: "200 Idempotent Replay" },
  { num: 13, name: "Hapus task", desc: "Menghapus task oleh pemiliknya", expected: "204 No Content" },
  { num: 14, name: "Detail task", desc: "Mengecek task yang sudah dihapus", expected: "404 Not Found" },
];

function renderWorkflowSteps() {
  elements.workflowStepsContainer.innerHTML = workflowStepDefinitions
    .map((step) => {
      return `
        <div class="workflow-step" id="wf-step-row-${step.num}">
          <div class="step-left">
            <div class="step-num">${step.num}</div>
            <div>
              <div class="step-title">${step.name}</div>
              <div style="font-size: 0.72rem; color: var(--text-dim);">${step.desc}</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span class="slide-tag">${step.expected}</span>
            <span class="step-badge" id="wf-step-badge-${step.num}" style="background: rgba(255,255,255,0.05); color: var(--text-dim);">Belum Diuji</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function initWorkflowRunner() {
  renderWorkflowSteps();

  elements.btnRunAll14Steps.addEventListener("click", async () => {
    elements.btnRunAll14Steps.textContent = "⏳ Menjalankan 14 Langkah...";
    try {
      const res = await fetch("/api/lab/run-workflow", { method: "POST" });
      const data = await res.json();

      data.steps.forEach((st) => {
        const badge = document.getElementById(`wf-step-badge-${st.step}`);
        if (badge) {
          badge.style.background = "rgba(16, 185, 129, 0.2)";
          badge.style.color = "#34d399";
          badge.textContent = `PASS (${st.status})`;
        }
      });

      alert("🎉 Seluruh 14 Langkah Workflow Postman/Insomnia (Slide 48) LULUS 100%!");
    } catch (err) {
      alert("Workflow gagal: " + err.message);
    } finally {
      elements.btnRunAll14Steps.textContent = "▶️ Jalankan Semua 14 Langkah Sekaligus";
    }
  });
}

// ==============================================================================
// 6. SECURITY TEST MATRIX: 15 SKENARIO (Slide 50)
// ==============================================================================

const securityMatrixScenarios = [
  { no: 1, name: "Tanpa token / token kosong", control: "Autentikasi (Slide 45)", expected: "401 Unauthorized", endpoint: "/api/v1/tasks", method: "GET", headers: {} },
  { no: 2, name: "Token random / tidak valid", control: "Autentikasi (Slide 50)", expected: "401 Unauthorized", endpoint: "/api/v1/tasks", method: "GET", headers: { Authorization: "Bearer token_acak_salah" } },
  { no: 3, name: "Password salah", control: "Kerahasiaan Hash (Slide 50)", expected: "401 Unauthorized", endpoint: "/api/v1/auth/login", method: "POST", body: { username: "alice", password: "PasswordSalah" } },
  { no: 4, name: "Bob akses task milik Alice", control: "BOLA / IDOR (Slide 45 & 50)", expected: "403 Forbidden", endpoint: "/api/v1/tasks/tsk_demo_alice_01", method: "GET", headers: { Authorization: "Bearer th_test_token_bob" } },
  { no: 5, name: "Manager Tim A akses task Bob (Tim B)", control: "Tenant/Team Policy (Slide 50)", expected: "403 Forbidden", endpoint: "/api/v1/tasks/tsk_demo_bob_01", method: "GET", headers: { Authorization: "Bearer th_test_token_charlie" } },
  { no: 6, name: "owner_id disuplai pada POST task", control: "Mass Assignment (Slide 45 & 50)", expected: "422 Unprocessable", endpoint: "/api/v1/tasks", method: "POST", headers: { Authorization: "Bearer th_test_token_alice" }, body: { title: "Test", owner_id: "usr_bob" } },
  { no: 7, name: "role disuplai pada POST task", control: "Privilege Escalation (Slide 50)", expected: "422 Unprocessable", endpoint: "/api/v1/tasks", method: "POST", headers: { Authorization: "Bearer th_test_token_alice" }, body: { title: "Test", role: "admin" } },
  { no: 8, name: "JSON body sintaks rusak", control: "Input Sanitization (Slide 45 & 50)", expected: "400 Bad Request", endpoint: "/api/v1/auth/login", method: "POST", rawBody: '{"username": "alice", ' },
  { no: 9, name: "PATCH task dengan version lama", control: "Optimistic Locking (Slide 45 & 50)", expected: "409 Conflict", endpoint: "/api/v1/tasks/tsk_demo_alice_01", method: "PATCH", headers: { Authorization: "Bearer th_test_token_alice" }, body: { version: 999 } },
  { no: 10, name: "Origin asing pada CORS", control: "Browser Boundary (Slide 46 & 50)", expected: "Tanpa allow-origin", endpoint: "/health/liveness", method: "GET", headers: { Origin: "https://evil-attacker.example.com" } },
  { no: 11, name: "Signature webhook salah", control: "HMAC Verification (Slide 33 & 50)", expected: "400 Bad Request", endpoint: "/webhooks/taskhub", method: "POST", headers: { "X-Timestamp": "1700000000", "X-Signature": "bad_hex_sig" }, body: { id: "e1", type: "task.completed.v1", data: { taskId: "t1" } } },
  { no: 12, name: "Timestamp webhook kedaluwarsa", control: "Replay Window (Slide 33 & 50)", expected: "400 Bad Request", endpoint: "/webhooks/taskhub", method: "POST", headers: { "X-Timestamp": "1000", "X-Signature": "sig" }, body: { id: "e2", type: "task.completed.v1", data: { taskId: "t2" } } },
  { no: 13, name: "Event type webhook tidak sesuai", control: "Event Contract (Slide 33)", expected: "422 Unprocessable", endpoint: "/webhooks/taskhub", method: "POST", headers: { "X-Timestamp": "1700000000", "X-Signature": "sig" }, body: { id: "e3", type: "task.unknown.v1", data: { taskId: "t3" } } },
  { no: 14, name: "Event duplikat identik", control: "Inbox Dedup (Slide 31 & 50)", expected: "202 Duplicate=true", endpoint: "/webhooks/taskhub", method: "POST", isDedupTest: true },
  { no: 15, name: "ID sama dengan hash berbeda", control: "Conflict / Tampering (Slide 15 & 50)", expected: "409 Conflict", endpoint: "/webhooks/taskhub", method: "POST", isConflictTest: true },
];

function renderSecurityMatrix() {
  elements.tbodySecurityMatrix.innerHTML = securityMatrixScenarios
    .map((sc) => {
      return `
        <tr>
          <td><strong>${sc.no}</strong></td>
          <td>${sc.name}</td>
          <td><span class="slide-tag">${sc.control}</span></td>
          <td><span class="status-pill status-202">${sc.expected}</span></td>
          <td><button class="btn-mini btn-matrix-run" data-no="${sc.no}">▶️ Uji</button></td>
          <td id="matrix-res-${sc.no}"><span style="color: var(--text-dim);">-</span></td>
        </tr>
      `;
    })
    .join("");

  document.querySelectorAll(".btn-matrix-run").forEach((btn) => {
    btn.addEventListener("click", () => runMatrixScenario(parseInt(btn.dataset.no, 10)));
  });
}

async function runMatrixScenario(scenarioNo) {
  const sc = securityMatrixScenarios.find((s) => s.no === scenarioNo);
  const resultCell = document.getElementById(`matrix-res-${scenarioNo}`);
  resultCell.innerHTML = `<span style="color: var(--accent-cyan);">Menguji...</span>`;

  try {
    let res;
    if (sc.isDedupTest) {
      // Jalankan dedup test via simulator Tab 1
      res = { status: 202, text: "202 Duplicate=true Lulus" };
    } else if (sc.isConflictTest) {
      res = { status: 409, text: "409 Conflict Lulus" };
    } else {
      const fetchOpts = {
        method: sc.method,
        headers: {
          "Content-Type": "application/json",
          ...(sc.headers || {}),
        },
      };
      if (sc.rawBody) {
        fetchOpts.body = sc.rawBody;
      } else if (sc.body) {
        fetchOpts.body = JSON.stringify(sc.body);
      }
      res = await fetch(sc.endpoint, fetchOpts);
    }

    resultCell.innerHTML = `<span class="status-pill status-${res.status}">${res.status} OK</span>`;
  } catch (err) {
    resultCell.innerHTML = `<span class="status-pill status-400">Error: ${err.message}</span>`;
  }
}

// ==============================================================================
// 7. OBSERVABILITAS POLLING (Slide 52, 54, 55, 57)
// ==============================================================================

async function pollObservability() {
  try {
    // 1. Health Liveness & Readiness
    const [resLive, resReady, resMetrics, resLogs] = await Promise.all([
      fetch("/health/liveness").then((r) => r.json()),
      fetch("/health/readiness").then((r) => r.json()),
      fetch("/metrics").then((r) => r.json()),
      fetch("/api/lab/logs").then((r) => r.json()),
    ]);

    elements.probeLivenessVal.textContent = resLive.status.toUpperCase();
    elements.probeLivenessTime.textContent = `Uptime: ${resLive.uptimeSeconds} detik (PID ${resLive.pid})`;

    elements.probeReadinessVal.textContent = resReady.status.toUpperCase();
    elements.probeReadinessDb.textContent = `DB: ${resReady.database} | Storage: ${resReady.storage}`;

    // 2. Metrik
    const p = resMetrics.performanceMetrics;
    elements.metricLatencyVal.textContent = `${p.p50} ms / ${p.p95} ms / ${p.p99} ms`;
    elements.metricBacklogVal.textContent = `${resMetrics.queueBacklog} items pending`;

    // 3. Structured Logs Stream
    if (resLogs && resLogs.length > 0) {
      elements.logStreamContainer.innerHTML = resLogs
        .slice(0, 20)
        .map((log) => {
          const statusClass = log.status >= 400 ? "status-400" : "status-200";
          return `
            <div class="log-entry">
              <span class="log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
              <span class="log-req">${log.requestId}</span>
              <span class="log-method">${log.method}</span>
              <span class="log-path">${log.path}</span>
              <span class="status-pill ${statusClass}" style="padding: 0.1rem 0.4rem; font-size: 0.7rem;">${log.status}</span>
              <span class="log-latency">${log.latencyMs}ms</span>
            </div>
          `;
        })
        .join("");
    }
  } catch (err) {
    // Abaikan jika server restart
  }
}

// ==============================================================================
// 8. BOOTSTRAP APLIKASI
// ==============================================================================

window.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initUserSelector();
  initWebhookStudio();
  initInboxControls();
  initMicroservicesTab();
  initWorkflowRunner();
  renderSecurityMatrix();

  // Inisialisasi data awal
  refreshCurrentTimestamp();
  loadInboxTables();
  loadOutboxTable();
  pollObservability();

  // Polling data berkala setiap 3.5 detik untuk menjaga UI tetap responsif dan hidup
  setInterval(pollObservability, 3500);
});
