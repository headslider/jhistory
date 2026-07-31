let eras = [];
let eraImages = {};
let eraGroups = [];
let eraDetails = {};
let groupRubyBoldTermsById = new Map();
let powers = [];
let eraEventSubcategories = [];
let eventSubcategoryById = new Map();
let people = [];
let personByName = new Map();
let personGenreLabels = {};
let activeLineageId = null;
let activeContentMenuItemId = null;
let lineageCloseTimer = null;
let lineageSwitchTimer = null;
let lineageThemeMenuOpen = false;

let lineageThemes = [];
let lineageThemeMenuSections = [];
let contentMenuSections = [];
let contentMenuItemsById = new Map();

function normalizeLineageThemesData(data) {
  const sourceThemes = Array.isArray(data?.themes) ? data.themes : [];
  const order = Array.isArray(data?.order) ? data.order : sourceThemes.map((theme) => theme.id);
  const registry = new Map(sourceThemes
    .filter((theme) => theme && theme.id)
    .map((theme) => [theme.id, theme]));
  const orderedThemes = order.map((id) => registry.get(id)).filter(Boolean);
  const orderedThemeIds = new Set(orderedThemes.map((theme) => theme.id));
  const orderedThemeById = new Map(orderedThemes.map((theme) => [theme.id, theme]));
  lineageThemeMenuSections = Array.isArray(data?.menuSections)
    ? data.menuSections.map((section) => ({
      id: String(section?.id || '').trim(),
      themeId: typeof section?.themeId === 'string' && orderedThemeIds.has(section.themeId) ? section.themeId : '',
      title: String(section?.title || '').trim(),
      themeIds: (Array.isArray(section?.themeIds) ? section.themeIds : [])
        .filter((id) => typeof id === 'string' && orderedThemeIds.has(id))
    })).filter((section) => section.id && section.themeId && section.title && section.themeIds.length)
    : [];
  contentMenuItemsById = new Map();
  contentMenuSections = Array.isArray(data?.contentMenuSections)
    ? data.contentMenuSections.map((section) => {
      const source = String(section?.source || '').trim();
      const items = source === 'lineageThemes'
        ? []
        : (Array.isArray(section?.items) ? section.items : []).map((item) => {
          const type = String(item?.type || '').trim();
          if (type === 'lineage') {
            const theme = orderedThemeById.get(item?.themeId);
            if (!theme) return null;
            return {
              type,
              id: `lineage:${theme.id}`,
              themeId: theme.id,
              title: String(item?.title || theme.title || '').trim(),
              subtitle: String(item?.subtitle || theme.summary || '').trim()
            };
          }
          if (type === 'content') {
            const id = String(item?.id || '').trim();
            const normalized = {
              type,
              id,
              title: String(item?.title || '').trim(),
              subtitle: String(item?.subtitle || '').trim(),
              summary: String(item?.summary || '').trim(),
              detail: String(item?.detail || item?.summary || '').trim(),
              relatedPeople: (Array.isArray(item?.relatedPeople) ? item.relatedPeople : [])
                .map((name) => String(name || '').trim())
                .filter(Boolean)
            };
            if (normalized.id && normalized.title) contentMenuItemsById.set(normalized.id, normalized);
            return normalized.id && normalized.title ? normalized : null;
          }
          return null;
        }).filter(Boolean);
      return {
        id: String(section?.id || '').trim(),
        title: String(section?.title || '').trim(),
        subtitle: String(section?.subtitle || '').trim(),
        source,
        items
      };
    }).filter((section) => section.id && section.title && (section.source === 'lineageThemes' || section.items.length))
    : [];
  if (!contentMenuSections.length) {
    contentMenuSections = [{
      id: 'lineage',
      title: '系譜',
      subtitle: 'テーマで歴史の流れを見る',
      source: 'lineageThemes',
      items: []
    }];
  }
  return orderedThemes;
}
async function loadLineageThemesData() {
  if (window.JAPAN_HISTORY_LINEAGE_THEMES_DATA) {
    lineageThemes = normalizeLineageThemesData(window.JAPAN_HISTORY_LINEAGE_THEMES_DATA);
    document.documentElement.dataset.lineageThemesSource = "js";
    return;
  }
  const response = await fetch("data/lineage-themes.json");
  if (!response.ok) throw new Error("lineage themes fetch failed");
  lineageThemes = normalizeLineageThemesData(await response.json());
  document.documentElement.dataset.lineageThemesSource = "json";
}

function normalizeHistoryContent(content) {
  if (!content || !Array.isArray(content.groups)) throw new Error("history content is invalid");
  eraImages = content.eraImages || {};
  eraGroups = content.groups.map((group) => ({
    id: group.id,
    title: group.title,
    heading: group.heading,
    focus: group.focus,
    icon: group.icon,
    colors: group.colors,
    westernYear: group.westernYear || "",
    eras: (group.eras || []).map((era) => era.id)
  }));
  eras = content.groups.flatMap((group) => (group.eras || []).map((era) => ({
    id: era.id,
    name: era.name,
    years: era.years,
    westernYear: era.westernYear,
    icon: era.icon,
    colors: era.colors,
    question: era.question,
    life: era.cards?.life?.summary || "",
    event: era.cards?.event?.summary || "",
    power: era.cards?.power?.summary || ""
  })));
  eraDetails = {};
  powers = [];
  eraEventSubcategories = [];
  content.groups.forEach((group) => {
    (group.eras || []).forEach((era) => {
      eraDetails[era.id] = {
        life: era.cards?.life?.detail || "",
        event: era.cards?.event?.detail || "",
        power: era.cards?.power?.detail || ""
      };
      (era.powers || []).forEach((power) => {
        powers.push([power.name, power.eraName || era.name, power.where, power.people, power.reason, power.life]);
      });
      (era.subcategories || []).forEach((subcategory) => {
        eraEventSubcategories.push({
          id: subcategory.id,
          eraId: era.id,
          title: subcategory.title,
          summary: subcategory.summary,
          text: subcategory.text,
          tags: subcategory.tags || [],
          actions: subcategory.actions || [],
          people: subcategory.people || [],
          yearLabel: subcategory.yearLabel || "",
          image: subcategory.image || "",
          imageFocus: subcategory.imageFocus || "center"
        });
      });
    });
  });
  eventSubcategoryById = new Map(eraEventSubcategories.map((item) => [item.id, item]));
}

async function loadHistoryContent() {
  if (window.historyContentData) {
    normalizeHistoryContent(window.historyContentData);
    document.documentElement.dataset.historyContentSource = "js";
    return;
  }
  const response = await fetch("data/history-content.json");
  if (!response.ok) throw new Error("history content fetch failed");
  normalizeHistoryContent(await response.json());
  document.documentElement.dataset.historyContentSource = "json";
}

let actionCards = {};

function normalizeActionCardEntry(name, entry) {
  if (Array.isArray(entry)) {
    const [summary, legacyDescription, tags = []] = entry;
    return {
      summary,
      tags,
      modal: {
        whatHappened: legacyDescription || "",
        whyImportant: ""
      }
    };
  }
  const tags = Array.isArray(entry?.tags) ? entry.tags : [];
  const modal = entry?.modal || {};
  return {
    summary: entry?.summary || "",
    reading: entry?.reading || entry?.ruby?.reading || "",
    ruby: entry?.ruby || null,
    tags,
    image: entry?.image || "",
    imageFocus: entry?.imageFocus || "center",
    imageAlt: entry?.imageAlt || "",
    modal: {
      whatHappened: modal.whatHappened || entry?.whatHappened || entry?.text || "",
      whyImportant: modal.whyImportant || entry?.whyImportant || ""
    }
  };
}

function normalizeActionCardsData(data) {
  actionCards = Object.fromEntries(Object.entries(data?.actionCards || {})
    .map(([name, entry]) => [name, normalizeActionCardEntry(name, entry)]));
}

async function loadActionCardsData() {
  if (window.JAPAN_HISTORY_ACTION_CARDS_DATA) {
    normalizeActionCardsData(window.JAPAN_HISTORY_ACTION_CARDS_DATA);
    document.documentElement.dataset.actionCardsSource = "js";
    return;
  }
  const response = await fetch("data/action-cards.json");
  if (!response.ok) throw new Error("action cards fetch failed");
  normalizeActionCardsData(await response.json());
  document.documentElement.dataset.actionCardsSource = "json";
}

const quizzes = [
  { q: "米づくりが広がった時代は？", a: "弥生時代", options: ["縄文時代後半", "弥生時代", "江戸時代"] },
  { q: "武士が政治を行うしくみを何という？", a: "幕府", options: ["土器", "幕府", "かな文字"] },
  { q: "江戸幕府を開いた人は？", a: "徳川家康", options: ["徳川家康", "卑弥呼", "紫式部"] }
];

let rubyGlossary = {};
let termTooltipGlossary = {};

