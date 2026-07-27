const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.IMAGE_WORKBENCH_PORT || 4184);
const host = "127.0.0.1";
const dataDir = path.join(root, "data");
const backupsRoot = path.join(root, "backups");

const jsAssignments = {
  "history-content": "window.historyContentData",
  "people-data": "window.JAPAN_HISTORY_PEOPLE_DATA",
  "action-cards": "window.JAPAN_HISTORY_ACTION_CARDS_DATA"
};

const datasetFiles = [
  "history-content.json",
  "history-content.js",
  "people-data.json",
  "people-data.js",
  "action-cards.json",
  "action-cards.js"
];

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}

function sendText(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": contentType, "Cache-Control": "no-store" });
  res.end(body);
}

function safePath(urlPath) {
  const clean = decodeURIComponent((urlPath || "/").split("?")[0]).replace(/^\/+/, "") || "image-workbench.html";
  const filePath = path.resolve(root, clean);
  if (!filePath.startsWith(root)) return null;
  return filePath;
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js") return "application/javascript; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) return `image/${ext.replace(".", "").replace("jpg", "jpeg")}`;
  return "application/octet-stream";
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      chunks.push(chunk);
      size += chunk.length;
      if (size > 80 * 1024 * 1024) {
        req.destroy();
        reject(new Error("payload too large"));
      }
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function normalizePathSeparators(value) {
  return String(value || "").replace(/\\/g, "/");
}

function validatePayload(payload) {
  const history = payload.historyContent;
  const people = payload.peopleData;
  const actions = payload.actionData;
  if (!history || !Array.isArray(history.groups)) throw new Error("historyContent.groups がありません");
  if (!people || !Array.isArray(people.people)) throw new Error("peopleData.people がありません");
  if (!actions || !actions.actionCards || typeof actions.actionCards !== "object") throw new Error("actionData.actionCards がありません");
  if (!history.groups.length) throw new Error("historyContent.groups が空です");
  return { history, people, actions };
}

function assertNoReplacementCharacters(name, data) {
  const text = JSON.stringify(data);
  if (text.includes("\uFFFD")) {
    throw new Error(name + " に文字化けの置換文字 � が含まれています。保存を中止しました。");
  }
}

function assetFilePrefix(folder) {
  if (folder === "people") return "person";
  if (folder === "actions") return "action";
  if (folder === "subcategories") return "subcategory";
  if (folder === "periods") return "period";
  return "image";
}

function imageExtension(mime) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/gif") return "gif";
  return "webp";
}

function materializeDataUrlImage(value, folder, id, stats) {
  const text = String(value || "");
  const match = text.match(/^data:(image\/(?:webp|png|jpeg|jpg|gif));base64,(.+)$/i);
  if (!match) return value;
  const mime = match[1].toLowerCase().replace("image/jpg", "image/jpeg");
  const buffer = Buffer.from(match[2], "base64");
  const hash = crypto.createHash("sha1").update(buffer).digest("hex").slice(0, 10);
  const ext = imageExtension(mime);
  const dir = path.join(root, "assets", folder);
  fs.mkdirSync(dir, { recursive: true });
  const fileName = `${assetFilePrefix(folder)}-${hash}.${ext}`;
  fs.writeFileSync(path.join(dir, fileName), buffer);
  stats.count += 1;
  stats.bytes += buffer.length;
  return `assets/${folder}/${fileName}`;
}

function materializeEmbeddedImages(history, people, actions) {
  const stats = { count: 0, bytes: 0 };
  for (const person of people.people || []) {
    person.image = materializeDataUrlImage(person.image, "people", person.displayName || person.name, stats);
  }
  for (const [name, action] of Object.entries(actions.actionCards || {})) {
    action.image = materializeDataUrlImage(action.image, "actions", name, stats);
  }
  for (const group of history.groups || []) {
    for (const era of group.eras || []) {
      for (const item of era.subcategories || []) {
        item.image = materializeDataUrlImage(item.image, "subcategories", item.id || item.title, stats);
      }
    }
  }
  return stats;
}

