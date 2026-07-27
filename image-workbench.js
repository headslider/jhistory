(function () {
  const dedicatedWorkbenchUrl = 'http://127.0.0.1:4184/image-workbench.html';
  if (['127.0.0.1', 'localhost'].includes(window.location.hostname) && window.location.port !== '4184') {
    window.location.replace(dedicatedWorkbenchUrl + (window.location.search || '') + (window.location.hash || ''));
    return;
  }
const historyData = clone(window.historyContentData || {});
  const peopleData = clone(window.JAPAN_HISTORY_PEOPLE_DATA || {});
  const actionData = clone(window.JAPAN_HISTORY_ACTION_CARDS_DATA || {});
  const baseline = new Map();
  const state = { selectedKey: "", records: [], previewImages: new Map(), listImageObserver: null, imageRefreshToken: Date.now(), categoryImageChoices: [], categoryImageChoiceMap: new Map(), backups: [] };
  const els = {
    typeFilter: byId("typeFilter"), imageFilter: byId("imageFilter"), searchInput: byId("searchInput"), recordList: byId("recordList"),
    summaryTotal: byId("summaryTotal"), summaryMissing: byId("summaryMissing"), summaryChanged: byId("summaryChanged"), emptyState: byId("emptyState"), editor: byId("editor"),
    editorType: byId("editorType"), editorTitle: byId("editorTitle"), editorMeta: byId("editorMeta"), webSearchLink: byId("webSearchLink"), visualSourceStatus: byId("visualSourceStatus"),
    currentPreview: byId("currentPreview"), nextPreview: byId("nextPreview"), imageInput: byId("imageInput"), categoryImageSelect: byId("categoryImageSelect"), categoryImageStatus: byId("categoryImageStatus"), fileInput: byId("fileInput"), dropZone: byId("dropZone"), maxSizeInput: byId("maxSizeInput"), qualityInput: byId("qualityInput"), formatInput: byId("formatInput"), sizeStatus: byId("sizeStatus"), focusField: byId("focusField"), focusInput: byId("focusInput"), altInput: byId("altInput"),
    applyButton: byId("applyButton"), deleteButton: byId("deleteButton"), revertButton: byId("revertButton"), recordStatus: byId("recordStatus"),
    copyDisplayedImageButton: byId("copyDisplayedImageButton"), copyDirectImageButton: byId("copyDirectImageButton"), applyToProjectButton: byId("applyToProjectButton"), jsonImportInput: byId("jsonImportInput"), applyStatus: byId("applyStatus"), copyPatchButton: byId("copyPatchButton"), downloadPatchButton: byId("downloadPatchButton"), downloadJsonButton: byId("downloadJsonButton"), patchOutput: byId("patchOutput"), backupSelect: byId("backupSelect"), reloadBackupsButton: byId("reloadBackupsButton"), rollbackButton: byId("rollbackButton")
  };

  function byId(id) { return document.getElementById(id); }
  function clone(value) { return JSON.parse(JSON.stringify(value || {})); }

  function subcategoryRecords() {
    const items = [];
    for (const group of historyData.groups || []) {
      for (const era of group.eras || []) {
        for (const item of era.subcategories || []) items.push({ item, era, group });
      }
    }
    return items;
  }

  function allRecords() {
    const people = (peopleData.people || []).map((person) => ({
      key: `person:${person.name}`, type: "person", typeLabel: "人物カード", id: person.name, title: person.displayName || person.name,
      meta: [person.era, person.field, person.title].filter(Boolean).join(" / "),
      body: [person.modal?.profile, person.modal?.whatDid, person.modal?.whyImportant].filter(Boolean).join(" "),
      target: person
    }));
    const actions = Object.entries(actionData.actionCards || {}).map(([name, action]) => ({
      key: `action:${name}`, type: "action", typeLabel: "アクションカード", id: name, title: name,
      meta: [action.summary, ...(action.tags || [])].filter(Boolean).join(" / "),
      body: [action.summary, action.modal?.whatHappened, action.modal?.whyImportant].filter(Boolean).join(" "),
      target: action
    }));
    const subs = subcategoryRecords().map(({ item, era, group }) => ({
      key: `subcategory:${item.id}`, type: "subcategory", typeLabel: "子カテゴリー", id: item.id, title: item.title,
      meta: [group.title, era.name, item.summary].filter(Boolean).join(" / "),
      body: [item.text, ...(item.tags || []), ...(item.actions || [])].filter(Boolean).join(" "),
      target: item
    }));
    return [...people, ...actions, ...subs];
  }

  function supportsImageFocus(record) { return record?.type === "subcategory"; }
  function snapshotFields(target, record) {
    return { image: target?.image || "", imageFocus: supportsImageFocus(record) ? (target?.imageFocus || "center") : "", imageAlt: target?.imageAlt || "" };
  }

  function refreshBaseline(records = state.records) {
    baseline.clear();
    for (const record of records || []) baseline.set(record.key, snapshotFields(record.target, record));
  }

  function rebuildRecords(options = {}) {
    refreshCategoryImageChoices();
    state.records = allRecords();
    if (options.resetBaseline) refreshBaseline(state.records);
  }

  function originalSource(record) {
    return baseline.get(record.key) || { image: "", imageFocus: supportsImageFocus(record) ? "center" : "", imageAlt: "" };
  }

  function imageOf(record) { return record.target.image || ""; }
  function focusOf(record) { return supportsImageFocus(record) ? (record.target.imageFocus || "center") : "center"; }
  function altOf(record) { return record.target.imageAlt || ""; }
  function eraForName(name) {
    for (const group of historyData.groups || []) {
      const found = (group.eras || []).find((era) => era.name === name || era.id === name);
      if (found) return found;
    }
    return null;
  }
  function personNames(person) {
    return [...new Set([person.name, person.displayName, person.rubyName, ...(person.aliases || []), ...(person.nameAliases || [])].filter(Boolean).map(String))];
  }
  function categoryImageChoices() {
    const choices = [];
    for (const group of historyData.groups || []) {
      if (group.image) {
        choices.push({
          key: "group:" + group.id,
          id: group.id,
          title: group.title,
          groupTitle: group.title,
          eraName: "",
          image: group.image,
          focus: group.imageFocus || "center",
          alt: group.imageAlt || group.title + "の画像",
          label: "大カテゴリー画像 / " + group.title
        });
      }
      for (const era of group.eras || []) {
        const eraImage = (historyData.eraImages || {})[era.id];
        if (eraImage) {
          choices.push({
            key: "era:" + era.id,
            id: era.id,
            title: era.name,
            groupTitle: group.title,
            eraName: era.name,
            image: eraImage,
            focus: "center",
            alt: era.name + "の画像",
            label: "時代画像 / " + group.title + " / " + era.name
          });
        }
        for (const item of era.subcategories || []) {
          if (!item.image) continue;
          choices.push({
            key: "subcategory:" + item.id,
            id: item.id,
            title: item.title,
            groupTitle: group.title,
            eraName: era.name,
            image: item.image,
            focus: item.imageFocus || "center",
            alt: item.imageAlt || item.title + "の画像",
            label: "子カテゴリー画像 / " + group.title + " / " + era.name + " / " + item.title
          });
        }
      }
    }
    return choices;
  }
  function refreshCategoryImageChoices() {
    state.categoryImageChoices = categoryImageChoices();
    state.categoryImageChoiceMap = new Map(state.categoryImageChoices.map((choice) => [choice.key, choice]));
  }
  function matchingCategoryImageChoice(value) {
    const image = String(value || "");
    if (!image) return null;
    return state.categoryImageChoices.find((choice) => choice.image === image) || null;
  }
  function renderCategoryImageSelect(record) {
    const canUse = record && ["person", "action", "subcategory"].includes(record.type);
    els.categoryImageSelect.disabled = !canUse;
    const currentChoice = matchingCategoryImageChoice(imageOf(record || { target: {} }));
    els.categoryImageSelect.innerHTML = [
      '<option value="">' + (canUse ? "カテゴリー画像を選択" : "人物・アクション・子カテゴリーで使用") + '</option>',
      ...state.categoryImageChoices.map((choice) => '<option value="' + escapeAttr(choice.key) + '">' + escapeHtml(choice.label) + '</option>')
    ].join("");
    els.categoryImageSelect.value = currentChoice?.key || "";
    els.categoryImageStatus.textContent = canUse
      ? state.categoryImageChoices.length + "件の既存画像から選べます。選択後、『挿入・入れ替え』または『本体へ反映』で確定します。"
      : "大カテゴリー・時代・子カテゴリーが既存画像の提供元です。人物カード・アクションカード・子カテゴリーを選ぶとここから割り当てできます。";
  }
  function effectiveVisual(record) {
    const direct = imageOf(record);
    if (direct) return { image: direct, focus: focusOf(record), alt: altOf(record) || `${record.title}の画像`, source: "直接割り当て", sourceType: "direct" };
    const eraImages = historyData.eraImages || {};
    const allSubcategories = subcategoryRecords();
    if (record.type === "person") {
      const names = personNames(record.target);
      const related = allSubcategories.find(({ item }) => item.image && (item.people || []).some((name) => names.includes(name)));
      if (related) return { image: related.item.image, focus: related.item.imageFocus || "center", alt: `${record.title}に関係する${related.item.title}の画像`, source: `関連子カテゴリー: ${related.item.title}`, sourceType: "subcategory" };
      const era = eraForName(record.target.era);
      if (era && eraImages[era.id]) return { image: eraImages[era.id], focus: "center", alt: `${record.target.era}の画像`, source: `時代画像: ${era.name}`, sourceType: "era" };
    }
    if (record.type === "action") {
      const tags = record.target.tags || [];
      const related = allSubcategories.find(({ item }) => item.image && (item.title === record.id || (item.actions || []).includes(record.id)))
        || allSubcategories.find(({ item }) => item.image && tags.some((tag) => item.title.includes(tag) || (item.tags || []).includes(tag)));
      if (related) return { image: related.item.image, focus: related.item.imageFocus || "center", alt: `${record.title}に関係する${related.item.title}の画像`, source: `関連子カテゴリー: ${related.item.title}`, sourceType: "subcategory" };
      const era = tags.map(eraForName).find(Boolean);
      if (era && eraImages[era.id]) return { image: eraImages[era.id], focus: "center", alt: `${era.name}の画像`, source: `時代画像: ${era.name}`, sourceType: "era" };
    }
    if (record.type === "subcategory") {
      const actionNames = [record.target.title, ...(record.target.actions || []), ...(record.target.tags || [])].filter(Boolean);
      for (const actionName of actionNames) {
        const action = actionData.actionCards?.[actionName];
        if (action?.image) return { image: action.image, focus: action.imageFocus || "center", alt: action.imageAlt || `${actionName}の画像`, source: `関連アクション: ${actionName}`, sourceType: "action" };
      }
      const eraName = (record.meta || "").split(" / ")[1];
      const era = eraForName(eraName);
      if (era && eraImages[era.id]) return { image: eraImages[era.id], focus: "center", alt: `${era.name}の画像`, source: `時代画像: ${era.name}`, sourceType: "era" };
    }
    return { image: "", focus: "center", alt: "", source: "本体表示画像なし", sourceType: "none" };
  }
  function imageKind(value) {
    if (!value) return "none";
    if (String(value).startsWith("data:image/")) return "embedded";
    if (/^https?:\/\//i.test(String(value))) return "url";
    return "path";
  }
  function isChanged(record) {
    const source = originalSource(record);
    return (source.image || "") !== (record.target.image || "") || (supportsImageFocus(record) && (source.imageFocus || "center") !== (record.target.imageFocus || "center")) || (source.imageAlt || "") !== (record.target.imageAlt || "");
  }

  function filteredRecords() {
    const query = els.searchInput.value.trim().toLowerCase();
    return state.records.filter((record) => {
      if (els.typeFilter.value !== "all" && record.type !== els.typeFilter.value) return false;
      if (els.imageFilter.value === "missing" && imageOf(record)) return false;
      if (els.imageFilter.value === "set" && !imageOf(record)) return false;
      if (els.imageFilter.value === "changed" && !isChanged(record)) return false;
      if (!query) return true;
      return [record.title, record.id, record.meta, record.body, record.typeLabel].join(" ").toLowerCase().includes(query);
    });
  }

  function renderList() {
    const records = filteredRecords();
    els.summaryTotal.textContent = `${records.length}件表示 / 全${state.records.length}件`;
    els.summaryMissing.textContent = `未設定 ${state.records.filter((record) => !imageOf(record)).length}件`;
    els.summaryChanged.textContent = `変更 ${state.records.filter(isChanged).length}件`;
    if (!records.length) {
      els.recordList.innerHTML = '<div class="empty-state">条件に合う項目がありません。</div>';
      return;
    }
    els.recordList.innerHTML = records.map((record) => {
      const visual = effectiveVisual(record);
      const direct = imageOf(record);
      const image = visual.image;
      const preview = previewSource(image);
      const canPreview = Boolean(preview.src);
      const thumbHtml = canPreview ? `<img data-preview-key="${escapeAttr(record.key)}" alt="${escapeAttr(record.title)}の表示画像" loading="lazy" decoding="async">` : "";
      const imageBadge = direct ? '<span class="badge direct">直接画像</span>' : image ? '<span class="badge auto">自動画像</span>' : '<span class="badge">未設定</span>';
      const changedBadge = isChanged(record) ? '<span class="badge">変更</span>' : '';
      return `<button class="record-button${record.key === state.selectedKey ? " active" : ""}" type="button" data-key="${escapeAttr(record.key)}"><span class="thumb${canPreview ? " has-image" : " missing"}"${canPreview ? "" : ` data-message="${escapeAttr(preview.message || "No image")}"`}>${thumbHtml}</span><span><span class="record-title">${escapeHtml(record.title)} ${imageBadge} ${changedBadge}</span><span class="record-description">${escapeHtml(record.typeLabel)} / ${escapeHtml(visual.source)} / ${escapeHtml(record.meta || record.id)}</span></span></button>`;
    }).join("");
    hydrateListImages(records);
  }

  function focusObjectPosition(focus) {
    if (focus === "up") return "50% calc(50% + 100px)";
    if (focus === "down") return "50% calc(50% - 100px)";
    return "50% 50%";
  }

  function applyPreviewFocus(img, focus) {
    img.style.objectPosition = focusObjectPosition(focus || "center");
  }

  function hydrateListImages(records) {
    state.previewImages = new Map(records.map((record) => {
      const visual = effectiveVisual(record);
      const src = cacheBustPreviewSrc(previewSource(visual.image).src);
      return [record.key, { src }];
    }).filter(([, value]) => value.src));
    if (state.listImageObserver) {
      state.listImageObserver.disconnect();
      state.listImageObserver = null;
    }
    const images = [...els.recordList.querySelectorAll("img[data-preview-key]")];
    for (const img of images) {
      const preview = state.previewImages.get(img.dataset.previewKey || "");
      if (preview?.src) img.src = preview.src;
      img.style.objectPosition = "";
      img.removeAttribute("data-preview-key");
    }
  }

  function selectRecord(key) {
    state.selectedKey = key;
    const record = selectedRecord();
    if (!record) return;
    els.emptyState.hidden = true;
    els.editor.hidden = false;
    els.editorType.textContent = record.typeLabel;
    els.editorTitle.textContent = record.title;
    els.editorMeta.textContent = record.meta || record.id;
    const visual = effectiveVisual(record);
    const direct = imageOf(record);
    els.imageInput.value = direct;
    els.focusInput.value = focusOf(record);
    els.focusField.hidden = !supportsImageFocus(record);
    els.altInput.value = altOf(record);
    els.webSearchLink.href = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${record.title} 日本史`)}`;
    setPreview(els.currentPreview, visual.image, record.title, visual.focus);
    setPreview(els.nextPreview, direct, record.title, focusOf(record));
    renderCategoryImageSelect(record);
    els.visualSourceStatus.textContent = `本体表示: ${visual.source} / 表示画像: ${imageKind(visual.image)}${visual.image ? ` (${formatBytes(dataUrlBytes(visual.image))})` : ""} / 直接割り当て: ${direct ? `${imageKind(direct)} (${formatBytes(dataUrlBytes(direct))})` : "なし"}`;
    els.recordStatus.textContent = statusText(record);
    renderList();
  }

  function selectedRecord() { return state.records.find((item) => item.key === state.selectedKey); }
  function previewSource(src) {
    const value = String(src || "").trim();
    if (!value) return { src: "", message: "No image" };
    if (/^https?:\/\//i.test(value) || /^data:image\//i.test(value) || /^blob:/i.test(value)) return { src: value, message: "" };
    if (/^file:\/\//i.test(value)) return { src: "", message: "file:// はブラウザ制限で表示できません" };
    if (/^[a-zA-Z]:\\/.test(value)) return { src: "", message: "Windowsパスは assets 内へ置いて相対パスで指定" };
    if (/^\\\\/.test(value)) return { src: "", message: "UNCパスはHTTP配信外のため表示できません" };
    return { src: value.replace(/\\/g, "/"), message: "" };
  }
  function cacheBustPreviewSrc(src) {
    const value = String(src || "");
    if (!value || /^data:image\//i.test(value) || /^blob:/i.test(value)) return value;
    const separator = value.includes("?") ? "&" : "?";
    return `${value}${separator}_wbcb=${state.imageRefreshToken}`;
  }
  function refreshImageCache() { state.imageRefreshToken = Date.now(); }
  function setPreview(img, src, title, focus = "center") {
    const frame = img.closest(".image-frame");
    const preview = previewSource(src);
    const previewSrc = cacheBustPreviewSrc(preview.src);
    applyPreviewFocus(img, focus);
    img.alt = preview.src ? `${title}のプレビュー` : "";
    img.onload = () => {
      frame.classList.remove("missing");
      frame.removeAttribute("data-message");
      img.hidden = false;
    };
    img.onerror = () => {
      img.hidden = true;
      img.removeAttribute("src");
      frame.classList.add("missing");
      frame.dataset.message = "画像を読み込めません。直接画像URLか assets/... を指定してください。";
    };
    if (preview.src) {
      frame.classList.remove("missing");
      frame.removeAttribute("data-message");
      img.hidden = false;
      img.src = previewSrc;
    } else {
      frame.classList.add("missing");
      frame.dataset.message = preview.message;
      img.hidden = true;
      img.removeAttribute("src");
    }
  }
  function statusText(record) {
    if (!isChanged(record)) return "変更はありません。";
    return `変更中: ${originalSource(record).image || "未設定"} → ${imageOf(record) || "未設定"}`;
  }

  function setOptionalField(target, key, value) { if (value) target[key] = value; else delete target[key]; }
  function syncSelectedEditorState() {
    const record = selectedRecord();
    if (!record) return null;
    const url = els.imageInput.value.trim();
    const existingImage = imageOf(record);
    const nextFocus = els.focusInput.value || "center";
    const nextAlt = els.altInput.value.trim();
    if (url) record.target.image = url;
    if (url || existingImage) {
      if (supportsImageFocus(record)) record.target.imageFocus = nextFocus; else delete record.target.imageFocus;
      setOptionalField(record.target, "imageAlt", nextAlt);
    }
    return record;
  }
  function commitImageInput(record, silent = false) {
    if (!record) return false;
    const url = els.imageInput.value.trim();
    if (!url) {
      if (!silent) els.recordStatus.textContent = "画像URLが空です。削除する場合は「画像を削除」を使ってください。";
      return false;
    }
    record.target.image = url;
    if (supportsImageFocus(record)) record.target.imageFocus = els.focusInput.value || "center"; else delete record.target.imageFocus;
    setOptionalField(record.target, "imageAlt", els.altInput.value.trim());
    return true;
  }
  function applyImage() {
    const record = selectedRecord();
    if (!record) return;
    if (!commitImageInput(record)) return;
    afterEdit(record);
  }
  function deleteImage() {
    const record = selectedRecord();
    if (!record) return;
    delete record.target.image; delete record.target.imageFocus; delete record.target.imageAlt;
    afterEdit(record);
  }
  function revertImage() {
    const record = selectedRecord();
    if (!record) return;
    const source = originalSource(record);
    setOptionalField(record.target, "image", source.image || "");
    if (supportsImageFocus(record)) setOptionalField(record.target, "imageFocus", source.imageFocus || ""); else delete record.target.imageFocus;
    setOptionalField(record.target, "imageAlt", source.imageAlt || "");
    afterEdit(record);
  }
  function afterEdit(record) { refreshImageCache(); buildPatch(); updateSizeStatus("プレビューを更新しました"); selectRecord(record.key); }
  function dataUrlBytes(dataUrl) {
    const text = String(dataUrl || "");
    if (!text.startsWith("data:")) return text.length;
    const comma = text.indexOf(",");
    const payload = comma >= 0 ? text.slice(comma + 1) : text;
    return Math.round(payload.length * 0.75);
  }
  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  }
  function updateSizeStatus(message = "") {
    const totalBytes = state.records.reduce((sum, record) => sum + (String(record.target.image || "").startsWith("data:image/") ? dataUrlBytes(record.target.image) : 0), 0);
    els.sizeStatus.classList.toggle("warn", totalBytes > 8 * 1024 * 1024);
    els.sizeStatus.classList.toggle("danger", totalBytes > 16 * 1024 * 1024);
    els.sizeStatus.textContent = `${message ? `${message} / ` : ""}埋め込み画像の推定合計: ${formatBytes(totalBytes)}。目安は8MB以下です。`;
  }
  function canvasToDataUrl(canvas, format, quality) {
    if (format === "image/webp") {
      const webp = canvas.toDataURL("image/webp", quality);
      if (webp.startsWith("data:image/webp")) return webp;
    }
    return canvas.toDataURL("image/jpeg", quality);
  }
  async function optimizeImageFile(file) {
    const bitmap = await createImageBitmap(file);
    const maxEdge = Number(els.maxSizeInput.value || 1280);
    const quality = Number(els.qualityInput.value || 0.82);
    const format = els.formatInput.value || "image/webp";
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const dataUrl = canvasToDataUrl(canvas, format, quality);
    return { dataUrl, width, height, originalBytes: file.size || 0, outputBytes: dataUrlBytes(dataUrl) };
  }
  function useUploadedImage(result, fileName = "") {
    const record = selectedRecord();
    if (!record) {
      els.recordStatus.textContent = "先に左の一覧から項目を選択してください。";
      return;
    }
    els.imageInput.value = result.dataUrl;
    setPreview(els.nextPreview, result.dataUrl, record.title, focusOf(record));
    if (!els.altInput.value.trim() && fileName) els.altInput.value = `${record.title}の画像`;
    commitImageInput(record, true);
    afterEdit(record);
    const message = `${fileName || "画像"}: ${formatBytes(result.originalBytes)} → ${formatBytes(result.outputBytes)} (${result.width}x${result.height})`;
    els.recordStatus.textContent = `${message}。この項目へ直接画像として割り当てました。『本体へ反映』で保存できます。`;
    updateSizeStatus(message);
  }
  function useCategoryImageSelection() {
    const record = selectedRecord();
    const choice = state.categoryImageChoiceMap.get(els.categoryImageSelect.value || "");
    if (!record || !choice) return;
    els.imageInput.value = choice.image;
    els.focusInput.value = supportsImageFocus(record) ? (choice.focus || "center") : "center";
    if (!els.altInput.value.trim()) els.altInput.value = record.title + "に関係する" + choice.title + "の画像";
    commitImageInput(record, true);
    afterEdit(record);
    els.recordStatus.textContent = choice.label + " の画像を直接割り当てました。『本体へ反映』で保存できます。";
  }
  async function loadImageFile(file) {
    if (!file) return;
    if (!file.type || !file.type.startsWith("image/")) {
      els.recordStatus.textContent = "画像ファイルを選択してください。";
      return;
    }
    try {
      els.recordStatus.textContent = "画像を軽量化しています...";
      const result = await optimizeImageFile(file);
      useUploadedImage(result, file.name || "");
    } catch (error) {
      els.recordStatus.textContent = "画像ファイルを読み込めませんでした。別の画像で試してください。";
    }
  }

  function buildPatch() {
    syncSelectedEditorState();
    const operations = state.records.filter(isChanged).map((record) => ({
      type: record.type, id: record.id, title: record.title, file: fileFor(record.type),
      before: { image: originalSource(record).image || "", imageFocus: supportsImageFocus(record) ? (originalSource(record).imageFocus || "") : "", imageAlt: originalSource(record).imageAlt || "" },
      after: { image: record.target.image || "", imageFocus: supportsImageFocus(record) ? (record.target.imageFocus || "") : "", imageAlt: record.target.imageAlt || "" }
    }));
    const embeddedImageBytes = operations.reduce((sum, operation) => sum + (String(operation.after.image || "").startsWith("data:image/") ? dataUrlBytes(operation.after.image) : 0), 0);
    const patch = { schemaVersion: 1, generatedAt: new Date().toISOString(), purpose: "日本史教材 画像URL更新作業", embeddedImageBytes, embeddedImageSize: formatBytes(embeddedImageBytes), operations };
    els.patchOutput.value = JSON.stringify(patch, null, 2);
    return patch;
  }
  function fileFor(type) { return type === "person" ? "data/people-data.json" : type === "action" ? "data/action-cards.json" : "data/history-content.json"; }
  function embeddedImageCount() { return state.records.filter((record) => String(record.target.image || "").startsWith("data:image/")).length; }
  function downloadUpdatedJson() {
    download("people-data.updated.json", JSON.stringify(peopleData, null, 2) + "\n");
    download("action-cards.updated.json", JSON.stringify(actionData, null, 2) + "\n");
    download("history-content.updated.json", JSON.stringify(historyData, null, 2) + "\n");
  }
  function replaceObject(target, source) {
    for (const key of Object.keys(target)) delete target[key];
    Object.assign(target, clone(source));
  }
  function importDataObject(data, name = "") {
    if (data && data.historyContent && data.peopleData && data.actionData) {
      replaceObject(historyData, data.historyContent);
      replaceObject(peopleData, data.peopleData);
      replaceObject(actionData, data.actionData);
      return ["履歴", "人物", "アクション"];
    }
    if (data && Array.isArray(data.groups)) {
      replaceObject(historyData, data);
      return ["履歴"];
    }
    if (data && Array.isArray(data.people)) {
      replaceObject(peopleData, data);
      return ["人物"];
    }
    if (data && data.actionCards && typeof data.actionCards === "object") {
      replaceObject(actionData, data);
      return ["アクション"];
    }
    throw new Error(`${name || "JSON"} は対応している更新JSONではありません。`);
  }
  async function importUpdatedJsonFiles() {
    const files = [...(els.jsonImportInput.files || [])];
    if (!files.length) return;
    const imported = [];
    try {
      for (const file of files) {
        const data = JSON.parse(await file.text());
        imported.push(...importDataObject(data, file.name));
      }
      rebuildRecords();
      state.selectedKey = "";
      els.emptyState.hidden = false;
      els.editor.hidden = true;
      refreshImageCache();
      buildPatch();
      updateSizeStatus("読み込み後のプレビューを更新しました");
      renderList();
      els.applyStatus.textContent = `更新JSONを読み込みました: ${[...new Set(imported)].join("・")}。内容を確認してから本体へ反映してください。`;
    } catch (error) {
      els.applyStatus.textContent = `更新JSONを読み込めませんでした。${error.message || "ファイルを確認してください。"}`;
    } finally {
      els.jsonImportInput.value = "";
    }
  }
  async function applyToProject() {
    const selected = syncSelectedEditorState();
    if (selected && els.imageInput.value.trim()) refreshImageCache();
    const patch = buildPatch();
    const embeddedCount = embeddedImageCount();
    els.applyStatus.textContent = patch.operations.length || embeddedCount
      ? "本体へ反映しています..."
      : "本番データを再保存しています...";
    try {
      const response = await fetch("/api/apply-image-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historyContent: historyData, peopleData, actionData, patch })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || `HTTP ${response.status}`);
      if (result.datasets) {
        replaceObject(historyData, result.datasets.historyContent || historyData);
        replaceObject(peopleData, result.datasets.peopleData || peopleData);
        replaceObject(actionData, result.datasets.actionData || actionData);
      }
      rebuildRecords({ resetBaseline: true });
      await loadBackups(result.backupDir || "");
      refreshImageCache();
      els.applyStatus.textContent = `反映しました。assetsへ${result.materializedImages || 0}件の画像を書き出しました。教材本体を再読み込みし、開いているモーダルは閉じて開き直してください。バックアップ: ${result.backupDir || "作成済み"}`;
      buildPatch();
      updateSizeStatus("反映後のプレビューを更新しました");
      if (state.selectedKey) selectRecord(state.selectedKey); else renderList();
    } catch (error) {
      els.applyStatus.textContent = `自動反映できません。${error.message || "専用サーバー http://127.0.0.1:4184/image-workbench.html から開いてください。"}`;
    }
  }
  function renderBackupOptions(selectedDir = "") {
    if (!els.backupSelect) return;
    const options = ['<option value="">バックアップを選択</option>']
      .concat((state.backups || []).map((entry) => {
        const label = `${entry.createdAt || ""} / ${entry.kind || "backup"} / ${entry.dir || entry.name || ""}`;
        return `<option value="${escapeAttr(entry.dir || "")}">${escapeHtml(label)}</option>`;
      }));
    els.backupSelect.innerHTML = options.join("");
    if (selectedDir) els.backupSelect.value = selectedDir;
  }

  async function loadBackups(selectedDir = "") {
    if (!els.backupSelect) return;
    try {
      const response = await fetch("/api/backups", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || `HTTP ${response.status}`);
      state.backups = Array.isArray(result.backups) ? result.backups : [];
      renderBackupOptions(selectedDir);
    } catch (error) {
      els.applyStatus.textContent = `バックアップ一覧を取得できません。${error.message || ""}`;
    }
  }

  async function rollbackToBackup() {
    const backupDir = els.backupSelect?.value || "";
    if (!backupDir) {
      els.applyStatus.textContent = "ロールバックするバックアップを選択してください。";
      return;
    }
    els.applyStatus.textContent = "バックアップから復元しています...";
    try {
      const response = await fetch("/api/rollback-image-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupDir })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || `HTTP ${response.status}`);
      if (result.datasets) {
        replaceObject(historyData, result.datasets.historyContent || historyData);
        replaceObject(peopleData, result.datasets.peopleData || peopleData);
        replaceObject(actionData, result.datasets.actionData || actionData);
      }
      rebuildRecords({ resetBaseline: true });
      state.selectedKey = "";
      els.emptyState.hidden = false;
      els.editor.hidden = true;
      refreshImageCache();
      buildPatch();
      renderList();
      state.backups = Array.isArray(result.backups) ? result.backups : state.backups;
      renderBackupOptions(result.restoredFrom || "");
      els.applyStatus.textContent = `ロールバックしました。復元元: ${result.restoredFrom || backupDir} / 復元前バックアップ: ${result.rollbackBackupDir || "作成済み"}`;
    } catch (error) {
      els.applyStatus.textContent = `ロールバックできません。${error.message || ""}`;
    }
  }

  function download(name, text) {
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function currentDisplayedImage() {
    const record = selectedRecord();
    return record ? effectiveVisual(record).image || "" : "";
  }
  async function copyText(value, label) {
    if (!value) {
      els.recordStatus.textContent = `${label}はありません。`;
      return;
    }
    await navigator.clipboard.writeText(value);
    els.recordStatus.textContent = `${label}をコピーしました。`;
  }
  function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char])); }
  function escapeAttr(value) { return escapeHtml(value); }

  els.typeFilter.addEventListener("change", renderList);
  els.imageFilter.addEventListener("change", renderList);
  els.searchInput.addEventListener("input", renderList);
  els.recordList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-key]");
    if (!button) return;
    const current = selectedRecord();
    const inputValue = els.imageInput.value.trim();
    if (current && inputValue && (
      inputValue !== imageOf(current)
      || (supportsImageFocus(current) && (els.focusInput.value || "center") !== focusOf(current))
      || els.altInput.value.trim() !== altOf(current)
    )) commitImageInput(current, true);
    selectRecord(button.dataset.key);
  });
  els.imageInput.addEventListener("input", () => {
    const record = selectedRecord();
    setPreview(els.nextPreview, els.imageInput.value.trim(), record?.title || "", record ? focusOf(record) : "center");
    const choice = matchingCategoryImageChoice(els.imageInput.value.trim());
    els.categoryImageSelect.value = choice?.key || "";
  });
  els.focusInput.addEventListener("change", () => {
    const record = selectedRecord();
    if (!record || !supportsImageFocus(record) || (!els.imageInput.value.trim() && !imageOf(record))) return;
    commitImageInput(record, true);
    setPreview(els.nextPreview, els.imageInput.value.trim(), record.title, focusOf(record));
    const visual = effectiveVisual(record);
    setPreview(els.currentPreview, visual.image, record.title, visual.focus || "center");
    buildPatch();
    renderList();
    els.recordStatus.textContent = "表示位置を変更しました。『本体へ反映』で保存できます。";
  });
  els.categoryImageSelect.addEventListener("change", useCategoryImageSelection);
  els.fileInput.addEventListener("change", () => loadImageFile(els.fileInput.files?.[0]));
  els.dropZone.addEventListener("dragover", (event) => { event.preventDefault(); els.dropZone.classList.add("drag-over"); });
  els.dropZone.addEventListener("dragleave", () => els.dropZone.classList.remove("drag-over"));
  els.dropZone.addEventListener("drop", (event) => { event.preventDefault(); els.dropZone.classList.remove("drag-over"); loadImageFile(event.dataTransfer?.files?.[0]); });
  document.addEventListener("paste", (event) => {
    const file = [...(event.clipboardData?.files || [])].find((item) => item.type && item.type.startsWith("image/"));
    if (file) loadImageFile(file);
  });
  els.applyButton.addEventListener("click", applyImage);
  els.deleteButton.addEventListener("click", deleteImage);
  els.revertButton.addEventListener("click", revertImage);
  els.applyToProjectButton.addEventListener("click", applyToProject);
  els.jsonImportInput.addEventListener("change", importUpdatedJsonFiles);
  els.copyDisplayedImageButton.addEventListener("click", () => copyText(currentDisplayedImage(), "表示画像URL"));
  els.copyDirectImageButton.addEventListener("click", () => { const record = selectedRecord(); copyText(record ? imageOf(record) : "", "直接割り当てURL"); });
  els.copyPatchButton.addEventListener("click", async () => { await navigator.clipboard.writeText(JSON.stringify(buildPatch(), null, 2)); });
  els.downloadPatchButton.addEventListener("click", () => download("image-workbench-patch.json", JSON.stringify(buildPatch(), null, 2) + "\n"));
  els.downloadJsonButton.addEventListener("click", downloadUpdatedJson);
  els.reloadBackupsButton?.addEventListener("click", () => loadBackups(els.backupSelect?.value || ""));
  els.rollbackButton?.addEventListener("click", rollbackToBackup);

  rebuildRecords({ resetBaseline: true });
  buildPatch();
  renderList();
  loadBackups();
})();


