function normalizeLearningTermsData(data) {
  const terms = data && typeof data === "object" && data.terms && typeof data.terms === "object"
    ? data.terms
    : (data && typeof data === "object" ? data : {});
  const readings = {};
  const tooltips = {};
  Object.entries(terms).forEach(([term, value]) => {
    if (typeof value === "string") {
      readings[term] = value;
      return;
    }
    if (!value || typeof value !== "object") return;
    if (value.reading) readings[term] = value.reading;
    if (value.tooltip) tooltips[term] = value.tooltip;
  });
  return { readings, tooltips };
}

async function loadLearningTermsData() {
  if (window.JAPAN_HISTORY_LEARNING_TERMS_DATA) {
    const normalized = normalizeLearningTermsData(window.JAPAN_HISTORY_LEARNING_TERMS_DATA);
    rubyGlossary = normalized.readings;
    termTooltipGlossary = normalized.tooltips;
    document.documentElement.dataset.learningTermsSource = "js";
    return;
  }
  const response = await fetch("data/learning-terms.json");
  if (!response.ok) throw new Error("learning terms fetch failed");
  const normalized = normalizeLearningTermsData(await response.json());
  rubyGlossary = normalized.readings;
  termTooltipGlossary = normalized.tooltips;
  document.documentElement.dataset.learningTermsSource = "json";
}
const favorites = new Set(JSON.parse(localStorage.getItem("historyFavorites") || "[]"));
const peopleTools = document.querySelector(".people-tools");
let activeFilter = "all";
let activeQuiz = 0;
let activeEraDetail = null;
const modalHistory = [];
let currentModalEntry = null;

function normalizePersonRecord(record, modalDetails = {}) {
  if (Array.isArray(record)) {
    const [name, kana, era, field, title, legacyProfile, icon] = record;
    const modal = modalDetails[name] || {};
    const person = { name, kana, era, field, title, icon, modal: { profile: legacyProfile || "", ...modal } };
    return { ...person, primaryEraId: "", genre: "" };
  }
  const modal = record.modal || modalDetails[record.name] || {};
  const person = {
    name: record.name || "",
    kana: record.kana || record.reading || "",
    era: record.era || "",
    primaryEraId: typeof record.primaryEraId === "string" ? record.primaryEraId : "",
    genre: typeof record.genre === "string" ? record.genre : "",
    field: record.field || record.category || record.related || "",
    title: record.title || record.role || "",
    icon: record.icon || "👤",
    aliases: Array.isArray(record.aliases) ? record.aliases : [],
    nameAliases: Array.isArray(record.nameAliases) ? record.nameAliases : [],
    displayName: record.displayName || "",
    rubyName: record.rubyName || "",
    rubyKana: record.rubyKana || "",
    nameQualifier: record.nameQualifier || "",
    image: record.image || "",
    imageFocus: record.imageFocus || "center",
    imageAlt: record.imageAlt || "",
    lifespan: record.lifespan || "",
    modal
  };
  return person;
}

function normalizePeopleData(data) {
  const modalDetails = data.personModalDetails || {};
  personGenreLabels = data.genreLabels || {};
  people = (data.people || []).map((person) => normalizePersonRecord(person, modalDetails));
  personByName = new Map();
  people.forEach((person) => {
    [person.name, person.displayName, ...personAliases(person)].filter(Boolean).forEach((name) => {
      if (!personByName.has(name)) personByName.set(name, person);
    });
  });
}

async function loadPeopleData() {
  if (window.JAPAN_HISTORY_PEOPLE_DATA) {
    normalizePeopleData(window.JAPAN_HISTORY_PEOPLE_DATA);
    document.documentElement.dataset.peopleDataSource = "js";
    return;
  }
  const response = await fetch("data/people-data.json");
  if (!response.ok) throw new Error(`people-data.json could not be loaded: ${response.status}`);
  normalizePeopleData(await response.json());
  document.documentElement.dataset.peopleDataSource = "json";
}

function hasKatakana(text) {
  return /[\u30A1-\u30FA\u30FC]/.test(String(text || ""));
}

function hasRubyBlockingKatakana(text) {
  const source = String(text || "");
  const katakana = source.match(/[\u30A1-\u30FA\u30FC]/g) || [];
  if (!katakana.length) return false;
  const hasKanji = /[\u3400-\u9FFF]/.test(source);
  // 関ヶ原・壇ノ浦のような日本史固有名の表記は、外来語カタカナとは分けて扱う。
  if (hasKanji && katakana.every((char) => char === "ヶ" || char === "ノ")) return false;
  return true;
}

function shouldApplyRuby(text, reading) {
  return Boolean(reading) && !hasRubyBlockingKatakana(text);
}

function ruby(text, reading) {
  const safeText = escapeHtml(String(text || ""));
  if (!shouldApplyRuby(text, reading)) return safeText;
  return `<ruby>${safeText}<rt>${escapeHtml(String(reading))}</rt></ruby>`;
}

function personAliases(person) {
  return [...new Set([...(person.aliases || []), ...(person.nameAliases || []), person.displayName].filter((name) => name && name !== person.name))];
}

function personDisplayNameText(person) {
  return person.displayName || (person.nameQualifier ? `${person.name}（${person.nameQualifier}）` : person.name);
}

function personLifespanHtml(person) {
  const lifespan = String(person.lifespan || "").trim();
  return lifespan ? `<span class="modal-lifespan">（${escapeHtml(lifespan)}）</span>` : "";
}

function personDisplayNameHtml(person) {
  if (person.rubyName || person.nameQualifier) {
    const baseName = person.rubyName || person.name;
    const reading = person.rubyKana || person.kana;
    const qualifier = person.nameQualifier ? `（${escapeHtml(person.nameQualifier)}）` : "";
    return `${ruby(baseName, reading)}${qualifier}`;
  }
  if (person.displayName && person.displayName !== person.name) return applyStudyRuby(person.displayName);
  return ruby(person.name, person.kana);
}

function eraFor(name) {
  return eras.find((era) => name.includes(era.name.replace("時代", ""))) || eras.find((era) => era.name === name) || eras[0];
}

function personBelongsToEra(person, era) {
  return person.primaryEraId === era.id;
}

