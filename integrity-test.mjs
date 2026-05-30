import { readFileSync } from "node:fs";

const files = {
  app: readFileSync("app.js", "utf8"),
  css: readFileSync("styles.css", "utf8"),
  html: readFileSync("index.html", "utf8"),
  manifest: readFileSync("manifest.webmanifest", "utf8"),
  sw: readFileSync("service-worker.js", "utf8"),
};

const checks = [
  ["template edit button", files.app.includes("data-template-edit")],
  ["template edit state", files.app.includes("editingTemplateId")],
  ["template cancel edit", files.app.includes("cancel-template-edit")],
  ["estimate template seed", files.app.includes("estimateTemplates") && files.app.includes("프로자350 견적 전체")],
  ["estimate template prices", files.app.includes("견적 피렐리 뒷타이어") && files.app.includes("amount: 150000") && files.app.includes("amount: 475000")],
  ["photo camera action", files.app.includes("data-action=\"take-photo\"")],
  ["photo gallery action", files.app.includes("data-action=\"choose-photo\"")],
  ["photo saved with log", files.app.includes("photoDataUrl: String(data.get(\"photoDataUrl\")")],
  ["photo shown in detail", files.app.includes("detail-photo")],
  ["photo plate scan", files.app.includes("scanPlateFromPhoto") && files.app.includes("cleanPlateText") && files.app.includes("tesseract.js")],
  ["photo before vehicle field", files.app.indexOf("photo-box") < files.app.indexOf("for=\"vehicleNumber\"")],
  ["quick save before inventory", files.app.indexOf("quick-save-actions") < files.app.indexOf("사용 부품 / 재고 차감")],
  ["PWA manifest linked", files.html.includes("manifest.webmanifest")],
  ["service worker registered", files.html.includes("serviceWorker.register")],
  ["manifest parseable", Boolean(JSON.parse(files.manifest).start_url)],
  ["service worker cache", files.sw.includes("CACHE_NAME") && files.sw.includes("app.js")],
  ["photo styles", files.css.includes(".photo-box") && files.css.includes(".detail-photo")],
  ["template action styles", files.css.includes(".item-actions") && files.css.includes(".danger-text")],
  ["list delete action", files.app.includes("class=\"list-actions\"") && files.app.includes("data-delete=\"${log.id}\"")],
  ["list open button", files.app.includes("class=\"log-open\"") && files.css.includes(".log-open")],
  ["inventory store key", files.app.includes("motolog.inventory.v1")],
  ["inventory view", files.app.includes("function renderInventory") && files.app.includes("data-view=\"inventory\"")],
  ["parts saved with log", files.app.includes("partsUsed") && files.app.includes("partsForFormData")],
  ["part quantity stepper", files.app.includes("data-part-step") && files.css.includes(".part-stepper")],
  ["automatic part suggestion", files.app.includes("autoFillPartsFromWorkText") && files.app.includes("inventoryMatchKeywords")],
  ["inventory keywords field", files.app.includes("inventoryKeywords") && files.app.includes("자동 차감 키워드")],
  ["inventory auto deduction", files.app.includes("applyInventoryForLogChange")],
  ["back four search", files.app.includes("endsWith(digits.slice(-4))")],
  ["daily close summary", files.app.includes("일일 마감 요약") && files.app.includes("partsSummary")],
  ["stock warning styles", files.css.includes(".stock-danger") && files.css.includes(".stock-warning")],
  ["service worker cache bumped", files.sw.includes("motolog-pwa-v8")],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
}

if (failed.length) {
  console.error(`\n${failed.length} integrity checks failed.`);
  process.exit(1);
}

console.log("\nAll integrity checks passed.");