function writeDataSet(name, data) {
  const jsonText = JSON.stringify(data, null, 2) + "\n";
  fs.writeFileSync(path.join(dataDir, `${name}.json`), jsonText, "utf8");
  fs.writeFileSync(path.join(dataDir, `${name}.js`), `${jsAssignments[name]} = ${jsonText}`, "utf8");
}

function readDataSet(name) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, `${name}.json`), "utf8"));
}

function loadCurrentDataSets() {
  const history = readDataSet("history-content");
  const people = readDataSet("people-data");
  const actions = readDataSet("action-cards");
  validatePayload({ historyContent: history, peopleData: people, actionData: actions });
  return { history, people, actions };
}

function findSubcategory(history, id) {
  for (const group of history.groups || []) {
    for (const era of group.eras || []) {
      const found = (era.subcategories || []).find((item) => item.id === id);
      if (found) return found;
    }
  }
  return null;
}

function targetForImageOperation(datasets, operation) {
  if (operation.type === "person") return (datasets.people.people || []).find((person) => person.name === operation.id);
  if (operation.type === "action") return datasets.actions.actionCards?.[operation.id];
  if (operation.type === "subcategory") return findSubcategory(datasets.history, operation.id);
  return null;
}

function setOrDelete(target, key, value) {
  if (value) target[key] = value;
  else delete target[key];
}