function getEraDetail(era, type) {
  const titles = {
    life: "くらしをもっと知る",
    event: "できごとをもっと知る",
    power: "大きな力をもっと知る"
  };
  return { title: titles[type], text: eraDetails[era.id]?.[type] || "" };
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function termTooltipHtml(word, innerHtml) {
  if (hasModalLinkTarget(word)) return `<strong>${innerHtml}</strong>`;
  const tooltip = termTooltipGlossary[word];
  if (!tooltip) return `<strong>${innerHtml}</strong>`;
  const label = `${word}。${tooltip}`;
  return `<strong class="term-tooltip" tabindex="0" role="button" aria-expanded="false" data-term-tooltip="${escapeHtml(tooltip)}" aria-label="${escapeHtml(label)}">${innerHtml}</strong>`;
}

let activeTermTooltipTarget = null;
let termTooltipLayer = null;
let termTooltipSetupDone = false;

function ensureTermTooltipLayer() {
  if (termTooltipLayer) return termTooltipLayer;
  termTooltipLayer = document.createElement("div");
  termTooltipLayer.className = "term-tooltip-layer";
  termTooltipLayer.setAttribute("role", "tooltip");
  termTooltipLayer.setAttribute("aria-hidden", "true");
  document.body.appendChild(termTooltipLayer);
  return termTooltipLayer;
}

function closestTermTooltip(target) {
  return target instanceof Element ? target.closest(".term-tooltip[data-term-tooltip]") : null;
}

function positionTermTooltip(target) {
  if (!target) return;
  const layer = ensureTermTooltipLayer();
  const margin = 12;
  const gap = 12;
  const rect = target.getBoundingClientRect();
  const layerRect = layer.getBoundingClientRect();
  const width = layerRect.width;
  const height = layerRect.height;
  let left = rect.left + rect.width / 2 - width / 2;
  left = Math.min(Math.max(left, margin), Math.max(margin, window.innerWidth - width - margin));
  let top = rect.bottom + gap;
  const canShowAbove = rect.top - height - gap >= margin;
  const wouldClipBottom = top + height + margin > window.innerHeight;
  const showAbove = wouldClipBottom && canShowAbove;
  if (showAbove) top = rect.top - height - gap;
  top = Math.min(Math.max(top, margin), Math.max(margin, window.innerHeight - height - margin));
  const arrowLeft = Math.min(Math.max(rect.left + rect.width / 2 - left, 16), Math.max(16, width - 16));
  layer.style.left = `${left}px`;
  layer.style.top = `${top}px`;
  layer.style.setProperty("--tooltip-arrow-left", `${arrowLeft}px`);
  layer.classList.toggle("above", showAbove);
}

function showTermTooltip(target) {
  const tooltip = target?.getAttribute("data-term-tooltip");
  if (!tooltip) return;
  const layer = ensureTermTooltipLayer();
  if (activeTermTooltipTarget && activeTermTooltipTarget !== target) {
    activeTermTooltipTarget.setAttribute("aria-expanded", "false");
  }
  activeTermTooltipTarget = target;
  target.setAttribute("aria-expanded", "true");
  layer.innerHTML = applyStudyRuby(tooltip, { disableTooltips: true });
  layer.setAttribute("aria-hidden", "false");
  positionTermTooltip(target);
  layer.classList.add("visible");
}

function hideTermTooltip(target) {
  if (target && activeTermTooltipTarget && target !== activeTermTooltipTarget) return;
  const layer = ensureTermTooltipLayer();
  if (activeTermTooltipTarget) activeTermTooltipTarget.setAttribute("aria-expanded", "false");
  activeTermTooltipTarget = null;
  layer.classList.remove("visible", "above");
  layer.setAttribute("aria-hidden", "true");
}

function toggleTermTooltip(target) {
  if (!target) return;
  if (activeTermTooltipTarget === target && ensureTermTooltipLayer().classList.contains("visible")) {
    hideTermTooltip(target);
    return;
  }
  showTermTooltip(target);
}

function hasHoverPointer() {
  return window.matchMedia?.("(hover: hover) and (pointer: fine)").matches === true;
}

function setupTermTooltips() {
  if (termTooltipSetupDone) return;
  termTooltipSetupDone = true;
  document.addEventListener("pointerover", (event) => {
    if (!hasHoverPointer()) return;
    const target = closestTermTooltip(event.target);
    if (!target) return;
    showTermTooltip(target);
  });
  document.addEventListener("pointerout", (event) => {
    if (!hasHoverPointer()) return;
    const target = closestTermTooltip(event.target);
    if (!target) return;
    const related = event.relatedTarget;
    if (related && (target.contains(related) || ensureTermTooltipLayer().contains(related))) return;
    hideTermTooltip(target);
  });
  document.addEventListener("focusin", (event) => {
    const target = closestTermTooltip(event.target);
    if (target) showTermTooltip(target);
  });
  document.addEventListener("focusout", (event) => {
    const target = closestTermTooltip(event.target);
    if (target) hideTermTooltip(target);
  });
  document.addEventListener("pointerdown", (event) => {
    const target = closestTermTooltip(event.target);
    if (target || event.target.closest?.(".term-tooltip-layer")) {
      event.stopPropagation();
    }
  }, true);
  document.addEventListener("click", (event) => {
    const target = closestTermTooltip(event.target);
    if (target) {
      event.preventDefault();
      event.stopPropagation();
      toggleTermTooltip(target);
      return;
    }
    if (event.target.closest?.(".term-tooltip-layer")) {
      event.stopPropagation();
      return;
    }
    if (activeTermTooltipTarget) hideTermTooltip(activeTermTooltipTarget);
  }, true);
  document.addEventListener("contextmenu", (event) => {
    const target = closestTermTooltip(event.target);
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    toggleTermTooltip(target);
  }, true);
  document.addEventListener("keydown", (event) => {
    const target = closestTermTooltip(event.target);
    if (target && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      event.stopPropagation();
      toggleTermTooltip(target);
      return;
    }
    if (event.key === "Escape" && activeTermTooltipTarget) hideTermTooltip(activeTermTooltipTarget);
  }, true);
  document.addEventListener("mousemove", () => {
    if (activeTermTooltipTarget) positionTermTooltip(activeTermTooltipTarget);
  });
  window.addEventListener("scroll", () => {
    if (activeTermTooltipTarget) positionTermTooltip(activeTermTooltipTarget);
  }, true);
  window.addEventListener("resize", () => {
    if (activeTermTooltipTarget) positionTermTooltip(activeTermTooltipTarget);
  });
}
function studyRubyReadings() {
  return new Map([
    ...Object.entries(rubyGlossary),
    ...Object.entries(actionCards)
      .map(([name, action]) => [name, action.ruby?.reading || action.reading || ""])
      .filter(([, reading]) => Boolean(reading)),
    ...people.map((person) => [person.name, person.kana]),
    ...people.filter((person) => person.rubyName).map((person) => [person.rubyName, person.rubyKana || person.kana])
  ]);
}

function isRubyWordBoundary(source, index, word) {
  if (String(word || "").length > 1) return true;
  const before = index > 0 ? source[index - 1] : "";
  const after = source[index + word.length] || "";
  if (word === "調" && after === "べ") return false;
  return !isKanjiCharacter(before) && !isKanjiCharacter(after);
}

function applyStudyRuby(text, options = {}) {
  const source = String(text || "");
  const readings = studyRubyReadings();
  const words = [...readings.keys()]
    .filter((word) => source.includes(word))
    .filter((word) => shouldApplyRuby(word, readings.get(word)))
    .sort((a, b) => b.length - a.length);
  const escaped = escapeHtml(source);
  if (!words.length) return escaped;
  const pattern = new RegExp(words.map(escapeRegExp).join("|"), "g");
  const boldTerms = options.boldTerms instanceof Set ? options.boldTerms : null;
  const disableTooltips = options.disableTooltips === true;
  return escaped.replace(pattern, (word, index) => {
    if (!isRubyWordBoundary(source, index, word)) return word;
    const html = `<ruby>${escapeHtml(word)}<rt>${escapeHtml(String(readings.get(word)))}</rt></ruby>`;
    if (!boldTerms || disableTooltips || boldTerms.has(word)) return html;
    boldTerms.add(word);
    return termTooltipHtml(word, html);
  });
}

const inlineLinkAliases = [
  { name: "第二次世界大戦", type: "action", target: "第二次世界大戦 (太平洋戦争含む )" },
  { name: "太平洋戦争", type: "action", target: "太平洋戦争(第二次世界大戦)" },
  { name: "北条氏", type: "action", target: "鎌倉北条氏" },
  { name: "足利氏", type: "action", target: "室町幕府" },
  { name: "豊臣氏", type: "action", target: "天下統一" },
  { name: "徳川氏", type: "action", target: "江戸幕府" },
  { name: "足利義昭", type: "action", target: "室町幕府" },
  { name: "壇ノ浦の戦い", type: "event", target: "heian-genpei" },
  { name: "比叡山延暦寺焼き討ち", type: "event", target: "sengoku-ishiyama-hieizan" },
  { name: "羽柴秀吉", type: "person", target: "豊臣秀吉" },
  { name: "秀吉", type: "person", target: "豊臣秀吉" },
  { name: "信長", type: "person", target: "織田信長" },
  { name: "家康", type: "person", target: "徳川家康" },
  { name: "光秀", type: "person", target: "明智光秀" },
  { name: "義昭", type: "person", target: "足利義昭" },
  { name: "義満", type: "person", target: "足利義満" },
  { name: "勝頼", type: "person", target: "武田勝頼" },
  { name: "信玄", type: "person", target: "武田信玄" },
  { name: "頼朝", type: "person", target: "源頼朝" },
  { name: "義経", type: "person", target: "源義経" }
];

// Action-card titles that are safe to link even when a kanji sits next to them
// (e.g. followed by 後: 元寇後 / 第二次世界大戦後). They are unambiguous terms, so the
// usual kanji-adjacency guard would only ever reject a valid link here.
const kanjiAdjacentActionTitles = new Set(["元寇", "第二次世界大戦"]);

function stripActionParentheticalName(name) {
  return String(name || "").replace(/\s*[（(][^）)]*[）)]\s*/g, "").trim();
}

function actionParentheticalAliases() {
  return Object.keys(actionCards)
    .map((target) => ({ name: stripActionParentheticalName(target), type: "action", target, allowKanjiAdjacent: true }))
    .filter((item) => item.name && item.name !== item.target && !actionCards[item.name]);
}

function modalLinkTerms() {
  return new Set([
    ...people.flatMap((person) => [person.name, person.displayName, ...personAliases(person)]),
    ...Object.keys(actionCards),
    ...eraEventSubcategories.map((item) => item.title),
    ...actionParentheticalAliases().map((item) => item.name),
    ...inlineLinkAliases.map((item) => item.name)
  ].filter(Boolean));
}

function hasModalLinkTarget(word) {
  return modalLinkTerms().has(word);
}
function inlineLinkItemKey(item) {
  return `${item.type}:${item.name}:${item.target || ""}`;
}

function isKanjiCharacter(char) {
  return /[々〇〻\u3400-\u9fff\uf900-\ufaff]/u.test(char || "");
}

function isInlineLinkBoundary(text, index, name, item) {
  if (item?.type === "person" || item?.allowKanjiAdjacent) return true;
  const before = index > 0 ? text[index - 1] : "";
  const after = text[index + name.length] || "";
  return !isKanjiCharacter(before) && !isKanjiCharacter(after);
}

