const STORE_KEY = "motolog.logs.v1";
const TEMPLATE_KEY = "motolog.templates.v1";

const paymentLabels = {
  card: "카드",
  cash: "현금",
  transfer: "계좌이체",
  credit: "외상",
};

const state = {
  view: "home",
  editingId: null,
  detailId: null,
  paymentMethod: "card",
  search: "",
  plateImage: "",
  cameraStream: null,
};

function todayStr() {
  return new Date().toLocaleDateString("sv-SE");
}

function formatDate(date = new Date()) {
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function money(value) {
  return Number(value || 0).toLocaleString("ko-KR");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readJson(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "");
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function getLogs() {
  return readJson(STORE_KEY, []).sort((a, b) => {
    const byDate = String(b.workDate).localeCompare(String(a.workDate));
    if (byDate !== 0) return byDate;
    return Number(b.id) - Number(a.id);
  });
}

function saveLogs(logs) {
  localStorage.setItem(STORE_KEY, JSON.stringify(logs));
}

function getTemplates() {
  const existing = readJson(TEMPLATE_KEY, []);
  if (existing.length) return existing;
  const defaults = [
    { id: 1, label: "엔진오일 교체", content: "엔진오일 교체", amount: 45000, usage: 0 },
    { id: 2, label: "브레이크 패드", content: "앞 브레이크 패드 교체", amount: 80000, usage: 0 },
    { id: 3, label: "타이어 점검", content: "타이어 공기압 및 마모 상태 점검", amount: 0, usage: 0 },
  ];
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(defaults));
  return defaults;
}

function saveTemplates(templates) {
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates));
}

function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function normalizePlateText(text) {
  const raw = String(text || "");
  const compact = raw
    .toUpperCase()
    .replace(/[^\dA-Z가-힣]/g, "")
    .replace(/O/g, "0")
    .replace(/I/g, "1")
    .replace(/B/g, "8")
    .replace(/S/g, "5");
  const modern = compact.match(/\d{2,3}[가-힣]\d{4}/);
  if (modern) return modern[0];
  const legacy = compact.match(/[가-힣]{1,2}\d{4}/);
  if (legacy) return legacy[0];
  const spaced = raw.replace(/\s+/g, "");
  const motorcycle = spaced.match(/[가-힣]{1,2}\d{4}/);
  if (motorcycle) return motorcycle[0];
  const lastFour = compact.match(/\d{4}/);
  if (lastFour && compact.length <= 8) return lastFour[0];
  return "";
}

function isUsefulPlate(plate) {
  return /^(\d{2,3}[가-힣]\d{4}|[가-힣]{1,2}\d{4}|\d{4})$/.test(String(plate || ""));
}

function getVehicleHistory(vehicleNumber, excludeId = null) {
  const normalized = String(vehicleNumber || "").replace(/\s/g, "");
  if (!normalized) return [];
  return getLogs()
    .filter((log) => log.id !== excludeId && String(log.vehicleNumber || "").replace(/\s/g, "") === normalized)
    .slice(0, 5);
}

function renderVehicleHistory(vehicleNumber, excludeId = null) {
  const history = getVehicleHistory(vehicleNumber, excludeId);
  if (!vehicleNumber || !history.length) return "";
  const latest = history[0];
  const total = history.reduce((sum, log) => sum + Number(log.amount || 0), 0);
  return `
    <strong>이전 작업 ${history.length}건 발견</strong>
    <p>마지막 방문: ${latest.workDate}</p>
    <p>최근 작업: ${escapeHtml(latest.workContent).split("<br>")[0]}</p>
    <p>최근 ${history.length}건 합계: ${money(total)}원</p>
  `;
}

function setView(view, options = {}) {
  state.view = view;
  state.editingId = options.editingId ?? null;
  state.detailId = options.detailId ?? null;
  state.paymentMethod = options.paymentMethod ?? "card";
  window.scrollTo({ top: 0, behavior: "smooth" });
  render();
}

function statsForToday() {
  const today = todayStr();
  const rows = getLogs().filter((log) => log.workDate === today);
  return {
    count: rows.length,
    totalAmount: rows.reduce((sum, log) => sum + Number(log.amount || 0), 0),
    logs: rows,
  };
}

