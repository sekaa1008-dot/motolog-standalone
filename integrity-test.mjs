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
  ["photo camera action", files.app.includes("data-action=\"take-photo\"")],
  ["photo gallery action", files.app.includes("data-action=\"choose-photo\"")],
  ["photo saved with log", files.app.includes("photoDataUrl: String(data.get(\"photoDataUrl\")")],
  ["photo shown in detail", files.app.includes("detail-photo")],
  ["OCR removed", !/Tesseract|runPlateOcr|normalizePlateText|번호판 인식하기/.test(files.app)],
  ["photo before vehicle field", files.app.indexOf("photo-box") < files.app.indexOf("for=\"vehicleNumber\"")],
  ["PWA manifest linked", files.html.includes("manifest.webmanifest")],
  ["service worker registered", files.html.includes("serviceWorker.register")],
  ["manifest parseable", Boolean(JSON.parse(files.manifest).start_url)],
  ["service worker cache", files.sw.includes("CACHE_NAME") && files.sw.includes("app.js")],
  ["photo styles", files.css.includes(".photo-box") && files.css.includes(".detail-photo")],
  ["template action styles", files.css.includes(".item-actions") && files.css.includes(".danger-text")],
  ["inventory store key", files.app.includes("motolog.inventory.v1")],
  ["inventory view", files.app.includes("function renderInventory") && files.app.includes("data-view=\"inventory\"")],
  ["parts saved with log", files.app.includes("partsUsed") && files.app.includes("partsForFormData")],
  ["part quantity stepper", files.app.includes("data-part-step") && files.css.includes(".part-stepper")],
  ["inventory auto deduction", files.app.includes("applyInventoryForLogChange")],
  ["back four search", files.app.includes("endsWith(digits.slice(-4))")],
  ["daily close summary", files.app.includes("일일 마감 요약") && files.app.includes("partsSummary")],
  ["stock warning styles", files.css.includes(".stock-danger") && files.css.includes(".stock-warning")],
  ["service worker cache bumped", files.sw.includes("motolog-pwa-v4")],
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