function enrichDetailLinks(text, options = {}) {
  const rubyOptions = options.groupRubyBoldTerms instanceof Set ? { boldTerms: options.groupRubyBoldTerms } : {};
  const peopleItems = people
    .flatMap((person) => [person.name, ...personAliases(person)].map((name) => ({ name, type: "person", target: person.name })))
    .filter((item) => text.includes(item.name));
  const actionItems = Object.keys(actionCards)
    .filter((name) => {
      if (name === "元") return /元が大軍|元の襲来|元寇/.test(text);
      return text.includes(name);
    })
    .map((name) => ({ name, type: "action", target: name, allowKanjiAdjacent: kanjiAdjacentActionTitles.has(name) }));
  const currentEventTitle = options.currentEventTitle || "";
  const eventItems = eraEventSubcategories
    .filter((item) => item.title && item.title !== currentEventTitle && !actionCards[item.title] && text.includes(item.title))
    .map((item) => ({ name: item.title, type: "event", target: item.id }));
  const aliasItems = [...actionParentheticalAliases(), ...inlineLinkAliases]
    .filter((item) => text.includes(item.name))
    .filter((item) => item.type !== "person" || personByName.has(item.target))
    .filter((item) => item.type !== "action" || actionCards[item.target])
    .filter((item) => item.type !== "event" || eventSubcategoryById.has(item.target))
    .map((item) => ({ ...item }));
  const items = [...peopleItems, ...actionItems, ...eventItems, ...aliasItems]
    .filter((item, index, all) => all.findIndex((candidate) => inlineLinkItemKey(candidate) === inlineLinkItemKey(item)) === index)
    .sort((a, b) => b.name.length - a.name.length);
  if (!items.length) return applyStudyRuby(text, rubyOptions);
  const itemMap = new Map(items.map((item) => [item.name, item]));
  const pattern = new RegExp(items.map((item) => escapeRegExp(item.name)).join("|"), "g");
  const groupPersonLinks = options.groupPersonLinks instanceof Set ? options.groupPersonLinks : null;
  const localPersonLinkTargets = new Set((options.localPersonNames || [])
    .map((name) => personByName.get(name)?.name || name)
    .filter(Boolean));
  const used = new Set();
  let cursor = 0;
  let html = "";
  for (const match of text.matchAll(pattern)) {
    const name = match[0];
    const index = match.index;
    html += applyStudyRuby(text.slice(cursor, index), rubyOptions);
    const item = itemMap.get(name);
    if (!isInlineLinkBoundary(text, index, name, item)) {
      html += applyStudyRuby(name, { disableTooltips: true });
      cursor = index + name.length;
      continue;
    }
    const usedKey = inlineLinkItemKey(item);
    const groupPersonKey = item.type === "person" && groupPersonLinks ? (item.target || item.name) : "";
    const inlineLabelOptions = { disableTooltips: true };
    const label = name === "元" ? ruby("元", "げん") : applyStudyRuby(name, inlineLabelOptions);
    const currentEntry = options.currentEntry || null;
    const isCurrentModalTarget = currentEntry && item.type === currentEntry.type && (item.target || item.name) === currentEntry.id;
    if (isCurrentModalTarget) {
      html += `<strong>${label}</strong>`;
    } else if (used.has(usedKey) || (groupPersonKey && groupPersonLinks.has(groupPersonKey) && !localPersonLinkTargets.has(groupPersonKey))) {
      html += applyStudyRuby(name, { disableTooltips: true });
    } else {
      used.add(usedKey);
      if (groupPersonKey) groupPersonLinks.add(groupPersonKey);
      const attrTarget = escapeHtml(item.target || name);
      if (item.type === "action") {
        html += `<button class="action-inline" type="button" data-action-name="${attrTarget}"><strong>${label}</strong></button>`;
      } else if (item.type === "event") {
        html += `<button class="event-inline" type="button" data-event-id="${attrTarget}"><strong>${label}</strong></button>`;
      } else {
        html += `<button class="person-inline" type="button" data-person-name="${attrTarget}"><strong>${label}</strong></button>`;
      }
    }
    cursor = index + name.length;
  }
  html += applyStudyRuby(text.slice(cursor), rubyOptions);
  return html;
}

function renderEraLinks() {
  const contentLinks = [
    { href: "#top", label: "トップ", meta: "はじめに" },
    { href: "#intro", label: "学び方", meta: "くらし・国・人物" },
    { href: "#timeline", label: "年表", meta: "7つの大きな区切り" },
    ...eraGroups.map((group) => ({
      href: `#group-${group.id}`,
      label: group.title,
      meta: group.heading,
      groupId: group.id
    })),
    { href: "#people", label: "人物図鑑", meta: "時代を動かした人たち" },
    { href: "#quiz", label: "ミニクイズ", meta: "学びの確認" },
    { href: "#guide", label: "使い方のヒント", meta: "保護者・先生へ" }
  ];
  eraLinks.innerHTML = contentLinks.map((link) => `
    <a class="${link.groupId ? "is-timeline-child" : ""}" href="${link.href}"${link.groupId ? ` data-group-id="${link.groupId}"` : ""}>
      <span>${link.label}</span>
      <small>${link.meta}</small>
    </a>
  `).join("");
}