function imageMatchesAfterMaterialize(actualImage, expectedImage) {
  const actual = String(actualImage || "");
  const expected = String(expectedImage || "");
  if (!expected) return !actual;
  if (/^data:image\//i.test(expected)) return /^assets\//.test(actual) && !/^data:image\//i.test(actual);
  return actual === expected;
}

function assertAppliedImageOperations(datasets, operations) {
  for (const operation of operations || []) {
    const target = targetForImageOperation(datasets, operation);
    if (!target) throw new Error(`保存後の画像更新対象が見つかりません: ${operation.type}/${operation.id}`);
    const after = operation.after || {};
    const expectedImage = after.image || "";
    if (!imageMatchesAfterMaterialize(target.image || "", expectedImage)) {
      throw new Error(`画像保存の照合に失敗しました: ${operation.type}/${operation.id}`);
    }
    const expectedFocus = operation.type === "subcategory" && expectedImage ? (after.imageFocus || "center") : "";
    const actualFocus = operation.type === "subcategory" && target.image ? (target.imageFocus || "center") : "";
    if (actualFocus !== expectedFocus) {
      throw new Error(`画像位置の保存照合に失敗しました: ${operation.type}/${operation.id} expected=${expectedFocus} actual=${actualFocus}`);
    }
    const expectedAlt = after.imageAlt || "";
    const actualAlt = target.imageAlt || "";
    if (actualAlt !== expectedAlt) {
      throw new Error(`画像代替テキストの保存照合に失敗しました: ${operation.type}/${operation.id}`);
    }
  }
}
function ensureBackupsRoot() {
  fs.mkdirSync(backupsRoot, { recursive: true });
}

function backupCurrent(kind = "apply", meta = {}) {
  ensureBackupsRoot();
  const dirName = `image-workbench-${kind}-${stamp()}`;
  const dir = path.join(backupsRoot, dirName);
  fs.mkdirSync(dir, { recursive: true });
  for (const file of datasetFiles) {
    fs.copyFileSync(path.join(dataDir, file), path.join(dir, file));
  }
  const manifest = {
    createdAt: new Date().toISOString(),
    kind,
    dir: normalizePathSeparators(path.relative(root, dir)),
    files: datasetFiles,
    meta
  };
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
  return manifest.dir;
}

function readBackupManifest(dir) {
  const manifestPath = path.join(dir, "manifest.json");
  if (fs.existsSync(manifestPath)) {
    try {
      return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch {
      return null;
    }
  }
  return null;
}

function listBackups() {
  ensureBackupsRoot();
  return fs.readdirSync(backupsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("image-workbench-"))
    .map((entry) => {
      const dir = path.join(backupsRoot, entry.name);
      const manifest = readBackupManifest(dir);
      const stat = fs.statSync(dir);
      return {
        dir: normalizePathSeparators(path.relative(root, dir)),
        name: entry.name,
        createdAt: manifest?.createdAt || stat.mtime.toISOString(),
        kind: manifest?.kind || "unknown",
        meta: manifest?.meta || {}
      };
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function resolveBackupDir(relativeDir) {
  const normalized = normalizePathSeparators(relativeDir).replace(/^\/+/, "");
  if (!normalized.startsWith("backups/")) throw new Error("バックアップ指定が不正です。");
  const full = path.resolve(root, normalized);
  if (!full.startsWith(backupsRoot)) throw new Error("バックアップ指定が不正です。");
  if (!fs.existsSync(full) || !fs.statSync(full).isDirectory()) throw new Error("指定したバックアップが見つかりません。");
  return full;
}

function restoreBackup(relativeDir) {
  const sourceDir = resolveBackupDir(relativeDir);
  for (const file of datasetFiles) {
    const source = path.join(sourceDir, file);
    if (!fs.existsSync(source)) throw new Error(`バックアップに ${file} がありません。`);
    fs.copyFileSync(source, path.join(dataDir, file));
  }
}

async function handleApply(req, res) {
  try {
    const body = await readBody(req);
    const payload = JSON.parse(body);
    const { history, people, actions } = validatePayload(payload);
    const operations = Array.isArray(payload.patch?.operations) ? payload.patch.operations : [];

    assertNoReplacementCharacters("historyContent", history);
    assertNoReplacementCharacters("peopleData", people);
    assertNoReplacementCharacters("actionData", actions);
    const assetStats = materializeEmbeddedImages(history, people, actions);
    validatePayload({ historyContent: history, peopleData: people, actionData: actions });
    if (operations.length) assertAppliedImageOperations({ history, people, actions }, operations);

    const backupDir = backupCurrent("apply", { operations: operations.length, mode: "direct-dataset-save" });
    writeDataSet("history-content", history);
    writeDataSet("people-data", people);
    writeDataSet("action-cards", actions);
    const persisted = loadCurrentDataSets();
    if (operations.length) assertAppliedImageOperations(persisted, operations);
    sendJson(res, 200, {
      ok: true,
      backupDir,
      operations: operations.length,
      embeddedImageSize: payload.patch?.embeddedImageSize || "0B",
      materializedImages: assetStats.count,
      materializedBytes: assetStats.bytes,
      datasets: { historyContent: persisted.history, peopleData: persisted.people, actionData: persisted.actions },
      backups: listBackups()
    });
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message });
  }
}

async function handleRollback(req, res) {
  try {
    const body = await readBody(req);
    const payload = JSON.parse(body || "{}");
    const backupDir = String(payload.backupDir || "").trim();
    if (!backupDir) throw new Error("ロールバック対象のバックアップを選択してください。");
    const rollbackBackupDir = backupCurrent("rollback-before-restore", { restoreFrom: backupDir });
    restoreBackup(backupDir);
    const { history, people, actions } = loadCurrentDataSets();
    sendJson(res, 200, {
      ok: true,
      restoredFrom: backupDir,
      rollbackBackupDir,
      datasets: { historyContent: history, peopleData: people, actionData: actions },
      backups: listBackups()
    });
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message });
  }
}

function handleBackups(res) {
  try {
    sendJson(res, 200, { ok: true, backups: listBackups() });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/apply-image-data") {
    handleApply(req, res);
    return;
  }
  if (req.method === "POST" && req.url === "/api/rollback-image-data") {
    handleRollback(req, res);
    return;
  }
  if (req.method === "GET" && req.url === "/api/backups") {
    handleBackups(res);
    return;
  }
  if (req.method !== "GET") {
    sendText(res, 405, "Method Not Allowed");
    return;
  }
  const filePath = safePath(req.url || "/");
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendText(res, 404, "File not found");
    return;
  }
  res.writeHead(200, { "Content-Type": contentType(filePath), "Cache-Control": "no-store" });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, host, () => {
  console.log(`Image workbench server: http://${host}:${port}/image-workbench.html`);
});





