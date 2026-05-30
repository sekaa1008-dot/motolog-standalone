const STORE_KEY = "motolog.logs.v1";
const TEMPLATE_KEY = "motolog.templates.v1";
const TEMPLATE_SEED_KEY = "motolog.templates.estimate.20260530";
const INVENTORY_KEY = "motolog.inventory.v1";

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
  editingTemplateId: null,
  editingInventoryId: null,
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

function estimateTemplates() {
  return [
    {
      id: "estimate-proza350-full",
      label: "프로자350 견적 전체",
      content: [
        "엔진오일 교체",
        "오일필터 교체",
        "에어필터 교체",
        "점화플러그 교체",
        "미션오일 교체",
        "피렐리 뒷타이어 150/70-14 교체",
        "피렐리 앞타이어 120/70-15 교체",
        "사이드스탠드 교체",
        "브레이크 좌우 위치 변경",
        "사이드스탠드 발판 장착",
        "머플러 가스켓 누기 확인 - 다음 방문 서비스 수리",
      ].join("\n"),
      amount: 475000,
      usage: 0,
    },
    { id: "estimate-engine-oil", label: "견적 엔진오일", content: "엔진오일 교체", amount: 15000, usage: 0 },
    { id: "estimate-oil-filter", label: "견적 오일필터", content: "오일필터 교체", amount: 25000, usage: 0 },
    { id: "estimate-air-filter", label: "견적 에어필터", content: "에어필터 교체", amount: 25000, usage: 0 },
    { id: "estimate-spark-plug", label: "견적 점화플러그", content: "점화플러그 교체", amount: 30000, usage: 0 },
    { id: "estimate-mission-oil", label: "견적 미션오일", content: "미션오일 교체", amount: 20000, usage: 0 },
    { id: "estimate-rear-tire", label: "견적 피렐리 뒷타이어", content: "피렐리 뒷타이어 150/70-14 교체", amount: 150000, usage: 0 },
    { id: "estimate-front-tire", label: "견적 피렐리 앞타이어", content: "피렐리 앞타이어 120/70-15 교체", amount: 130000, usage: 0 },
    { id: "estimate-side-stand", label: "견적 사이드스탠드", content: "사이드스탠드 교체", amount: 50000, usage: 0 },
    { id: "estimate-brake-position", label: "견적 브레이크 좌우변경", content: "브레이크 좌우 위치 변경", amount: 30000, usage: 0 },
    { id: "estimate-stand-foot", label: "견적 사이드스탠드 발판", content: "사이드스탠드 발판 장착", amount: 20000, usage: 0 },
    { id: "estimate-muffler-gasket", label: "견적 머플러 가스켓", content: "머플러 가스켓 누기 확인 - 다음 방문 서비스 수리", amount: 0, usage: 0 },
  ];
}

function mergeEstimateTemplates(templates) {
  if (localStorage.getItem(TEMPLATE_SEED_KEY)) return templates;
  const seen = new Set(templates.map((template) => normalizeText(template.label)));
  const additions = estimateTemplates().filter((template) => !seen.has(normalizeText(template.label)));
  const next = [...additions, ...templates];
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(next));
  localStorage.setItem(TEMPLATE_SEED_KEY, "done");
  return next;
}

function getTemplates() {
  const existing = readJson(TEMPLATE_KEY, []);
  if (existing.length) return mergeEstimateTemplates(existing);
  const defaults = [
    { id: 1, label: "엔진오일 교체", content: "엔진오일 교체", amount: 45000, usage: 0 },
    { id: 2, label: "브레이크 패드", content: "앞 브레이크 패드 교체", amount: 80000, usage: 0 },
    { id: 3, label: "타이어 점검", content: "타이어 공기압 및 마모 상태 점검", amount: 0, usage: 0 },
    ...estimateTemplates(),
  ];
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(defaults));
  localStorage.setItem(TEMPLATE_SEED_KEY, "done");
  return defaults;
}

function saveTemplates(templates) {
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates));
}

function getInventory() {
  const raw = localStorage.getItem(INVENTORY_KEY);
  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  const defaults = [
    {
      id: 1,
      name: "미쉐린 130/70-13 타이어",
      keywords: "타이어 교체, 미쉐린, 130/70-13",
      model: "PCX, NMAX 등 직접 확인",
      location: "A-1",
      quantity: 2,
      minQuantity: 1,
      unit: "개",
    },
    {
      id: 2,
      name: "엔진오일 1L",
      keywords: "엔진오일, 오일 교체",
      model: "스쿠터 공용",
      location: "B-1",
      quantity: 8,
      minQuantity: 3,
      unit: "통",
    },
  ];
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(defaults));
  return defaults;
}