function renderEraCard(era, groupPersonLinks = null, groupRubyBoldTerms = null) {
  const groupRubyOptions = groupRubyBoldTerms instanceof Set ? { boldTerms: groupRubyBoldTerms } : {};
  const headingRubyOptions = { disableTooltips: true };
  const eraPowers = powers.filter((p) => p[1] === era.name || era.name.includes(p[1].replace("時代", "")));
  const eraPeople = people.filter((p) => personBelongsToEra(p, era));
  const eraEvents = eraEventSubcategories.filter((item) => item.eraId === era.id);
  const eraImage = eraImages[era.id];
  return `
    <article class="era" id="era-${era.id}" data-era="${era.name}" data-icon="${era.icon}" data-western-year="${era.westernYear}" style="--era-a:${era.colors[0]};--era-b:${era.colors[1]};color:${era.colors[0]}">
      <span class="mobile-year-chip era-year-chip" aria-hidden="true">${escapeHtml(era.westernYear || "")}</span>
      <div class="era-card">
        <header class="era-head">
          <p class="eyebrow">${era.years}</p>
          <h2>${applyStudyRuby(era.name, headingRubyOptions)}</h2>
          <p>${applyStudyRuby(era.question, headingRubyOptions)}</p>
        </header>
        ${eraImage ? `
          <figure class="era-visual">
            <img src="${eraImage}" alt="${era.name}のくらしや社会を表すイラスト" loading="lazy">
          </figure>
        ` : ""}
        <div class="era-body">
          <div class="fact-grid" data-era-id="${era.id}">
            <section class="fact-card fact-item" data-detail-type="life" data-era-id="${era.id}">
              <button class="detail-toggle disclosure-icon" type="button" data-detail-type="life" data-era-id="${era.id}" aria-expanded="false" aria-label="くらしの詳細を開く"></button>
              <h3>くらし</h3>
              <p>${applyStudyRuby(era.life, groupRubyOptions)}</p>
            </section>
            <section class="fact-card fact-item" data-detail-type="event" data-era-id="${era.id}">
              <button class="detail-toggle disclosure-icon" type="button" data-detail-type="event" data-era-id="${era.id}" aria-expanded="false" aria-label="できごとの詳細を開く"></button>
              <h3>できごと</h3>
              <p>${applyStudyRuby(era.event, groupRubyOptions)}</p>
            </section>
            <section class="fact-card fact-item" data-detail-type="power" data-era-id="${era.id}">
              <button class="detail-toggle disclosure-icon" type="button" data-detail-type="power" data-era-id="${era.id}" aria-expanded="false" aria-label="大きな力の詳細を開く"></button>
              <h3>大きな力</h3>
              <p>${applyStudyRuby(era.power, groupRubyOptions)}</p>
            </section>
          </div>
          ${eraPowers.map((p) => `
            <div class="fact-card power-card">
              <h3>${p[0]}</h3>
              <p><strong>どこ:</strong> ${p[2]}　<strong>集まった人:</strong> ${p[3]}</p>
              <p><strong>なぜ:</strong> ${p[4]}　<strong>くらし:</strong> ${p[5]}</p>
            </div>`).join("")}
          ${eraEvents.length ? `
            <section class="action-subcategory-section event-subcategories" aria-label="${era.name}の重要な出来事">
              <div class="subcategory-head">
                <p class="eyebrow">重要な出来事</p>
                <h3>${applyStudyRuby(era.name, headingRubyOptions)}で押さえたい出来事</h3>
                <p>${applyStudyRuby("教科書でよく出てくる事件や社会の変化を、時代の流れに沿って整理しています。", headingRubyOptions)}</p>
              </div>
              <div class="subcategory-list event-subcategory-list">
                ${eraEvents.map((item) => `
                  <article class="action-subcategory-card event-subcategory-card" data-year-label="${escapeHtml(item.yearLabel || "")}">
                    <div class="subcategory-card-body">
                      <button class="subcategory-description-toggle disclosure-icon" type="button" aria-label="説明文を全文表示" aria-expanded="false"></button>
                      <header>
                        <span class="subcategory-region">${applyStudyRuby(item.tags[0] || era.name, headingRubyOptions)}</span>
                        <h4><button class="event-subcategory-title" type="button" data-event-id="${item.id}" aria-label="${item.title}の出来事カードを開く"><strong>${applyStudyRuby(item.title, headingRubyOptions)}</strong></button></h4>
                        <p>${applyStudyRuby(item.summary, headingRubyOptions)}</p>
                      </header>
                      ${item.image ? `<img class="subcategory-image${item.imageFocus === "up" ? " subcategory-image-up" : item.imageFocus === "down" ? " subcategory-image-down" : ""}" style="${item.imageFocus === "up" ? "object-position:50% calc(50% + 100px)" : item.imageFocus === "down" ? "object-position:50% calc(50% - 100px)" : "object-position:50% 50%"}" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}のイメージ画像" loading="lazy">` : ""}
                      <p class="subcategory-description">${enrichDetailLinks(item.text, { groupPersonLinks, groupRubyBoldTerms, localPersonNames: item.people || [], currentEventTitle: item.title })}</p>
                      <div class="tag-row">${item.tags.map((tag) => `<span class="tag">${applyStudyRuby(tag, headingRubyOptions)}</span>`).join("")}</div>
                    </div>
                  </article>
                `).join("")}
              </div>
            </section>
          ` : ""}
          <details class="era-people">
            <summary>
              <span>時代を動かした人たち</span>
              <span>${eraPeople.length}人</span>
              <span class="group-action disclosure-icon" aria-hidden="true"></span>
            </summary>
            <div class="mini-people">
              ${eraPeople.map((p) => `<button class="mini-person-button" type="button" onclick="openPerson('${escapedJsString(p.name)}')" aria-label="${personDisplayNameText(p)}の人物カードを開く"><span class="mini-person-icon">${p.icon}</span><span>${personDisplayNameHtml(p)}</span></button>`).join("") || "<p>人物図鑑で関連人物を見られます。</p>"}
            </div>
          </details>
        </div>
      </div>
    </article>`;
}



function cssEscapeValue(value) {
  if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}



function lineageItemImageMarkup(item) {
  if (!item?.image) return `<div class="lineage-card-image lineage-card-image-empty" aria-hidden="true"></div>`;
  return `<img class="lineage-card-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}のイメージ画像" loading="lazy">`;
}

function renderLineageContent(activeTheme) {
  const detail = document.getElementById("lineageDetail");
  const list = document.getElementById("lineageList");
  if (!list) return;
  list.classList.remove("lineage-related-person-list");
  if (!activeTheme) {
    if (detail) detail.textContent = "";
    list.innerHTML = "";
    return;
  }
  if (detail) detail.innerHTML = enrichDetailLinks(activeTheme.detail || "", { groupRubyBoldTerms: new Set() });
  list.innerHTML = activeTheme.subcategoryIds.map((id, index) => {
    const item = eventSubcategoryById.get(id);
    if (!item) return `<article class="lineage-card lineage-card-missing"><span class="lineage-step">${index + 1}</span><h3>${id}</h3></article>`;
    return `<article class="lineage-card" data-event-id="${escapeHtml(item.id)}"><span class="lineage-step">${index + 1}</span><button class="lineage-event-button" type="button" data-event-id="${escapeHtml(item.id)}">${lineageItemImageMarkup(item)}<span>${applyStudyRuby(item.title)}</span></button></article>${index < activeTheme.subcategoryIds.length - 1 ? `<span class="lineage-flow-arrow" aria-hidden="true">→</span>` : ""}`;
  }).join("");
}

function renderLineageThemeButton(theme) {
  return `<button class="lineage-tab${theme.id === activeLineageId ? " active" : ""}" type="button" data-lineage-id="${escapeHtml(theme.id)}" aria-current="${theme.id === activeLineageId ? "true" : "false"}">${escapeHtml(theme.title)}</button>`;
}

function renderContentMenuItemButton(item) {
  const active = item.id === activeContentMenuItemId;
  const subtitle = item.subtitle ? `<small>${escapeHtml(item.subtitle)}</small>` : "";
  return `<button class="lineage-tab${active ? " active" : ""}" type="button" data-content-id="${escapeHtml(item.id)}" aria-current="${active ? "true" : "false"}">${escapeHtml(item.title)}${subtitle}</button>`;
}

function renderLineageThemeMenu() {
  const sectionByParentId = new Map();
  const childThemeIds = new Set();
  lineageThemeMenuSections.forEach((section) => {
    sectionByParentId.set(section.themeId, section);
    section.themeIds.forEach((id) => childThemeIds.add(id));
  });
  const themeById = new Map(lineageThemes.map((theme) => [theme.id, theme]));
  return lineageThemes.map((theme) => {
    if (childThemeIds.has(theme.id)) return "";
    const section = sectionByParentId.get(theme.id);
    if (!section) return renderLineageThemeButton(theme);
    const buttons = section.themeIds
      .map((id) => themeById.get(id))
      .filter(Boolean)
      .map(renderLineageThemeButton)
      .join("");
    return `<section class="lineage-menu-section" aria-label="${escapeHtml(section.title)}">${renderLineageThemeButton(theme)}<div class="lineage-menu-section-items">${buttons}</div></section>`;
  }).join("");
}

function renderContentMenu() {
  return contentMenuSections.map((section) => {
    const heading = `<div class="lineage-menu-section-title"><span>${escapeHtml(section.title)}</span>${section.subtitle ? `<small>${escapeHtml(section.subtitle)}</small>` : ""}</div>`;
    const body = section.source === 'lineageThemes'
      ? renderLineageThemeMenu()
      : section.items.map(renderContentMenuItemButton).join("");
    return `<section class="lineage-menu-section" aria-label="${escapeHtml(section.title)}">${heading}<div class="lineage-menu-section-items">${body}</div></section>`;
  }).join("");
}

function renderLineageExplorer() {
  const overlay = document.getElementById("lineageOverlay");
  const tabs = document.getElementById("lineageTabs");
  const title = document.getElementById("lineageTitle");
  const summary = document.getElementById("lineageSummary");
  if (!tabs || !title || !summary) return;
  const activeTheme = lineageThemes.find((theme) => theme.id === activeLineageId) || null;
  const activeContent = activeContentMenuItemId ? contentMenuItemsById.get(activeContentMenuItemId) : null;
  tabs.innerHTML = `<div class="drawer-head lineage-drawer-head"><strong>オプションメニュー</strong><button class="icon-button" type="button" data-lineage-menu-close aria-label="オプションメニューを閉じる">×</button></div><div class="lineage-theme-links">${renderContentMenu()}</div>`;
  tabs.classList.toggle("open", lineageThemeMenuOpen);
  document.getElementById("lineageOpenButton")?.setAttribute("aria-expanded", lineageThemeMenuOpen ? "true" : "false");
  if (activeContent) {
    title.innerHTML = applyStudyRuby(activeContent.title);
    summary.textContent = activeContent.summary || activeContent.subtitle || "";
    renderFreeContent(activeContent);
    return;
  }
  if (!activeTheme) {
    title.textContent = "";
    summary.textContent = "";
    renderLineageContent(null);
    return;
  }
  title.innerHTML = applyStudyRuby(activeTheme.title);
  summary.textContent = activeTheme.summary;
  renderLineageContent(activeTheme);
}

function lineageRelatedPersonCard(person) {
  const visual = findVisualForPerson(person);
  const imageHtml = visual?.image
    ? `<img class="lineage-related-person-image" src="${escapeHtml(visual.image)}" alt="${escapeHtml(visual.alt || personDisplayNameText(person) + 'の画像')}" loading="lazy">`
    : `<span class="lineage-related-person-icon" aria-hidden="true">${escapeHtml(person.icon || '人')}</span>`;
  return `<button class="lineage-related-person-card person-inline" type="button" data-person-name="${escapeHtml(person.name)}" aria-label="${personDisplayNameText(person)}の人物カードを開く">${imageHtml}<span class="lineage-related-person-name">${personDisplayNameHtml(person)}</span></button>`;
}

function renderFreeContent(content) {
  const detail = document.getElementById("lineageDetail");
  const list = document.getElementById("lineageList");
  if (detail) {
    detail.innerHTML = enrichDetailLinks(content.detail || content.summary || "", { groupRubyBoldTerms: new Set() });
  }
  if (list) {
    const relatedPeople = (content.relatedPeople || [])
      .map((name) => personByName.get(name))
      .filter(Boolean);
    list.classList.add("lineage-related-person-list");
    list.innerHTML = relatedPeople.length
      ? relatedPeople.map(lineageRelatedPersonCard).join("")
      : "";
  }
}

function toggleLineageMenu() {
  lineageThemeMenuOpen = !lineageThemeMenuOpen;
  renderLineageExplorer();
}

function closeLineageMenu() {
  lineageThemeMenuOpen = false;
  renderLineageExplorer();
}

function chooseLineageTheme(id) {
  if (!id) return;
  const overlay = document.getElementById("lineageOverlay");
  const shouldAnimate = overlay && !overlay.hidden && id !== activeLineageId;
  lineageThemeMenuOpen = false;
  activeContentMenuItemId = null;
  if (shouldAnimate) {
    switchLineageTheme(id);
    return;
  }
  activeLineageId = id;
  renderLineageExplorer();
  openLineageOverlay();
}

function chooseContentMenuItem(id) {
  const item = contentMenuItemsById.get(id);
  if (!item) return;
  lineageThemeMenuOpen = false;
  activeLineageId = null;
  activeContentMenuItemId = item.id;
  renderLineageExplorer();
  openLineageOverlay();
}
function switchLineageTheme(id) {
  if (!id || id === activeLineageId) return;
  const list = document.getElementById("lineageList");
  window.clearTimeout(lineageSwitchTimer);
  if (!list) {
    activeLineageId = id;
    activeContentMenuItemId = null;
    lineageThemeMenuOpen = false;
    renderLineageExplorer();
    return;
  }
  list.classList.remove("is-sliding-in-right");
  list.classList.add("is-sliding-out-left");
  lineageSwitchTimer = window.setTimeout(() => {
    activeLineageId = id;
    activeContentMenuItemId = null;
    lineageThemeMenuOpen = false;
    renderLineageExplorer();
    const nextList = document.getElementById("lineageList");
    if (!nextList) return;
    nextList.classList.remove("is-sliding-out-left");
    nextList.classList.add("is-sliding-in-right");
    window.setTimeout(() => nextList.classList.remove("is-sliding-in-right"), 340);
  }, document.body.classList.contains("reduce-motion") ? 0 : 280);
}
function openLineageOverlay() {
  const overlay = document.getElementById("lineageOverlay");
  if (!overlay) return;
  window.clearTimeout(lineageCloseTimer);
  renderLineageExplorer();
  overlay.hidden = false;
  overlay.setAttribute("aria-hidden", "false");
  overlay.classList.remove("is-closing");
  document.body.classList.add("lineage-open");
  window.requestAnimationFrame(() => overlay.classList.add("is-open"));
}

function closeLineageOverlay() {
  const overlay = document.getElementById("lineageOverlay");
  if (!overlay || overlay.hidden) return;
  window.clearTimeout(lineageCloseTimer);
  overlay.classList.remove("is-open");
  overlay.classList.add("is-closing");
  document.body.classList.remove("lineage-open");
  lineageThemeMenuOpen = false;
  lineageCloseTimer = window.setTimeout(() => {
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    overlay.classList.remove("is-closing");
  }, document.body.classList.contains("reduce-motion") ? 0 : 440);
}


function syncSubcategoryYearLabels() {
  document.querySelectorAll(".timeline-subcategory-year-label").forEach((label) => label.remove());
  document.querySelectorAll(".era-group[open] .event-subcategory-card[data-year-label]").forEach((card) => {
    const yearLabel = card.dataset.yearLabel;
    if (!yearLabel) return;
    const era = card.closest(".era");
    if (!era) return;
    const eraRect = era.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    if (!cardRect.height || !eraRect.height) return;
    const label = document.createElement("span");
    label.className = "timeline-subcategory-year-label";
    label.textContent = yearLabel;
    label.style.top = `${Math.max(0, cardRect.top - eraRect.top + 15)}px`;
    era.appendChild(label);
  });
}

function scheduleSubcategoryYearLabelSync() {
  window.requestAnimationFrame(syncSubcategoryYearLabels);
}
function renderTimeline() {
  groupRubyBoldTermsById = new Map();
  timeline.innerHTML = eraGroups.map((group) => {
    const groupEras = group.eras.map((id) => eras.find((era) => era.id === id)).filter(Boolean);
    const firstYear = groupEras[0]?.westernYear || "";
    const lastYear = groupEras[groupEras.length - 1]?.westernYear || "";
    const groupYear = group.westernYear || (firstYear && lastYear && firstYear !== lastYear ? `${firstYear}～${lastYear}` : firstYear);
    return `
      <details class="era-group" id="group-${group.id}" data-era="${group.title}" data-western-year="${groupYear}" style="--group-a:${group.colors[0]};--group-b:${group.colors[1]}">
        <summary>
          <span class="mobile-year-chip group-year-chip" aria-hidden="true">${escapeHtml(groupYear || "")}</span>
          <span class="group-icon">${group.icon}</span>
          <span class="group-copy">
            <span class="eyebrow">${group.title}</span>
            <strong>${group.heading}</strong>
            <span>${groupEras.map((era) => era.name).join("・")}</span>
          </span>
          <span class="group-focus">${group.focus}</span>
          <span class="group-action disclosure-icon" aria-hidden="true"></span>
        </summary>
        <div class="group-eras">
          ${(() => {
            const groupPersonLinks = new Set();
            const groupRubyBoldTerms = new Set();
            groupRubyBoldTermsById.set(group.id, groupRubyBoldTerms);
            return groupEras.map((era) => renderEraCard(era, groupPersonLinks, groupRubyBoldTerms)).join("");
          })()}
        </div>
      </details>`;
  }).join("");
  document.querySelectorAll(".era-group").forEach((group) => {
    group.addEventListener("toggle", () => {
      const action = group.querySelector(".group-action");
      if (action) action.setAttribute("aria-hidden", "true");
      scheduleSubcategoryYearLabelSync();
    });
  });
}

function openGroupForEra(eraId) {
  const group = eraGroups.find((item) => item.eras.includes(eraId));
  if (!group) return;
  const detail = document.querySelector(`#group-${group.id}`);
  if (detail) detail.open = true;
}