function paymentSummary(logs) {
  return logs.reduce(
    (acc, log) => {
      const amount = Number(log.amount || 0);
      acc[log.paymentMethod] += amount;
      acc.total += amount;
      return acc;
    },
    { card: 0, cash: 0, transfer: 0, credit: 0, total: 0 },
  );
}

function appShell(content) {
  return `
    <div class="shell">
      <header class="topbar">
        <div class="brand-title">
          <div class="brand-mark">🔧</div>
          <div>
            <h1>적자생존</h1>
            <p>오토바이 정비 작업 일지</p>
          </div>
        </div>
        <button class="text-button" data-action="seed">샘플 추가</button>
      </header>
      <main class="content">${content}</main>
      <nav class="bottom-nav">
        ${navButton("home", "⌂", "홈")}
        ${navButton("list", "☰", "목록")}
        ${navButton("new", "＋", "기록")}
        ${navButton("search", "⌕", "검색")}
        ${navButton("templates", "▤", "템플릿")}
      </nav>
      <div class="camera-modal" id="cameraModal" aria-hidden="true">
        <video class="camera-video" id="cameraVideo" autoplay playsinline muted></video>
        <div class="camera-tip"><strong>번호판만</strong> 프레임 안에 크게 맞추고<br>빛 반사를 피해 정면에서 촬영하세요.</div>
        <div class="camera-guide"></div>
        <div class="camera-controls">
          <button class="button" data-action="close-camera">닫기</button>
          <button class="button primary" data-action="capture-plate">촬영</button>
        </div>
      </div>
    </div>
  `;
}

function navButton(view, icon, label) {
  return `
    <button class="nav-item ${state.view === view ? "active" : ""}" data-view="${view}">
      <span class="icon">${icon}</span>
      <span>${label}</span>
    </button>
  `;
}

function logCard(log) {
  return `
    <button class="log-item" data-detail="${log.id}">
      <div class="log-main">
        <div>
          <div class="chip-row">
            <span class="chip">${escapeHtml(log.workDate)}</span>
            ${log.vehicleNumber ? `<span class="chip">${escapeHtml(log.vehicleNumber)}</span>` : ""}
            <span class="chip pay-${log.paymentMethod}">${paymentLabels[log.paymentMethod]}</span>
          </div>
          <p class="log-title">${escapeHtml(log.workContent).replaceAll("\n", "<br>")}</p>
        </div>
        <span class="amount">${money(log.amount)}원</span>
      </div>
    </button>
  `;
}

function emptyState(text) {
  return `<div class="empty">${text}</div>`;
}

function renderHome() {
  const stats = statsForToday();
  const summary = paymentSummary(stats.logs);
  return appShell(`
    <section class="hero">
      <div class="row">
        <div>
          <p class="eyebrow">Today</p>
          <p class="hero-date">${formatDate()}</p>
          <h2>오늘의 정비 현황</h2>
        </div>
        <div class="brand-mark">🔧</div>
      </div>
      <button class="primary-action" data-view="new">
        <span>새 정비 기록 작성</span>
        <span>→</span>
      </button>
    </section>

    <section class="stats">
      <div class="card">
        <p class="stat-label">오늘 작업</p>
        <p class="stat-value">${stats.count}<span style="font-size:16px"> 건</span></p>
      </div>
      <div class="card">
        <p class="stat-label">오늘 매출</p>
        <p class="stat-value money">${money(stats.totalAmount)}<span style="font-size:14px"> 원</span></p>
      </div>
    </section>

    ${stats.count ? `
      <section class="section">
        <div class="section-head"><h3>결제방식별 합계</h3></div>
        <div class="quick-grid">
          ${["transfer", "card", "cash", "credit"].map((key) => `
            <div class="card">
              <p class="stat-label">${paymentLabels[key]}</p>
              <p class="stat-value money" style="font-size:18px">${money(summary[key])}원</p>
            </div>
          `).join("")}
        </div>
      </section>
    ` : ""}

    <section class="section">
      <div class="section-head">
        <h3>빠른 메뉴</h3>
        <span class="muted" style="font-size:12px">자주 쓰는 작업</span>
      </div>
      <div class="quick-grid">
        ${quickCard("new", "＋", "작업 기록", "정비 내역 추가", true)}
        ${quickCard("list", "☰", "전체 목록", "누적 이력 확인")}
        ${quickCard("search", "⌕", "차량 검색", "번호/날짜 조회")}
        ${quickCard("export", "⇩", "CSV 내보내기", "월말 정산 자료")}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h3>오늘 작업</h3>
        <button class="text-button" data-view="list">전체 보기</button>
      </div>
      <div class="list">
        ${stats.logs.length ? stats.logs.slice(0, 5).map(logCard).join("") : emptyState("아직 오늘 기록이 없습니다. 새 정비 기록을 남겨보세요.")}
      </div>
    </section>
  `);
}

