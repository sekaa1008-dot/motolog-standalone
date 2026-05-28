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
        <div class="field">
          <label for="workDate">작업 날짜</label>
          <input class="input" id="workDate" name="workDate" type="date" value="${editing?.workDate ?? todayStr()}" />
        </div>
        <div class="field">
          <label for="vehicleNumber">차량 번호</label>
          <input class="input" id="vehicleNumber" name="vehicleNumber" placeholder="예: 12가3456" value="${escapeHtml(editing?.vehicleNumber ?? "")}" />
        </div>
        <div class="vehicle-history ${historyHtml ? "show" : ""}" id="vehicleHistory">${historyHtml}</div>
        <div class="photo-box">
          <div>
            <h4>작업 사진</h4>
            <p>번호판이나 작업 부위를 촬영하거나 갤러리에서 선택해 기록에 남길 수 있습니다.</p>
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
          <button type="button" class="button danger ${editing?.photoDataUrl ? "" : "hidden"}" id="removePhotoButton" data-action="remove-photo">사진 삭제</button>
        </div>
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
    photoDataUrl: String(data.get("photoDataUrl") || ""),
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