function navigateToGroupFromMenu(groupId) {
  const target = document.querySelector(`#group-${groupId}`);
  if (!target) return;
  closeEraDetail();
  document.querySelectorAll(".era-group").forEach((group) => {
    group.open = false;
  });
  const reduceMotion = document.body.classList.contains("reduce-motion") || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
  window.setTimeout(() => {
    target.open = true;
  }, reduceMotion ? 0 : 260);
}

function closeEraDetail() {
  if (!activeEraDetail) return;
  const { item, panel } = activeEraDetail;
  const button = item.querySelector(".detail-toggle");
  item.classList.remove("open");
  panel.remove();
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-label", `${item.querySelector("h3")?.textContent || "詳細"}の詳細を開く`);
  activeEraDetail = null;
}

function openEraDetail(button) {
  const era = eras.find((item) => item.id === button.dataset.eraId);
  const detail = era && getEraDetail(era, button.dataset.detailType);
  if (!era || !detail) return;

  const group = eraGroups.find((entry) => entry.eras.includes(era.id));
  const groupRubyBoldTerms = group ? groupRubyBoldTermsById.get(group.id) : null;
  const groupRubyOptions = groupRubyBoldTerms instanceof Set ? { boldTerms: groupRubyBoldTerms } : {};
  const headingRubyOptions = { disableTooltips: true };
  const item = button.closest(".fact-item");
  if (activeEraDetail?.item === item) {
    closeEraDetail();
    return;
  }
  closeEraDetail();
  const panel = document.createElement("div");
  panel.className = "inline-detail";
  panel.setAttribute("aria-live", "polite");
  panel.innerHTML = `
    <div class="detail-panel-head">
      <div>
        <p class="eyebrow">${applyStudyRuby(era.name, { disableTooltips: true })}</p>
        <h3>${applyStudyRuby(detail.title, { disableTooltips: true })}</h3>
      </div>
    </div>
    <p>${enrichDetailLinks(detail.text, { groupRubyBoldTerms })}</p>
  `;
  const isMobileLayout = window.matchMedia("(max-width: 760px)").matches;
  if (isMobileLayout) {
    item.after(panel);
  } else {
    item.parentElement.appendChild(panel);
  }
  item.classList.add("open");
  button.setAttribute("aria-expanded", "true");
  button.setAttribute("aria-label", `${item.querySelector("h3")?.textContent || "詳細"}の詳細を閉じる`);
  activeEraDetail = { item, panel, startY: window.scrollY };
}

function personMatches(person, query) {
  const text = [
    person.name,
    person.kana,
    person.displayName,
    ...personAliases(person),
    person.era,
    person.field,
    person.title,
    person.icon,
    person.modal?.profile,
    person.modal?.whatDid,
    person.modal?.whyImportant
  ].filter(Boolean).join(" ").toLowerCase();
  return text.includes(query.toLowerCase());
}

function personGenreEntries() {
  return Object.entries(personGenreLabels).map(([id, label]) => ({ id, label }));
}

function personGenreById(genreId) {
  const label = personGenreLabels[genreId];
  return label ? { id: genreId, label } : { id: "other", label: personGenreLabels.other || "そのほか" };
}

function getPersonGenre(person) {
  return personGenreById(person.genre);
}

function renderPeopleFilters() {
  const filters = [
    { id: "all", label: "すべて" },
    { id: "favorite", label: "お気に入り" },
    { id: "modern", label: "近現代" },
    ...personGenreEntries().map((group) => ({ id: `genre:${group.id}`, label: group.label }))
  ];
  peopleTools.innerHTML = filters.map((filter) => (
    `<button class="chip ${activeFilter === filter.id ? "active" : ""}" data-filter="${filter.id}">${filter.label}</button>`
  )).join("");
}



function personSortKey(person) {
  return (person.kana || person.name).replace(/[・＝\s]/g, "");
}