function quickCard(view, icon, label, sub, accent = false) {
  return `
    <button class="quick-card ${accent ? "accent" : ""}" data-view="${view}">
      <span class="quick-top"><span>${icon}</span><span>→</span></span>
      <span><strong>${label}</strong><span>${sub}</span></span>
    </button>
  `;
}

function renderForm() {
  const logs = getLogs();
  const editing = logs.find((log) => log.id === state.editingId);
  const templates = getTemplates();
  state.paymentMethod = editing?.paymentMethod ?? state.paymentMethod ?? "card";
  const historyHtml = renderVehicleHistory(editing?.vehicleNumber ?? "", editing?.id ?? null);

  return appShell(`
    <section class="section" style="margin-top:0">
      <div class="section-head">
        <h3>${editing ? "기록 수정" : "새 정비 기록"}</h3>
        <button class="text-button" data-view="home">취소</button>
      </div>
      <form class="form" id="logForm">
        <div class="plate-box">
          <div>
            <h4>번호판 자동 인식</h4>
            <p>번호판만 프레임에 꽉 차게 촬영하세요. 인식이 애매하면 자동 입력하지 않고 직접 입력을 도와드립니다.</p>
          </div>
          <div class="plate-actions">
            <button type="button" class="button" data-action="open-camera">카메라 열기</button>
            <button type="button" class="button" data-action="pick-plate">사진 불러오기</button>
          </div>
          <input id="plateFile" type="file" accept="image/*" capture="environment" hidden />
          <div class="plate-preview ${state.plateImage ? "show" : ""}" id="platePreview">
            ${state.plateImage ? `<img src="${state.plateImage}" alt="번호판 촬영 이미지">` : ""}
          </div>
          <button type="button" class="button primary" data-action="run-ocr">번호판 인식하기</button>
          <p id="ocrStatus">흔들림, 반사, 배경 글자가 있으면 마지막 4자리만 직접 입력하는 편이 더 빠를 수 있습니다.</p>
        </div>
        <div class="field">
          <label for="workDate">작업 날짜</label>
          <input class="input" id="workDate" name="workDate" type="date" value="${editing?.workDate ?? todayStr()}" />
        </div>
        <div class="field">
          <label for="vehicleNumber">차량 번호</label>
          <input class="input" id="vehicleNumber" name="vehicleNumber" placeholder="예: 12가3456" value="${escapeHtml(editing?.vehicleNumber ?? "")}" />
        </div>
        <div class="vehicle-history ${historyHtml ? "show" : ""}" id="vehicleHistory">${historyHtml}</div>
        <div class="field">
          <label for="workContent">작업 내용</label>
          <textarea class="textarea" id="workContent" name="workContent" placeholder="예: 엔진오일 교체, 앞 브레이크 패드 교체">${escapeHtml(editing?.workContent ?? "")}</textarea>
        </div>
        <div class="field">
          <label>템플릿 빠른 입력</label>
          <div class="chip-row">
            ${templates.map((template) => `
              <button type="button" class="chip" data-template="${template.id}">${escapeHtml(template.label)}</button>
            `).join("")}
          </div>
        </div>
        <div class="field">
          <label for="amount">금액</label>
          <input class="input" id="amount" name="amount" inputmode="numeric" placeholder="0" value="${editing ? money(editing.amount) : ""}" />
        </div>
        <div class="field">
          <label>결제 방식</label>
          <div class="segmented">
            ${Object.entries(paymentLabels).map(([key, label]) => `
              <button type="button" class="segment ${state.paymentMethod === key ? "active" : ""}" data-payment="${key}">${label}</button>
            `).join("")}
          </div>
        </div>
        <div class="field">
          <label for="ownerPhone">고객 연락처</label>
          <input class="input" id="ownerPhone" name="ownerPhone" placeholder="선택 입력" value="${escapeHtml(editing?.ownerPhone ?? "")}" />
        </div>
        <div class="form-actions">
          ${editing ? `<button type="button" class="button danger" data-delete="${editing.id}">삭제</button>` : `<button type="button" class="button" data-view="templates">템플릿 관리</button>`}
          <button type="submit" class="button primary">${editing ? "수정 저장" : "기록 저장"}</button>
        </div>
      </form>
    </section>
  `);
}