function saveInventory(items) {
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(items));
}

function stockClass(item) {
  const quantity = Number(item.quantity || 0);
  const min = Number(item.minQuantity || 0);
  if (quantity <= 0) return "stock-danger";
  if (quantity <= min) return "stock-warning";
  return "stock-ok";
}

function numberFromInput(value) {
  return Number(String(value || "0").replaceAll(",", ""));
}

function partsForFormData(data, inventory) {
  return inventory
    .map((item) => {
      const quantity = numberFromInput(data.get(`part-${item.id}`));
      if (!quantity || quantity <= 0 || Number.isNaN(quantity)) return null;
      return {
        inventoryId: item.id,
        name: item.name,
        quantity,
        unit: item.unit || "개",
      };
    })
    .filter(Boolean);
}

function applyInventoryForLogChange(previousLog, nextLog) {
  const items = getInventory().map((item) => ({ ...item }));
  const apply = (part, direction) => {
    const item = items.find((candidate) => candidate.id === part.inventoryId);
    if (!item) return;
    item.quantity = Math.max(0, Number(item.quantity || 0) + direction * Number(part.quantity || 0));
  };
  for (const part of previousLog?.partsUsed || []) apply(part, 1);
  for (const part of nextLog?.partsUsed || []) apply(part, -1);
  saveInventory(items);
  return items;
}

function stockWarningText(items = getInventory()) {
  const low = items.filter((item) => Number(item.quantity || 0) <= Number(item.minQuantity || 0));
  if (!low.length) return "";
  return ` 재고 경고: ${low.slice(0, 2).map((item) => item.name).join(", ")}`;
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/\s/g, "");
}

function inventoryMatchKeywords(item) {
  const explicit = String(item.keywords || "")
    .split(",")
    .map((keyword) => normalizeText(keyword))
    .filter(Boolean);
  const nameWords = String(item.name || "")
    .split(/[\s,/()-]+/)
    .map((word) => normalizeText(word))
    .filter((word) => word.length >= 2 && Number.isNaN(Number(word)));
  return [...new Set([...explicit, ...nameWords])];
}

function suggestedPartsForText(text, inventory = getInventory()) {
  const normalized = normalizeText(text);
  if (!/(교체|교환|장착|사용|투입|보충)/.test(normalized)) return [];
  return inventory.filter((item) => inventoryMatchKeywords(item).some((keyword) => normalized.includes(keyword)));
}