function escapedJsString(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function renderPersonNameButton(person) {
  const era = eraFor(person.era);
  const saved = favorites.has(person.name);
  const genre = getPersonGenre(person);
  const name = escapedJsString(person.name);
  return `
    <div class="person-name-item" style="--person-color:${era.colors[0]}">
      <button class="person-name-main" type="button" onclick="openPerson('${name}')" aria-label="${personDisplayNameText(person)}の人物カードを開く">
        <span class="person-name-icon">${person.icon}</span>
        <span class="person-name-text"><strong>${personDisplayNameHtml(person)}</strong><small>${person.era} / ${genre.label}</small></span>
      </button>
      <button class="person-name-favorite" type="button" aria-label="${personDisplayNameText(person)}をお気に入り" onclick="toggleFavorite('${name}', event)">${saved ? "★" : "☆"}</button>
    </div>
  `;
}

function renderPeople() {
  const query = peopleSearch.value.trim();
  const filtered = people.filter((person) => {
    if (query && !personMatches(person, query)) return false;
    if (activeFilter === "favorite") return favorites.has(person.name);
    if (activeFilter === "modern") return /明治|大正|昭和|平成|令和/.test(person.era);
    if (activeFilter.startsWith("genre:")) return getPersonGenre(person).id === activeFilter.replace("genre:", "");
    return true;
  }).sort((a, b) => personSortKey(a).localeCompare(personSortKey(b), "ja") || a.name.localeCompare(b.name, "ja"));
  if (!filtered.length) {
    peopleGrid.innerHTML = `<p>見つかりませんでした。</p>`;
    return;
  }
  peopleGrid.innerHTML = `<div class="person-name-list" aria-label="人物名一覧">${filtered.map(renderPersonNameButton).join("")}</div>`;
}

function compactJoin(parts) {
  return parts.filter(Boolean).map((part) => String(part).trim()).filter(Boolean).join(" ");
}

function modalLinkedText(text, options = {}) {
  return enrichDetailLinks(String(text || ""), options);
}

function findVisualForPerson(person) {
  if (person?.image) {
    return {
      image: person.image,
      focus: person.imageFocus || "center",
      alt: person.imageAlt || `${personDisplayNameText(person)}のイメージ画像`
    };
  }
  const related = eraEventSubcategories.find((item) => item.image && [person.name, ...personAliases(person)].some((name) => (item.people || []).includes(name)));
  if (related) return { image: related.image, focus: related.imageFocus || "center", alt: `${personDisplayNameText(person)}に関係する${related.title}のイメージ画像` };
  const era = eraFor(person.era);
  const image = eraImages[era?.id];
  return image ? { image, focus: "center", alt: `${person.era}のイメージ画像` } : null;
}

function findVisualForAction(name, tags = [], action = null) {
  if (action?.image) {
    return {
      image: action.image,
      focus: action.imageFocus || "center",
      alt: action.imageAlt || `${name}のイメージ画像`
    };
  }
  const related = eraEventSubcategories.find((item) => item.image && (item.title === name || (item.actions || []).includes(name)))
    || eraEventSubcategories.find((item) => item.image && tags.some((tag) => item.title.includes(tag) || (item.tags || []).includes(tag)));
  if (related) return { image: related.image, focus: related.imageFocus || "center", alt: `${related.title}のイメージ画像` };
  const eraTag = tags.find((tag) => /時代$/.test(tag));
  const era = eraTag ? eraFor(eraTag) : null;
  const image = era && eraImages[era.id];
  return image ? { image, focus: "center", alt: `${eraTag}のイメージ画像` } : null;
}

function findVisualForEventSubcategory(item) {
  if (item?.image) return { image: item.image, focus: item.imageFocus || "center", alt: `${item.title}のイメージ画像` };
  const relatedActionNames = [item?.title, ...(item?.actions || []), ...(item?.tags || [])].filter(Boolean);
  for (const actionName of relatedActionNames) {
    const action = actionCards[actionName];
    if (action?.image) return findVisualForAction(actionName, action.tags || item.tags || [], action);
  }
  return findVisualForAction(item.title, item.tags || []);
}

function modalVisualHtml(visual, icon, title) {
  if (visual?.image) {
    return `<figure class="modal-visual modal-visual-image focus-${escapeHtml(visual.focus || "center")}"><img src="${escapeHtml(visual.image)}" alt="${escapeHtml(visual.alt || title)}" loading="lazy"></figure>`;
  }
  return `<div class="modal-visual modal-visual-fallback" aria-hidden="true"><span>${escapeHtml(icon || "💡")}</span></div>`;
}

function modalSectionHtml(icon, title, text, linkOptions = {}) {
  return `
    <section class="modal-info-section">
      <h3><span class="modal-section-icon" aria-hidden="true">${escapeHtml(icon)}</span><span>${escapeHtml(title)}</span></h3>
      <p>${modalLinkedText(text, linkOptions)}</p>
    </section>
  `;
}

function modalEntryLabel(entry) {
  if (!entry) return "";
  if (entry.type === "person") return personDisplayNameText(personByName.get(entry.id) || people.find((person) => person.name === entry.id) || { name: entry.id });
  if (entry.type === "action") return entry.id;
  const eventItem = eventSubcategoryById.get(entry.id);
  return eventItem?.title || entry.id;
}

function modalHistoryHtml() {
  if (!modalHistory.length) return "";
  const previous = modalHistory[modalHistory.length - 1];
  return `<nav class="modal-history-bar" aria-label="カード履歴"><button class="modal-back-button" type="button" data-modal-back aria-label="前のカードに戻る"><span aria-hidden="true">&lt;</span><span>戻る</span></button><span class="modal-history-label">${escapeHtml(modalEntryLabel(previous))}</span></nav>`;
}

function pushCurrentModalToHistory(fromModal) {
  if (fromModal && currentModalEntry) modalHistory.push(currentModalEntry);
}

function showLearningDialog() {
  if (!personDialog.open) personDialog.showModal();
}

function openModalEntry(entry) {
  if (!entry) return;
  if (entry.type === "person") openPerson(entry.id);
  else if (entry.type === "action") openAction(entry.id);
  else if (entry.type === "event") openEventSubcategory(entry.id);
}

function goBackModalHistory() {
  const previous = modalHistory.pop();
  if (previous) openModalEntry(previous);
}

function resetModalHistory() {
  modalHistory.length = 0;
  currentModalEntry = null;
}
function renderLearningModal({ type, icon, eyebrow, titleHtml, subtitle, visual, sections, tags, currentEntry = null, sideActions = "" }) {
  personDetail.innerHTML = `
    <article class="learning-modal-card modal-type-${escapeHtml(type)}">
      ${modalHistoryHtml()}
      <header class="modal-hero-row">
        <div class="modal-title-block">
          <div class="modal-icon-stack">
            <div class="modal-icon-tile" aria-hidden="true">${escapeHtml(icon || "💡")}</div>
            ${sideActions}
          </div>
          <p class="modal-eyebrow">${eyebrow}</p>
          <h2>${titleHtml}</h2>
          <p class="modal-subtitle">${subtitle}</p>
          <div class="tag-row modal-tag-row">
            ${tags.map((tag) => `<span class="tag">${applyStudyRuby(tag)}</span>`).join("")}
          </div>
        </div>
        ${modalVisualHtml(visual, icon, subtitle)}
      </header>
      <div class="modal-section-grid">
        ${sections.map((section) => modalSectionHtml(section.icon, section.title, section.text, { currentEntry })).join("")}
      </div>
    </article>
  `;
}

function personModalSections(person) {
  const details = person.modal || {};
  return [
    {
      icon: "人",
      title: "どんな人物？",
      text: details.profile || ""
    },
    {
      icon: "本",
      title: "何をした？",
      text: details.whatDid || ""
    },
    {
      icon: "光",
      title: "なぜ重要？",
      text: details.whyImportant || ""
    }
  ];
}

function actionModalSections(name, action) {
  const summary = action.summary || "";
  const modal = action.modal || {};
  return [
    {
      icon: "動",
      title: "何が起きた？",
      text: modal.whatHappened || summary
    },
    {
      icon: "光",
      title: "なぜ重要？",
      text: modal.whyImportant || ""
    }
  ];
}

function openPerson(name, options = {}) {
  pushCurrentModalToHistory(Boolean(options.fromModal));
  const person = personByName.get(name) || people.find((p) => p.name === name);
  if (!person) return;
  const genre = getPersonGenre(person);
  const saved = favorites.has(person.name);
  const escapedName = escapeHtml(person.name);
  renderLearningModal({
    type: "person",
    icon: person.icon,
    eyebrow: applyStudyRuby(person.era),
    titleHtml: `${personDisplayNameHtml(person)}${personLifespanHtml(person)}`,
    subtitle: applyStudyRuby(person.title),
    visual: findVisualForPerson(person),
    sections: personModalSections(person),
    tags: [person.field, person.era, genre.label],
    sideActions: `<button class="modal-favorite-button ${saved ? "is-saved" : ""}" type="button" data-modal-favorite data-person-name="${escapedName}" aria-label="${saved ? "お気に入りから外す" : "お気に入りに追加"}" title="お気に入りに追加" aria-pressed="${saved ? "true" : "false"}"><span aria-hidden="true">${saved ? "★" : "☆"}</span></button>`,
    currentEntry: { type: "person", id: person.name }
  });
  currentModalEntry = { type: "person", id: person.name };
  showLearningDialog();
}

function openAction(name, options = {}) {
  pushCurrentModalToHistory(Boolean(options.fromModal));
  const action = actionCards[name];
  if (!action) return;
  const summary = action.summary || "";
  const tags = action.tags || [];
  renderLearningModal({
    type: "action",
    icon: "💡",
    eyebrow: "アクションカード",
    titleHtml: name === "元" ? ruby("元", "げん") : applyStudyRuby(name),
    subtitle: applyStudyRuby(summary),
    visual: findVisualForAction(name, tags, action),
    sections: actionModalSections(name, action),
    tags,
    currentEntry: { type: "action", id: name }
  });
  currentModalEntry = { type: "action", id: name };
  showLearningDialog();
}


function eventModalSections(item, eraName) {
  return [
    {
      icon: "動",
      title: "何が起きた？",
      text: compactJoin([item.summary, item.text])
    }
  ];
}
function openEventSubcategory(id, options = {}) {
  pushCurrentModalToHistory(Boolean(options.fromModal));
  const item = eventSubcategoryById.get(id);
  if (!item) return;
  const era = eras.find((eraItem) => eraItem.id === item.eraId);
  renderLearningModal({
    type: "event",
    icon: "📌",
    eyebrow: applyStudyRuby(era?.name || "重要な出来事"),
    titleHtml: applyStudyRuby(item.title),
    subtitle: applyStudyRuby(item.summary),
    visual: findVisualForEventSubcategory(item),
    sections: eventModalSections(item, era?.name),
    tags: item.tags || [],
    currentEntry: { type: "event", id }
  });
  currentModalEntry = { type: "event", id };
  showLearningDialog();
}

function toggleFavorite(name, event) {
  event?.stopPropagation();
  favorites.has(name) ? favorites.delete(name) : favorites.add(name);
  localStorage.setItem("historyFavorites", JSON.stringify([...favorites]));
  renderPeople();
  updateModalFavoriteButton(name);
}

function updateModalFavoriteButton(name) {
  const button = [...personDialog.querySelectorAll("[data-modal-favorite]")].find((item) => item.dataset.personName === name);
  if (!button) return;
  const saved = favorites.has(name);
  button.classList.toggle("is-saved", saved);
  button.setAttribute("aria-pressed", saved ? "true" : "false");
  button.setAttribute("aria-label", saved ? "お気に入りから外す" : "お気に入りに追加");
  button.setAttribute("title", "お気に入りに追加");
  const icon = button.querySelector("span[aria-hidden='true']");
  if (icon) icon.textContent = saved ? "★" : "☆";
}

function renderQuiz() {
  const quiz = quizzes[activeQuiz];
  quizCard.innerHTML = `
    <h3>${quiz.q}</h3>
    <div class="quiz-options">
      ${quiz.options.map((option) => `<button type="button" onclick="answerQuiz('${option}')">${option}</button>`).join("")}
    </div>
    <div class="result" id="quizResult" aria-live="polite"></div>
  `;
}

function answerQuiz(option) {
  const quiz = quizzes[activeQuiz];
  quizResult.textContent = option === quiz.a ? "正解です。流れが見えてきました。" : "だいじょうぶ。もう一度、その時代を見てみよう。";
  setTimeout(() => {
    activeQuiz = (activeQuiz + 1) % quizzes.length;
    renderQuiz();
  }, 1300);
}



function observeEra() {
  // Display current era
  const eraObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) {
      currentEra.textContent = visible.target.dataset.era;
    }
  }, { threshold: [0.25, 0.45, 0.65] });
  document.querySelectorAll(".era-group, .era").forEach((era) => eraObserver.observe(era));
}