function renderList() {
  const logs = getLogs();
  return appShell(`
    <section class="section" style="margin-top:0">
      <div class="section-head">
        <h3>전체 목록</h3>
        <button class="text-button" data-view="new">새 기록</button>
      </div>
      <div class="list">
        ${logs.length ? logs.map(logCard).join("") : emptyState("저장된 정비 기록이 없습니다.")}
      </div>
    </section>
  `);
}

function renderSearch() {
  const query = state.search.trim().toLowerCase();
  const logs = query
    ? getLogs().filter((log) => [log.vehicleNumber, log.workContent, log.workDate, log.ownerPhone].some((value) => String(value || "").toLowerCase().includes(query)))
    : [];

  return appShell(`
    <section class="section" style="margin-top:0">
      <div class="section-head"><h3>검색</h3></div>
      <div class="filters">
        <input class="input" id="searchInput" placeholder="차량번호, 날짜, 작업내용 검색" value="${escapeHtml(state.search)}" />
        <button class="button" data-action="clear-search">초기화</button>
      </div>
      <div class="list">
        ${query ? (logs.length ? logs.map(logCard).join("") : emptyState("검색 결과가 없습니다.")) : emptyState("검색어를 입력하면 기록을 찾아드립니다.")}
      </div>
    </section>
  `);
}

function renderTemplates() {
  const templates = getTemplates();
  return appShell(`
    <section class="section" style="margin-top:0">
      <div class="section-head">
        <h3>작업 템플릿</h3>
        <button class="text-button" data-view="new">기록 작성</button>
      </div>
      <form class="form" id="templateForm">
        <div class="field">
          <label for="templateLabel">템플릿 이름</label>
          <input class="input" id="templateLabel" placeholder="예: 엔진오일 교체" />
        </div>
        <div class="field">
          <label for="templateContent">작업 내용</label>
          <textarea class="textarea" id="templateContent" placeholder="반복 입력할 작업 내용을 적어주세요."></textarea>
        </div>
        <div class="field">
          <label for="templateAmount">기본 금액</label>
          <input class="input" id="templateAmount" inputmode="numeric" placeholder="0" />
        </div>
        <button class="button primary" type="submit">템플릿 저장</button>
      </form>
      <div class="section">
        <div class="section-head"><h3>저장된 템플릿</h3></div>
        <div class="list">
          ${templates.length ? templates.map((template) => `
            <div class="log-item">
              <div class="log-main">
                <div>
                  <div class="chip-row"><span class="chip">${money(template.amount)}원</span><span class="chip">사용 ${template.usage ?? 0}회</span></div>
                  <p class="log-title"><strong>${escapeHtml(template.label)}</strong><br>${escapeHtml(template.content)}</p>
                </div>
                <button class="text-button" data-template-delete="${template.id}">삭제</button>
              </div>
            </div>
          `).join("") : emptyState("저장된 템플릿이 없습니다.")}
        </div>
      </div>
    </section>
  `);
}