function autoFillPartsFromWorkText(text, options = {}) {
  const matches = suggestedPartsForText(text);
  let applied = 0;
  for (const item of matches) {
    const input = document.querySelector(`[name="part-${item.id}"]`);
    if (!input || numberFromInput(input.value) > 0) continue;
    input.value = "1";
    input.dataset.autoFilled = "true";
    applied += 1;
  }
  if (applied && !options.silent) showToast(`재고 ${applied}개 품목을 자동 입력했습니다.`);
  return applied;
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

function cleanPlateText(text) {
  const compact = String(text || "")
    .toUpperCase()
    .replaceAll("O", "0")
    .replaceAll("I", "1")
    .replaceAll("|", "1")
    .replace(/[^\dA-Z가-힣]/g, "");
  const carPlate = compact.match(/\d{2,3}[가-힣]\d{4}/);
  if (carPlate) return carPlate[0];
  const bikePlate = compact.match(/(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[가-힣]{1,6}\d{4}/);
  if (bikePlate) return bikePlate[0];
  const lastFour = compact.match(/\d{4}/);
  return lastFour ? lastFour[0] : "";
}

function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (window.tesseractLoading) return window.tesseractLoading;
  window.tesseractLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.onload = () => resolve(window.Tesseract);
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return window.tesseractLoading;
}

async function scanPlateFromPhoto(dataUrl) {
  if (!dataUrl) return;
  const vehicleInput = document.querySelector("#vehicleNumber");
  if (!vehicleInput || vehicleInput.value.trim()) return;
  const status = document.querySelector("#plateScanStatus");
  if (status) status.textContent = "번호판을 읽는 중입니다...";
  try {
    const tesseract = await loadTesseract();
    const result = await tesseract.recognize(dataUrl, "kor+eng");
    const plate = cleanPlateText(result?.data?.text || "");
    if (plate) {
      vehicleInput.value = plate;
      updateVehicleHistory();
      if (status) status.textContent = `인식 결과: ${plate}`;
      showToast("차량번호를 자동 입력했습니다.");
    } else {
      if (status) status.textContent = "자동 인식이 어려워 수동 입력이 필요합니다.";
    }
  } catch {
    if (status) status.textContent = "자동 인식을 사용할 수 없습니다. 수동 입력해주세요.";
  }
}

function setView(view, options = {}) {
  state.view = view;
  state.editingId = options.editingId ?? null;
  state.detailId = options.detailId ?? null;
  state.paymentMethod = options.paymentMethod ?? "card";
  state.editingTemplateId = options.editingTemplateId ?? null;
  state.editingInventoryId = options.editingInventoryId ?? null;
  window.scrollTo({ top: 0, behavior: "smooth" });
  render();
}

function openPhotoCamera() {
  document.querySelector("#photoCameraFile")?.click();
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

function partsSummary(logs) {
  const totals = new Map();
  for (const log of logs) {
    for (const part of log.partsUsed || []) {
      const prev = totals.get(part.name) || { name: part.name, quantity: 0, unit: part.unit || "개" };
      prev.quantity += Number(part.quantity || 0);
      if (part.unit) prev.unit = part.unit;
      totals.set(part.name, prev);
    }
  }
  return [...totals.values()].sort((a, b) => b.quantity - a.quantity);
}

function appShell(content) {
  const canInstall = Boolean(window.installPromptEvent) && !window.matchMedia("(display-mode: standalone)").matches;
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
        <div class="top-actions">
          ${canInstall ? `<button class="text-button" data-action="install-app">앱 설치</button>` : ""}
          <button class="text-button" data-action="seed">샘플 추가</button>
        </div>
      </header>
      <main class="content">${content}</main>
      <nav class="bottom-nav">
        ${navButton("home", "⌂", "홈")}
        ${navButton("list", "☰", "목록")}
        ${navButton("new", "＋", "기록")}
        ${navButton("search", "⌕", "검색")}
        ${navButton("inventory", "▦", "재고")}
      </nav>
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
    <div class="log-item">
      <button class="log-open" data-detail="${log.id}">
        <div>
          <div class="chip-row">
            <span class="chip">${escapeHtml(log.workDate)}</span>
            ${log.vehicleNumber ? `<span class="chip">${escapeHtml(log.vehicleNumber)}</span>` : ""}
            <span class="chip pay-${log.paymentMethod}">${paymentLabels[log.paymentMethod]}</span>
          </div>
          <p class="log-title">${escapeHtml(log.workContent).replaceAll("\n", "<br>")}</p>
        </div>
        <span class="amount">${money(log.amount)}원</span>
      </button>
      <div class="list-actions">
        <button class="text-button" data-edit="${log.id}">수정</button>
        <button class="text-button danger-text" data-delete="${log.id}">삭제</button>
      </div>
    </div>
  `;
}

function emptyState(text) {
  return `<div class="empty">${text}</div>`;
}

function renderHome() {
  const stats = statsForToday();
  const summary = paymentSummary(stats.logs);
  const parts = partsSummary(stats.logs);
  const lowStock = getInventory().filter((item) => Number(item.quantity || 0) <= Number(item.minQuantity || 0));
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
        <div class="section-head"><h3>일일 마감 요약</h3></div>
        <div class="quick-grid">
          ${["transfer", "card", "cash", "credit"].map((key) => `
            <div class="card">
              <p class="stat-label">${paymentLabels[key]}</p>
              <p class="stat-value money" style="font-size:18px">${money(summary[key])}원</p>
            </div>
          `).join("")}
        </div>
        ${parts.length ? `
          <div class="list" style="margin-top:12px">
            ${parts.slice(0, 5).map((part) => `
              <div class="summary-row">
                <span>${escapeHtml(part.name)}</span>
                <strong>${money(part.quantity)}${escapeHtml(part.unit)}</strong>
              </div>
            `).join("")}
          </div>
        ` : ""}
      </section>
    ` : ""}

    ${lowStock.length ? `
      <section class="section">
        <div class="section-head">
          <h3>재고 경고</h3>
          <button class="text-button" data-view="inventory">재고 보기</button>
        </div>
        <div class="list">
          ${lowStock.slice(0, 4).map((item) => `
            <div class="stock-card ${stockClass(item)}">
              <strong>${escapeHtml(item.name)}</strong>
              <span>${money(item.quantity)}${escapeHtml(item.unit || "개")} 남음 · ${escapeHtml(item.location || "위치 미지정")}</span>
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
        ${quickCard("inventory", "▦", "재고 관리", "부품 수량 확인")}
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
  const inventory = getInventory();
  const usedParts = new Map((editing?.partsUsed || []).map((part) => [part.inventoryId, part]));
  state.paymentMethod = editing?.paymentMethod ?? state.paymentMethod ?? "card";
  const historyHtml = renderVehicleHistory(editing?.vehicleNumber ?? "", editing?.id ?? null);

  return appShell(`
    <section class="section" style="margin-top:0">
      <div class="section-head">
        <h3>${editing ? "기록 수정" : "새 정비 기록"}</h3>
        <button class="text-button" data-view="home">취소</button>
      </div>
      <form class="form" id="logForm">
        <div class="field">
          <label for="workDate">작업 날짜</label>
          <input class="input" id="workDate" name="workDate" type="date" value="${editing?.workDate ?? todayStr()}" />
        </div>
        <div class="photo-box">
          <div>
            <h4>작업 사진</h4>
            <p>먼저 번호판이나 작업 부위를 찍어두면, 나중에 차량번호와 작업 내용을 확인하기 쉽습니다.</p>
          </div>
          <div class="photo-actions">
            <button type="button" class="button primary" data-action="take-photo">카메라 촬영</button>
            <button type="button" class="button" data-action="choose-photo">갤러리 선택</button>
          </div>
          <input id="photoCameraFile" type="file" accept="image/*" capture="environment" hidden />
          <input id="photoGalleryFile" type="file" accept="image/*" hidden />
          <input id="photoDataUrl" name="photoDataUrl" type="hidden" value="${escapeHtml(editing?.photoDataUrl ?? "")}" />
          <div class="photo-preview ${editing?.photoDataUrl ? "show" : ""}" id="photoPreview">
            ${editing?.photoDataUrl ? `<img src="${editing.photoDataUrl}" alt="작업 사진">` : ""}
          </div>
          <p class="scan-status" id="plateScanStatus">${editing?.photoDataUrl && !editing?.vehicleNumber ? "사진에서 번호판 자동 인식을 시도할 수 있습니다." : ""}</p>
          <button type="button" class="button danger ${editing?.photoDataUrl ? "" : "hidden"}" id="removePhotoButton" data-action="remove-photo">사진 삭제</button>
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
        <div class="form-actions quick-save-actions">
          ${editing ? `<button type="button" class="button danger" data-delete="${editing.id}">삭제</button>` : `<button type="button" class="button" data-view="templates">템플릿 관리</button>`}
          <button type="submit" class="button primary">${editing ? "수정 저장" : "기록 저장"}</button>
        </div>
        <div class="field">
          <label>사용 부품 / 재고 차감</label>
          <p class="field-help">작업 내용에 재고 키워드와 교체/장착/사용/보충이 함께 있으면 1개가 자동 입력됩니다.</p>
          <div class="inventory-pick-list">
            ${inventory.length ? inventory.map((item) => {
              const used = usedParts.get(item.id);
              return `
                <div class="inventory-pick ${stockClass(item)}">
                  <div>
                    <strong>${escapeHtml(item.name)}</strong>
                    <span>${money(item.quantity)}${escapeHtml(item.unit || "개")} 보유 · ${escapeHtml(item.location || "위치 미지정")}</span>
                  </div>
                  <div class="part-stepper" aria-label="${escapeHtml(item.name)} 사용 수량">
                    <button type="button" class="step-button" data-part-step="${item.id}" data-step="-1">−</button>
                    <input class="input part-qty" name="part-${item.id}" inputmode="numeric" placeholder="0" value="${used?.quantity ?? ""}" aria-label="${escapeHtml(item.name)} 사용 수량" />
                    <button type="button" class="step-button" data-part-step="${item.id}" data-step="1">+</button>
                  </div>
                </div>
              `;
            }).join("") : `<div class="empty">등록된 재고가 없습니다. 재고 메뉴에서 품목을 추가하세요.</div>`}
          </div>
        </div>
        <div class="field">
          <label for="ownerPhone">고객 연락처</label>
          <input class="input" id="ownerPhone" name="ownerPhone" placeholder="선택 입력" value="${escapeHtml(editing?.ownerPhone ?? "")}" />
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
  const digits = query.replace(/\D/g, "");
  const logs = query
    ? getLogs().filter((log) => {
        const vehicle = String(log.vehicleNumber || "").toLowerCase();
        const vehicleDigits = vehicle.replace(/\D/g, "");
        const backFourMatch = digits.length >= 4 && vehicleDigits.endsWith(digits.slice(-4));
        return backFourMatch || [log.vehicleNumber, log.workContent, log.workDate, log.ownerPhone].some((value) => String(value || "").toLowerCase().includes(query));
      })
    : [];

  return appShell(`
    <section class="section" style="margin-top:0">
      <div class="section-head"><h3>검색</h3></div>
      <div class="filters">
        <input class="input" id="searchInput" placeholder="뒤 4자리, 차량번호, 날짜, 작업내용 검색" value="${escapeHtml(state.search)}" />
        <button class="button" data-action="clear-search">초기화</button>
      </div>
      <div class="list">
        ${query ? (logs.length ? logs.map(logCard).join("") : emptyState("검색 결과가 없습니다.")) : emptyState("차량번호 뒤 4자리만 입력해도 검색됩니다.")}
      </div>
    </section>
  `);
}

function renderTemplates() {
  const templates = getTemplates();
  const editingTemplate = templates.find((template) => template.id === state.editingTemplateId);
  return appShell(`
    <section class="section" style="margin-top:0">
      <div class="section-head">
        <h3>${editingTemplate ? "템플릿 수정" : "작업 템플릿"}</h3>
        <button class="text-button" data-view="new">기록 작성</button>
      </div>
      <form class="form" id="templateForm">
        <div class="field">
          <label for="templateLabel">템플릿 이름</label>
          <input class="input" id="templateLabel" placeholder="예: 엔진오일 교체" value="${escapeHtml(editingTemplate?.label ?? "")}" />
        </div>
        <div class="field">
          <label for="templateContent">작업 내용</label>
          <textarea class="textarea" id="templateContent" placeholder="반복 입력할 작업 내용을 적어주세요.">${escapeHtml(editingTemplate?.content ?? "")}</textarea>
        </div>
        <div class="field">
          <label for="templateAmount">기본 금액</label>
          <input class="input" id="templateAmount" inputmode="numeric" placeholder="0" value="${editingTemplate?.amount ? money(editingTemplate.amount) : ""}" />
        </div>
        <div class="form-actions">
          ${editingTemplate ? `<button class="button" type="button" data-action="cancel-template-edit">수정 취소</button>` : `<button class="button" type="button" data-action="clear-template-form">입력 지우기</button>`}
          <button class="button primary" type="submit">${editingTemplate ? "수정 저장" : "템플릿 저장"}</button>
        </div>
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
                <div class="item-actions">
                  <button class="text-button" data-template-edit="${template.id}">수정</button>
                  <button class="text-button danger-text" data-template-delete="${template.id}">삭제</button>
                </div>
              </div>
            </div>
          `).join("") : emptyState("저장된 템플릿이 없습니다.")}
        </div>
      </div>
    </section>
  `);
}

function renderInventory() {
  const inventory = getInventory();
  const editing = inventory.find((item) => item.id === state.editingInventoryId);
  const lowCount = inventory.filter((item) => Number(item.quantity || 0) <= Number(item.minQuantity || 0)).length;
  return appShell(`
    <section class="section" style="margin-top:0">
      <div class="section-head">
        <h3>${editing ? "재고 수정" : "재고 관리"}</h3>
        <button class="text-button" data-view="new">기록 작성</button>
      </div>
      <div class="stock-status ${lowCount ? "stock-warning" : "stock-ok"}">
        <strong>${lowCount ? `확인 필요 재고 ${lowCount}개` : "재고 상태 정상"}</strong>
        <span>정비 기록에서 사용 수량을 입력하면 자동으로 차감됩니다.</span>
      </div>
      <form class="form" id="inventoryForm">
        <div class="field">
          <label for="inventoryName">부품명</label>
          <input class="input" id="inventoryName" placeholder="예: 미쉐린 130/70-13 타이어" value="${escapeHtml(editing?.name ?? "")}" />
        </div>
        <div class="field">
          <label for="inventoryModel">적용 모델</label>
          <input class="input" id="inventoryModel" placeholder="예: PCX, NMAX, 직접 확인" value="${escapeHtml(editing?.model ?? "")}" />
        </div>
        <div class="field">
          <label for="inventoryKeywords">자동 차감 키워드</label>
          <input class="input" id="inventoryKeywords" placeholder="예: 엔진오일, 오일 교체" value="${escapeHtml(editing?.keywords ?? "")}" />
        </div>
        <div class="field">
          <label for="inventoryLocation">보관 위치</label>
          <input class="input" id="inventoryLocation" placeholder="예: A-1" value="${escapeHtml(editing?.location ?? "")}" />
        </div>
        <div class="split-fields">
          <div class="field">
            <label for="inventoryQuantity">현재 수량</label>
            <input class="input" id="inventoryQuantity" inputmode="numeric" placeholder="0" value="${editing ? money(editing.quantity) : ""}" />
          </div>
          <div class="field">
            <label for="inventoryMinQuantity">경고 수량</label>
            <input class="input" id="inventoryMinQuantity" inputmode="numeric" placeholder="1" value="${editing ? money(editing.minQuantity) : "1"}" />
          </div>
        </div>
        <div class="field">
          <label for="inventoryUnit">단위</label>
          <input class="input" id="inventoryUnit" placeholder="예: 개, 통, 세트" value="${escapeHtml(editing?.unit ?? "개")}" />
        </div>
        <div class="form-actions">
          ${editing ? `<button class="button" type="button" data-action="cancel-inventory-edit">수정 취소</button>` : `<button class="button" type="button" data-action="clear-inventory-form">입력 지우기</button>`}
          <button class="button primary" type="submit">${editing ? "수정 저장" : "재고 저장"}</button>
        </div>
      </form>
      <div class="section">
        <div class="section-head"><h3>등록된 재고</h3></div>
        <div class="list">
          ${inventory.length ? inventory.map((item) => `
            <div class="stock-card ${stockClass(item)}">
              <div class="stock-card-head">
                <div>
                  <strong>${escapeHtml(item.name)}</strong>
                  <span>${escapeHtml(item.model || "적용 모델 미입력")}</span>
                </div>
                <strong class="stock-count">${money(item.quantity)}${escapeHtml(item.unit || "개")}</strong>
              </div>
              <div class="inventory-meta">
                <span>위치 ${escapeHtml(item.location || "미지정")}</span>
                <span>경고 ${money(item.minQuantity)}${escapeHtml(item.unit || "개")} 이하</span>
                ${item.keywords ? `<span>키워드 ${escapeHtml(item.keywords)}</span>` : ""}
              </div>
              <div class="item-actions">
                <button class="text-button" data-inventory-edit="${item.id}">수정</button>
                <button class="text-button danger-text" data-inventory-delete="${item.id}">삭제</button>
              </div>
            </div>
          `).join("") : emptyState("등록된 재고가 없습니다.")}
        </div>
      </div>
    </section>
  `);
}

function renderDetail() {
  const log = getLogs().find((item) => item.id === state.detailId);
  if (!log) return renderList();
  const partsText = (log.partsUsed || []).map((part) => `${escapeHtml(part.name)} ${money(part.quantity)}${escapeHtml(part.unit || "개")}`).join("<br>");
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
        ${partsText ? detailLine("사용 부품", partsText) : ""}
        ${detailLine("금액", `${money(log.amount)}원`)}
        ${detailLine("결제 방식", paymentLabels[log.paymentMethod])}
        ${detailLine("고객 연락처", log.ownerPhone || "-")}
        ${log.photoDataUrl ? `<div class="detail-line"><p>작업 사진</p><img class="detail-photo" src="${log.photoDataUrl}" alt="작업 사진"></div>` : ""}
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
  const header = ["날짜", "차량번호", "작업내용", "사용부품", "금액", "결제방식", "연락처"];
  const rows = logs.map((log) => [
    log.workDate,
    log.vehicleNumber || "",
    log.workContent || "",
    (log.partsUsed || []).map((part) => `${part.name} ${part.quantity}${part.unit || "개"}`).join(" / "),
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
  const amount = numberFromInput(data.get("amount"));
  if (!workContent) {
    showToast("작업 내용을 입력해주세요.");
    return;
  }
  if (Number.isNaN(amount) || amount < 0) {
    showToast("올바른 금액을 입력해주세요.");
    return;
  }

  const logs = getLogs();
  const inventory = getInventory();
  const partsUsed = partsForFormData(data, inventory);
  const previousLog = logs.find((log) => log.id === state.editingId);
  const next = {
    id: state.editingId ?? Date.now(),
    workDate: String(data.get("workDate") || todayStr()),
    vehicleNumber: String(data.get("vehicleNumber") || "").trim(),
    workContent,
    amount,
    paymentMethod: state.paymentMethod,
    ownerPhone: String(data.get("ownerPhone") || "").trim(),
    photoDataUrl: String(data.get("photoDataUrl") || ""),
    partsUsed,
    createdAt: previousLog?.createdAt ?? new Date().toISOString(),
  };
  const nextInventory = applyInventoryForLogChange(previousLog, next);
  const warning = stockWarningText(nextInventory);

  if (state.editingId) {
    saveLogs(logs.map((log) => (log.id === state.editingId ? next : log)));
    showToast(`기록을 수정했습니다.${warning}`);
  } else {
    saveLogs([next, ...logs]);
    showToast(`작업이 기록되었습니다.${warning}`);
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
  if (state.editingTemplateId) {
    saveTemplates(getTemplates().map((template) => (
      template.id === state.editingTemplateId
        ? { ...template, label, content, amount }
        : template
    )));
    state.editingTemplateId = null;
    showToast("템플릿을 수정했습니다.");
  } else {
    saveTemplates([{ id: Date.now(), label, content, amount, usage: 0 }, ...getTemplates()]);
    showToast("템플릿을 저장했습니다.");
  }
  render();
}

function handleInventorySubmit(event) {
  event.preventDefault();
  const name = document.querySelector("#inventoryName").value.trim();
  const model = document.querySelector("#inventoryModel").value.trim();
  const keywords = document.querySelector("#inventoryKeywords").value.trim();
  const location = document.querySelector("#inventoryLocation").value.trim();
  const quantity = numberFromInput(document.querySelector("#inventoryQuantity").value);
  const minQuantity = numberFromInput(document.querySelector("#inventoryMinQuantity").value);
  const unit = document.querySelector("#inventoryUnit").value.trim() || "개";
  if (!name) {
    showToast("부품명을 입력해주세요.");
    return;
  }
  if ([quantity, minQuantity].some((value) => Number.isNaN(value) || value < 0)) {
    showToast("수량은 0 이상 숫자로 입력해주세요.");
    return;
  }
  const next = { id: state.editingInventoryId ?? Date.now(), name, model, keywords, location, quantity, minQuantity, unit };
  if (state.editingInventoryId) {
    saveInventory(getInventory().map((item) => (item.id === state.editingInventoryId ? next : item)));
    state.editingInventoryId = null;
    showToast("재고를 수정했습니다.");
  } else {
    saveInventory([next, ...getInventory()]);
    showToast("재고를 저장했습니다.");
  }
  render();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function compressPhoto(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const maxSize = 1200;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

async function handlePhotoFile(file) {
  if (!file) return;
  try {
    const dataUrl = await compressPhoto(file);
    const hidden = document.querySelector("#photoDataUrl");
    const preview = document.querySelector("#photoPreview");
    const removeButton = document.querySelector("#removePhotoButton");
    hidden.value = dataUrl;
    preview.innerHTML = `<img src="${dataUrl}" alt="작업 사진">`;
    preview.classList.add("show");
    removeButton?.classList.remove("hidden");
    showToast("사진이 추가되었습니다.");
    scanPlateFromPhoto(dataUrl);
    document.querySelector("#workContent")?.focus();
  } catch {
    showToast("사진을 불러오지 못했습니다.");
  }
}

function removePhoto() {
  const hidden = document.querySelector("#photoDataUrl");
  const preview = document.querySelector("#photoPreview");
  const removeButton = document.querySelector("#removePhotoButton");
  if (hidden) hidden.value = "";
  if (preview) {
    preview.innerHTML = "";
    preview.classList.remove("show");
  }
  const status = document.querySelector("#plateScanStatus");
  if (status) status.textContent = "";
  removeButton?.classList.add("hidden");
  showToast("사진을 삭제했습니다.");
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
      else {
        setView(view);
        if (view === "new") openPhotoCamera();
      }
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
      const deletedLog = getLogs().find((log) => log.id === id);
      applyInventoryForLogChange(deletedLog, null);
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
      const applied = autoFillPartsFromWorkText(`${template.label} ${template.content} ${content.value}`, { silent: true });
      saveTemplates(getTemplates().map((item) => item.id === template.id ? { ...item, usage: (item.usage ?? 0) + 1 } : item));
      showToast(applied ? `템플릿 적용 + 재고 ${applied}개 자동 입력` : "템플릿을 적용했습니다.");
    });
  });

  document.querySelectorAll("[data-part-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.querySelector(`[name="part-${button.dataset.partStep}"]`);
      if (!input) return;
      const current = Math.max(0, numberFromInput(input.value) || 0);
      const next = Math.max(0, current + Number(button.dataset.step || 0));
      input.value = next ? String(next) : "";
    });
  });

  document.querySelectorAll("[data-template-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      saveTemplates(getTemplates().filter((template) => template.id !== Number(button.dataset.templateDelete)));
      if (state.editingTemplateId === Number(button.dataset.templateDelete)) state.editingTemplateId = null;
      showToast("템플릿을 삭제했습니다.");
      render();
    });
  });

  document.querySelectorAll("[data-template-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      state.editingTemplateId = Number(button.dataset.templateEdit);
      render();
    });
  });

  document.querySelectorAll("[data-inventory-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.inventoryDelete);
      if (!confirm("이 재고 품목을 삭제할까요? 기존 기록의 사용 부품 내역은 유지됩니다.")) return;
      saveInventory(getInventory().filter((item) => item.id !== id));
      if (state.editingInventoryId === id) state.editingInventoryId = null;
      showToast("재고를 삭제했습니다.");
      render();
    });
  });

  document.querySelectorAll("[data-inventory-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      state.editingInventoryId = Number(button.dataset.inventoryEdit);
      render();
    });
  });

  const form = document.querySelector("#logForm");
  if (form) form.addEventListener("submit", handleLogSubmit);

  const templateForm = document.querySelector("#templateForm");
  if (templateForm) templateForm.addEventListener("submit", handleTemplateSubmit);

  const inventoryForm = document.querySelector("#inventoryForm");
  if (inventoryForm) inventoryForm.addEventListener("submit", handleInventorySubmit);

  const cancelTemplateEdit = document.querySelector("[data-action='cancel-template-edit']");
  if (cancelTemplateEdit) {
    cancelTemplateEdit.addEventListener("click", () => {
      state.editingTemplateId = null;
      render();
    });
  }

  const clearTemplateForm = document.querySelector("[data-action='clear-template-form']");
  if (clearTemplateForm) {
    clearTemplateForm.addEventListener("click", () => {
      document.querySelector("#templateLabel").value = "";
      document.querySelector("#templateContent").value = "";
      document.querySelector("#templateAmount").value = "";
    });
  }

  const cancelInventoryEdit = document.querySelector("[data-action='cancel-inventory-edit']");
  if (cancelInventoryEdit) {
    cancelInventoryEdit.addEventListener("click", () => {
      state.editingInventoryId = null;
      render();
    });
  }

  const clearInventoryForm = document.querySelector("[data-action='clear-inventory-form']");
  if (clearInventoryForm) {
    clearInventoryForm.addEventListener("click", () => {
      document.querySelector("#inventoryName").value = "";
      document.querySelector("#inventoryModel").value = "";
      document.querySelector("#inventoryKeywords").value = "";
      document.querySelector("#inventoryLocation").value = "";
      document.querySelector("#inventoryQuantity").value = "";
      document.querySelector("#inventoryMinQuantity").value = "1";
      document.querySelector("#inventoryUnit").value = "개";
    });
  }

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

  const installApp = document.querySelector("[data-action='install-app']");
  if (installApp) {
    installApp.addEventListener("click", async () => {
      if (!window.installPromptEvent) return;
      window.installPromptEvent.prompt();
      await window.installPromptEvent.userChoice.catch(() => {});
      window.installPromptEvent = null;
      render();
    });
  }

  const takePhoto = document.querySelector("[data-action='take-photo']");
  if (takePhoto) takePhoto.addEventListener("click", openPhotoCamera);

  const choosePhoto = document.querySelector("[data-action='choose-photo']");
  if (choosePhoto) choosePhoto.addEventListener("click", () => document.querySelector("#photoGalleryFile")?.click());

  const photoCameraFile = document.querySelector("#photoCameraFile");
  if (photoCameraFile) photoCameraFile.addEventListener("change", (event) => handlePhotoFile(event.target.files?.[0]));

  const photoGalleryFile = document.querySelector("#photoGalleryFile");
  if (photoGalleryFile) photoGalleryFile.addEventListener("change", (event) => handlePhotoFile(event.target.files?.[0]));

  const removePhotoButton = document.querySelector("[data-action='remove-photo']");
  if (removePhotoButton) removePhotoButton.addEventListener("click", removePhoto);

  const vehicleInput = document.querySelector("#vehicleNumber");
  if (vehicleInput) vehicleInput.addEventListener("input", updateVehicleHistory);

  const workContent = document.querySelector("#workContent");
  if (workContent) {
    workContent.addEventListener("blur", () => autoFillPartsFromWorkText(workContent.value));
    workContent.addEventListener("change", () => autoFillPartsFromWorkText(workContent.value));
  }
}

function render() {
  const app = document.querySelector("#app");
  if (state.view === "home") app.innerHTML = renderHome();
  if (state.view === "new") app.innerHTML = renderForm();
  if (state.view === "list") app.innerHTML = renderList();
  if (state.view === "search") app.innerHTML = renderSearch();
  if (state.view === "templates") app.innerHTML = renderTemplates();
  if (state.view === "inventory") app.innerHTML = renderInventory();
  if (state.view === "detail") app.innerHTML = renderDetail();
  attachEvents();
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  window.installPromptEvent = event;
  render();
});

window.addEventListener("appinstalled", () => {
  window.installPromptEvent = null;
  render();
});

render();