menuButton.addEventListener("click", () => {
  const isOpen = eraDrawer.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
  menuButton.setAttribute("aria-label", isOpen ? "ページ目次を閉じる" : "ページ目次を開く");
});
closeDrawer.addEventListener("click", () => {
  eraDrawer.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "ページ目次を開く");
});

eraLinks.addEventListener("click", (event) => {
  const link = event.target.closest("a");
  if (link?.dataset.groupId) {
    event.preventDefault();
    navigateToGroupFromMenu(link.dataset.groupId);
  }
  eraDrawer.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "ページ目次を開く");
});
closePerson.addEventListener("click", () => personDialog.close());
personDialog.addEventListener("close", resetModalHistory);
personDialog.addEventListener("click", (event) => {
  const backButton = event.target.closest("[data-modal-back]");
  if (backButton) {
    goBackModalHistory();
    return;
  }
  const favoriteButton = event.target.closest("[data-modal-favorite]");
  if (favoriteButton) {
    toggleFavorite(favoriteButton.dataset.personName, event);
    return;
  }
  const personButton = event.target.closest(".person-inline");
  if (personButton) {
    openPerson(personButton.dataset.personName, { fromModal: true });
    return;
  }
  const actionButton = event.target.closest(".action-inline");
  if (actionButton) {
    openAction(actionButton.dataset.actionName, { fromModal: true });
    return;
  }
  const eventButton = event.target.closest(".event-inline");
  if (eventButton) {
    openEventSubcategory(eventButton.dataset.eventId, { fromModal: true });
  }
});
document.querySelector(".people-accordion")?.addEventListener("toggle", (event) => {
  const action = event.currentTarget.querySelector(".group-action");
  if (action) action.setAttribute("aria-hidden", "true");
});
document.getElementById("lineageOpenButton")?.addEventListener("click", toggleLineageMenu);
document.getElementById("lineageCloseButton")?.addEventListener("click", closeLineageOverlay);
document.getElementById("lineageTabs")?.addEventListener("click", (event) => {
  if (event.target.closest("[data-lineage-menu-close]")) {
    closeLineageMenu();
    return;
  }
  const lineageTab = event.target.closest(".lineage-tab");
  if (!lineageTab) return;
  if (lineageTab.dataset.contentId) chooseContentMenuItem(lineageTab.dataset.contentId);
  else chooseLineageTheme(lineageTab.dataset.lineageId);
});
document.getElementById("lineageOverlay")?.addEventListener("click", (event) => {
  if (event.target.closest("[data-lineage-close]")) {
    closeLineageOverlay();
    return;
  }
  const personButton = event.target.closest(".person-inline");
  if (personButton) {
    closeLineageMenu();
    openPerson(personButton.dataset.personName);
    return;
  }

  const actionButton = event.target.closest(".action-inline");
  if (actionButton) {
    closeLineageMenu();
    openAction(actionButton.dataset.actionName, { fromModal: true });
    return;
  }

  const inlineEventButton = event.target.closest(".event-inline");
  if (inlineEventButton) {
    closeLineageMenu();
    openEventSubcategory(inlineEventButton.dataset.eventId);
    return;
  }

  const lineageEventButton = event.target.closest(".lineage-event-button");
  if (lineageEventButton) {
    closeLineageMenu();
    openEventSubcategory(lineageEventButton.dataset.eventId);
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeLineageMenu();
    closeLineageOverlay();
  }
});
timeline.addEventListener("click", (event) => {
  const personButton = event.target.closest(".person-inline");
  if (personButton) {
    openPerson(personButton.dataset.personName);
    return;
  }
  const actionButton = event.target.closest(".action-inline");
  if (actionButton) {
    openAction(actionButton.dataset.actionName, { fromModal: true });
    return;
  }
  const inlineEventButton = event.target.closest(".event-inline");
  if (inlineEventButton) {
    openEventSubcategory(inlineEventButton.dataset.eventId);
    return;
  }
  const button = event.target.closest(".detail-toggle");
  if (button) {
    openEraDetail(button);
    return;
  }
  const descriptionToggle = event.target.closest(".subcategory-description-toggle");
  if (descriptionToggle) {
    const card = descriptionToggle.closest(".event-subcategory-card");
    const expanded = card?.classList.toggle("is-description-expanded") || false;
    descriptionToggle.setAttribute("aria-expanded", String(expanded));
    descriptionToggle.setAttribute("aria-label", expanded ? "説明文を短く表示" : "説明文を全文表示");
    scheduleSubcategoryYearLabelSync();
    return;
  }



  const eventButton = event.target.closest(".event-subcategory-title");
  if (eventButton) openEventSubcategory(eventButton.dataset.eventId);
});
window.addEventListener("scroll", () => {
  if (activeEraDetail && Math.abs(window.scrollY - activeEraDetail.startY) >= 500) {
    closeEraDetail();
  }
}, { passive: true });

peopleSearch.addEventListener("input", renderPeople);
peopleTools.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  activeFilter = button.dataset.filter;
  renderPeopleFilters();
  renderPeople();
});

async function initApp() {
  try {
    await loadHistoryContent();
    await loadActionCardsData();
    await loadLearningTermsData();
    await loadPeopleData();
    await loadLineageThemesData();
  } catch (error) {
    console.error(error);
    timeline.innerHTML = '<p class="section-band">歴史データまたは人物データを読み込めませんでした。ローカルサーバーから開き直してください。</p>';
    return;
  }
  renderEraLinks();
  renderTimeline();
  renderLineageExplorer();
  setupTermTooltips();
  scheduleSubcategoryYearLabelSync();
  window.addEventListener("resize", scheduleSubcategoryYearLabelSync);
  window.addEventListener("load", scheduleSubcategoryYearLabelSync);
  renderPeopleFilters();
  renderPeople();
  renderQuiz();
  observeEra();
}

initApp();