function renderDetail() {
  const log = getLogs().find((item) => item.id === state.detailId);
  if (!log) return renderList();
  return appShell(`
    <section class="section" style="margin-top:0">
      <div class="section-head">
        <h3>기록 상세</h3>
        <button class="text-button" data-view="list">목록</button>
      </div>
      <div class="card detail">
        ${detailLine("작업 날짜", log.workDate)}
        ${detailLine("차량 번호", log.vehicleNumber || "-")}
        ${detailLine("작업 내용", escapeHtml(log.workContent).replaceAll("\n", "<br>"))}
        ${detailLine("금액", `${money(log.amount)}원`)}
        ${detailLine("결제 방식", paymentLabels[log.paymentMethod])}
        ${detailLine("고객 연락처", log.ownerPhone || "-")}
      </div>
      <div class="form-actions">
        <button class="button" data-view="list">목록으로</button>
        <button class="button primary" data-edit="${log.id}">수정하기</button>
      </div>
    </section>
  `);
}

function detailLine(label, value) {
  return `<div class="detail-line"><p>${label}</p><p>${value}</p></div>`;
}

function exportCsv() {
  const logs = getLogs();
  if (!logs.length) {
    showToast("내보낼 기록이 없습니다.");
    return;
  }
  const header = ["날짜", "차량번호", "작업내용", "금액", "결제방식", "연락처"];
  const rows = logs.map((log) => [
    log.workDate,
    log.vehicleNumber || "",
    log.workContent || "",
    log.amount || 0,
    paymentLabels[log.paymentMethod],
    log.ownerPhone || "",
  ]);
  const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `적자생존_정비기록_${todayStr()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function seedData() {
  const logs = getLogs();
  const id = Date.now();
  const samples = [
    {
      id,
      workDate: todayStr(),
      vehicleNumber: "12가3456",
      workContent: "엔진오일 교체\n체인 장력 점검",
      amount: 65000,
      paymentMethod: "card",
      ownerPhone: "010-1234-5678",
      createdAt: new Date().toISOString(),
    },
    {
      id: id + 1,
      workDate: todayStr(),
      vehicleNumber: "34나7890",
      workContent: "앞 브레이크 패드 교체",
      amount: 85000,
      paymentMethod: "transfer",
      ownerPhone: "",
      createdAt: new Date().toISOString(),
    },
  ];
  saveLogs([...samples, ...logs]);
  showToast("샘플 기록을 추가했습니다.");
  render();
}

function handleLogSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const workContent = String(data.get("workContent") || "").trim();
  const amount = Number(String(data.get("amount") || "0").replaceAll(",", ""));
  if (!workContent) {
    showToast("작업 내용을 입력해주세요.");
    return;
  }
  if (Number.isNaN(amount) || amount < 0) {
    showToast("올바른 금액을 입력해주세요.");
    return;
  }

  const logs = getLogs();
  const next = {
    id: state.editingId ?? Date.now(),
    workDate: String(data.get("workDate") || todayStr()),
    vehicleNumber: String(data.get("vehicleNumber") || "").trim(),
    workContent,
    amount,
    paymentMethod: state.paymentMethod,
    ownerPhone: String(data.get("ownerPhone") || "").trim(),
    createdAt: new Date().toISOString(),
  };

  if (state.editingId) {
    saveLogs(logs.map((log) => (log.id === state.editingId ? next : log)));
    showToast("기록을 수정했습니다.");
  } else {
    saveLogs([next, ...logs]);
    showToast("작업이 기록되었습니다.");
  }
  setView("home");
}

function handleTemplateSubmit(event) {
  event.preventDefault();
  const label = document.querySelector("#templateLabel").value.trim();
  const content = document.querySelector("#templateContent").value.trim();
  const amount = Number(document.querySelector("#templateAmount").value.replaceAll(",", "") || 0);
  if (!label || !content) {
    showToast("템플릿 이름과 내용을 입력해주세요.");
    return;
  }
  saveTemplates([{ id: Date.now(), label, content, amount, usage: 0 }, ...getTemplates()]);
  showToast("템플릿을 저장했습니다.");
  render();
}

function setOcrStatus(message) {
  const status = document.querySelector("#ocrStatus");
  if (status) status.textContent = message;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function preparePlateImage(dataUrl) {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const maxWidth = 1200;
  const scale = Math.min(1, maxWidth / image.width);
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const contrast = gray > 142 ? 255 : 0;
    data[i] = contrast;
    data[i + 1] = contrast;
    data[i + 2] = contrast;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.onload = () => resolve(window.Tesseract);
    script.onerror = () => reject(new Error("OCR 엔진을 불러오지 못했습니다."));
    document.head.appendChild(script);
  });
}

async function runPlateOcr() {
  if (!state.plateImage) {
    showToast("먼저 번호판 사진을 촬영하거나 불러오세요.");
    return;
  }
  try {
    setOcrStatus("OCR 엔진을 준비하는 중입니다...");
    const Tesseract = await loadTesseract();
    const canvas = await preparePlateImage(state.plateImage);
    setOcrStatus("번호판을 읽는 중입니다. 잠시만 기다려주세요.");
    const result = await Tesseract.recognize(canvas, "kor+eng", {
      logger: (info) => {
        if (info.status === "recognizing text") {
          setOcrStatus(`번호판 인식 중... ${Math.round((info.progress || 0) * 100)}%`);
        }
      },
    });
    const plate = normalizePlateText(result?.data?.text || "");
    if (!isUsefulPlate(plate)) {
      setOcrStatus("번호판으로 확정하기 어려워 자동 입력하지 않았습니다. 차량 번호 칸에 직접 입력해주세요.");
      document.querySelector("#vehicleNumber")?.focus();
      return;
    }
    const input = document.querySelector("#vehicleNumber");
    input.value = plate;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    setOcrStatus(`인식 결과: ${plate}`);
    showToast(`번호판 인식: ${plate}`);
  } catch (error) {
    setOcrStatus("OCR 실행에 실패했습니다. 사진을 보고 직접 입력해주세요.");
    showToast(error.message || "번호판 인식에 실패했습니다.");
  }
}

async function openCamera() {
  const modal = document.querySelector("#cameraModal");
  const video = document.querySelector("#cameraVideo");
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast("이 브라우저에서는 카메라 직접 실행을 지원하지 않습니다.");
    document.querySelector("#plateFile")?.click();
    return;
  }
  try {
    state.cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    video.srcObject = state.cameraStream;
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
  } catch {
    showToast("카메라 권한이 필요합니다. 사진 불러오기로 대신 진행하세요.");
  }
}

function closeCamera() {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach((track) => track.stop());
    state.cameraStream = null;
  }
  const modal = document.querySelector("#cameraModal");
  modal?.classList.remove("show");
  modal?.setAttribute("aria-hidden", "true");
}

function capturePlate() {
  const video = document.querySelector("#cameraVideo");
  if (!video?.videoWidth) return;
  const canvas = document.createElement("canvas");
  const cropWidth = Math.round(video.videoWidth * 0.74);
  const cropHeight = Math.round(cropWidth / 1.75);
  const sx = Math.round((video.videoWidth - cropWidth) / 2);
  const sy = Math.round(video.videoHeight * 0.42 - cropHeight / 2);
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  canvas.getContext("2d").drawImage(video, sx, Math.max(0, sy), cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  state.plateImage = canvas.toDataURL("image/jpeg", 0.92);
  closeCamera();
  render();
  setOcrStatus("촬영 완료. 번호판 인식하기를 눌러주세요.");
}

function updateVehicleHistory() {
  const input = document.querySelector("#vehicleNumber");
  const box = document.querySelector("#vehicleHistory");
  if (!input || !box) return;
  const html = renderVehicleHistory(input.value, state.editingId);
  box.innerHTML = html;
  box.classList.toggle("show", Boolean(html));
}

function attachEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.view;
      if (view === "export") exportCsv();
      else setView(view);
    });
  });

  document.querySelectorAll("[data-detail]").forEach((button) => {
    button.addEventListener("click", () => setView("detail", { detailId: Number(button.dataset.detail) }));
  });

  document.querySelectorAll("[data-edit]").forEach((button) => {
    const id = Number(button.dataset.edit);
    const log = getLogs().find((item) => item.id === id);
    button.addEventListener("click", () => setView("new", { editingId: id, paymentMethod: log?.paymentMethod ?? "card" }));
  });

  document.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.delete);
      if (!confirm("이 기록을 삭제할까요?")) return;
      saveLogs(getLogs().filter((log) => log.id !== id));
      showToast("기록을 삭제했습니다.");
      setView("list");
    });
  });

  document.querySelectorAll("[data-payment]").forEach((button) => {
    button.addEventListener("click", () => {
      state.paymentMethod = button.dataset.payment;
      document.querySelectorAll("[data-payment]").forEach((el) => el.classList.toggle("active", el === button));
    });
  });

  document.querySelectorAll("[data-template]").forEach((button) => {
    button.addEventListener("click", () => {
      const template = getTemplates().find((item) => item.id === Number(button.dataset.template));
      if (!template) return;
      const content = document.querySelector("#workContent");
      const amount = document.querySelector("#amount");
      content.value = content.value.trim() ? `${content.value.trim()}\n${template.content}` : template.content;
      if (template.amount) {
        const current = Number(amount.value.replaceAll(",", "") || 0);
        amount.value = money(current + Number(template.amount));
      }
      saveTemplates(getTemplates().map((item) => item.id === template.id ? { ...item, usage: (item.usage ?? 0) + 1 } : item));
      showToast("템플릿을 적용했습니다.");
    });
  });

  document.querySelectorAll("[data-template-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      saveTemplates(getTemplates().filter((template) => template.id !== Number(button.dataset.templateDelete)));
      showToast("템플릿을 삭제했습니다.");
      render();
    });
  });

  const form = document.querySelector("#logForm");
  if (form) form.addEventListener("submit", handleLogSubmit);

  const templateForm = document.querySelector("#templateForm");
  if (templateForm) templateForm.addEventListener("submit", handleTemplateSubmit);

  const searchInput = document.querySelector("#searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      state.search = event.target.value;
      render();
      const nextInput = document.querySelector("#searchInput");
      nextInput.focus();
      nextInput.setSelectionRange(state.search.length, state.search.length);
    });
  }

  const clearSearch = document.querySelector("[data-action='clear-search']");
  if (clearSearch) clearSearch.addEventListener("click", () => { state.search = ""; render(); });

  const seed = document.querySelector("[data-action='seed']");
  if (seed) seed.addEventListener("click", seedData);

  const openCameraButton = document.querySelector("[data-action='open-camera']");
  if (openCameraButton) openCameraButton.addEventListener("click", openCamera);

  const closeCameraButton = document.querySelector("[data-action='close-camera']");
  if (closeCameraButton) closeCameraButton.addEventListener("click", closeCamera);

  const captureButton = document.querySelector("[data-action='capture-plate']");
  if (captureButton) captureButton.addEventListener("click", capturePlate);

  const pickPlate = document.querySelector("[data-action='pick-plate']");
  if (pickPlate) pickPlate.addEventListener("click", () => document.querySelector("#plateFile")?.click());

  const plateFile = document.querySelector("#plateFile");
  if (plateFile) {
    plateFile.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        state.plateImage = String(reader.result || "");
        render();
        setOcrStatus("사진을 불러왔습니다. 번호판 인식하기를 눌러주세요.");
      };
      reader.readAsDataURL(file);
    });
  }

  const runOcr = document.querySelector("[data-action='run-ocr']");
  if (runOcr) runOcr.addEventListener("click", runPlateOcr);

  const vehicleInput = document.querySelector("#vehicleNumber");
  if (vehicleInput) vehicleInput.addEventListener("input", updateVehicleHistory);
}

function render() {
  const app = document.querySelector("#app");
  if (state.view === "home") app.innerHTML = renderHome();
  if (state.view === "new") app.innerHTML = renderForm();
  if (state.view === "list") app.innerHTML = renderList();
  if (state.view === "search") app.innerHTML = renderSearch();
  if (state.view === "templates") app.innerHTML = renderTemplates();
  if (state.view === "detail") app.innerHTML = renderDetail();
  attachEvents();
}

render();
