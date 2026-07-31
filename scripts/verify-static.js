const fs = require("fs");
const path = require("path");
const vm = require("vm");
const childProcess = require("child_process");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const parseJson = (file) => JSON.parse(read(file));

const knownLongPersonDescriptions = new Set();

function syntaxCheck(file) {
  const result = childProcess.spawnSync(process.execPath, ["--check", path.join(root, file)], {
    encoding: "utf8"
  });
  return {
    file,
    ok: result.status === 0,
    stderr: (result.stderr || "").trim(),
    stdout: (result.stdout || "").trim()
  };
}

function run() {
  const history = parseJson("data/history-content.json");
  const peopleData = parseJson("data/people-data.json");
  const actionData = parseJson("data/action-cards.json");
  const lineageData = parseJson("data/lineage-themes.json");
  const learningTermsData = parseJson("data/learning-terms.json");
  const sandbox = { window: {} };
  vm.runInNewContext(read("data/history-content.js"), sandbox);
  vm.runInNewContext(read("data/people-data.js"), sandbox);
  vm.runInNewContext(read("data/action-cards.js"), sandbox);
  vm.runInNewContext(read("data/lineage-themes.js"), sandbox);
  vm.runInNewContext(read("data/learning-terms.js"), sandbox);

  const groups = history.groups || [];
  const eras = groups.flatMap((group) => group.eras || []);
  const subcategories = eras.flatMap((era) => era.subcategories || []);
  const people = peopleData.people || [];
  const actionCards = actionData.actionCards || {};
  const personAliases = (person) => [...new Set([...(person.aliases || []), ...(person.nameAliases || []), person.displayName].filter((name) => name && name !== person.name))];
  const peopleNames = new Set(people.flatMap((person) => [person.name, ...personAliases(person)]));
  const canonicalPeopleNames = new Set(people.map((person) => person.name));
  const scriptText = read("script.js");
  const lineageThemes = Array.isArray(lineageData.themes) ? lineageData.themes : [];
  const lineageOrder = Array.isArray(lineageData.order) ? lineageData.order : [];
  const lineageMenuSections = Array.isArray(lineageData.menuSections) ? lineageData.menuSections : [];
  const contentMenuSections = Array.isArray(lineageData.contentMenuSections) ? lineageData.contentMenuSections : [];
  const lineageThemeIds = new Set(lineageThemes.map((theme) => theme.id));
  const lineageThemesHaveValidOrder = lineageOrder.length === lineageThemes.length
    && lineageOrder.every((id) => lineageThemeIds.has(id))
    && lineageThemes.every((theme) => typeof theme.id === "string"
      && typeof theme.title === "string"
      && typeof theme.summary === "string"
      && typeof theme.detail === "string"
      && Array.isArray(theme.subcategoryIds));
  const lineageJsMatchesJson = JSON.stringify(sandbox.window.JAPAN_HISTORY_LINEAGE_THEMES_DATA) === JSON.stringify(lineageData);
  const learningTermsJsMatchesJson = JSON.stringify(sandbox.window.JAPAN_HISTORY_LEARNING_TERMS_DATA) === JSON.stringify(learningTermsData);
  const lineageMenuChildThemeIds = new Set(lineageMenuSections.flatMap((section) => Array.isArray(section.themeIds) ? section.themeIds : []));
  const lineageVisibleOrder = lineageOrder.filter((id) => !lineageMenuChildThemeIds.has(id));
  const lineageExpectedVisibleOrder = ['riseFall', 'war', 'buddhism', 'waterAgriculture', 'society'];
  const lineageVisibleOrderMatchesRequested = JSON.stringify(lineageVisibleOrder) === JSON.stringify(lineageExpectedVisibleOrder);
  const requiredLineageMenuGroup = ['emperors', 'warriors', 'zaibatsuCompany', 'parties'];
  const lineageMenuSectionsHaveValidThemeIds = lineageMenuSections.every((section) => section
    && typeof section.id === 'string'
    && typeof section.title === 'string'
    && typeof section.themeId === 'string'
    && lineageThemeIds.has(section.themeId)
    && Array.isArray(section.themeIds)
    && section.themeIds.every((id) => lineageThemeIds.has(id))
    && !section.themeIds.includes(section.themeId));
  const lineageRiseFallSubmenu = lineageMenuSections.some((section) => section.id === 'riseFallSubmenu'
    && section.themeId === 'riseFall'
    && section.title === '栄枯盛衰の系譜'
    && requiredLineageMenuGroup.every((id) => Array.isArray(section.themeIds) && section.themeIds.includes(id)));
  const contentMenuHasLineageSection = contentMenuSections.some((section) => section.id === 'lineage' && section.title === '系譜' && section.source === 'lineageThemes');
  const contentMenuHasExtraItems = contentMenuSections.some((section) => section.id === 'extraContents'
    && Array.isArray(section.items)
    && !section.subtitle
    && section.items.some((item) => item && item.id === 'japanese-vengeful-spirits' && item.title === '日本の怨霊'
      && Array.isArray(item.relatedPeople)
      && ['菅原道真', '平将門', '早良親王', '崇徳上皇'].every((name) => item.relatedPeople.includes(name)) && !item.relatedPeople.includes('桓武天皇'))
    && !section.items.some((item) => item && item.id === 'japanese-history-entertainment'));
  const learningTerms = learningTermsData.terms || {};
  const rubyGlossary = Object.fromEntries(Object.entries(learningTerms)
    .filter(([, value]) => value && typeof value === "object" && value.reading)
    .map(([term, value]) => [term, value.reading]));
  const termTooltipGlossary = Object.fromEntries(Object.entries(learningTerms)
    .filter(([, value]) => value && typeof value === "object" && value.tooltip)
    .map(([term, value]) => [term, value.tooltip]));
  const actionNames = new Set(Object.entries(actionCards).flatMap(([name, action]) => [
    name,
    action?.displayName,
    ...(action?.aliases || []),
    ...(action?.nameAliases || [])
  ].filter(Boolean)));
  const genericTooltipExclusions = new Set([
    "武士", "貴族", "豪族", "公家", "公害", "災害", "感染症", "気候変動", "多様", "多様性",
    "国際交流", "国際協力", "復興", "防災", "自治体", "裁判所", "国会", "内閣", "藩",
    "幕府", "朝廷", "仏教", "大陸", "水田", "土器", "定住", "測量", "農具", "青銅",
    "青銅器", "漢詩", "俳句", "功績", "合議", "租", "庸", "調", "歳役", "雑徭", "倭"
  ]);
  const learningTermsTooltipExcludedViolations = Object.keys(termTooltipGlossary)
    .flatMap((term) => [
      /時代$/.test(term) ? [term, "era"] : null,
      peopleNames.has(term) ? [term, "person-card"] : null,
      actionNames.has(term) ? [term, "action-card"] : null,
      genericTooltipExclusions.has(term) ? [term, "generic-non-special"] : null
    ].filter(Boolean));
  const hasKanji = (text) => /[㐀-鿿]/.test(String(text || ""));
  const hasKatakana = (text) => /[\u30A1-\u30FA\u30FC]/.test(String(text || ""));
  const stripParenthetical = (text) => String(text || "").replace(/\s*[（(][^）)]*[）)]\s*/g, "").trim();
  const indexText = read("index.html");
  const stylesText = read("styles.css");

  const missingPeople = [];
  const peopleNotInText = [];
  for (const item of subcategories) {
    for (const name of item.people || []) {
      if (!peopleNames.has(name)) missingPeople.push([item.id, name]);
      if (!String(item.text || "").includes(name)) peopleNotInText.push([item.id, item.title, name]);
    }
  }
  const personMentionItems = people.flatMap((person) => [person.name, ...personAliases(person)]
    .map((name) => ({ name, target: person.name })));
  const personMentionsMissingFromSubcategoryPeople = subcategories
    .flatMap((item) => personMentionItems
      .filter((personItem) => personItem.name.length >= 2 && String(item.text || "").includes(personItem.name))
      .filter((personItem) => !(item.people || []).includes(personItem.target) && !(item.people || []).includes(personItem.name))
      .map((personItem) => [item.id, item.title, personItem.name, personItem.target]));
  const duplicatePersonMentionsByGroup = groups
    .map((group) => {
      const groupSubcategories = (group.eras || [])
        .flatMap((era) => era.subcategories || []);
      const mentions = new Map();
      for (const item of groupSubcategories) {
        for (const personItem of personMentionItems) {
          if (personItem.name.length >= 2 && String(item.text || "").includes(personItem.name)) {
            const current = mentions.get(personItem.target) || [];
            current.push([item.id, item.title, personItem.name]);
            mentions.set(personItem.target, current);
          }
        }
      }
      return {
        group: group.id,
        people: [...mentions.entries()]
          .filter(([, hits]) => hits.length > 1)
          .map(([person, hits]) => [person, hits])
      };
    })
    .filter((item) => item.people.length);

  const modalFieldsMissing = people
    .filter((person) => !person.modal || !person.modal.profile || !person.modal.whatDid || !person.modal.whyImportant)
    .map((person) => person.name);
  const duplicatePeople = people
    .map((person) => person.name)
    .filter((name, index, all) => all.indexOf(name) !== index);
  const actionModalFieldsMissing = Object.entries(actionCards)
    .filter(([, action]) => !action || Array.isArray(action) || !action.summary || !Array.isArray(action.tags) || !action.modal || !action.modal.whatHappened || !action.modal.whyImportant)
    .map(([name]) => name);
  const unexpectedActionDescriptions = Object.entries(actionCards)
    .filter(([, action]) => action && !Array.isArray(action) && Object.prototype.hasOwnProperty.call(action, "description"))
    .map(([name]) => name);
  const personModalTexts = people.map((person) => ({
    name: person.name,
    text: [person.modal?.profile, person.modal?.whatDid, person.modal?.whyImportant]
      .filter(Boolean)
      .join(" ")
  }));
  const requiredInlineAliases = new Map([
    ["羽柴秀吉", "豊臣秀吉"],
    ["秀吉", "豊臣秀吉"],
    ["信長", "織田信長"],
    ["家康", "徳川家康"],
    ["光秀", "明智光秀"],
    ["義昭", "足利義昭"],
    ["義満", "足利義満"],
    ["勝頼", "武田勝頼"],
    ["信玄", "武田信玄"],
    ["頼朝", "源頼朝"],
    ["義経", "源義経"]
  ]);
  const missingInlineAliases = [...requiredInlineAliases.entries()]
    .filter(([alias]) => personModalTexts.some((item) => item.text.includes(alias)))
    .filter(([alias, target]) => !scriptText.includes(`name: "${alias}"`) || !scriptText.includes(`target: "${target}"`))
    .map(([alias, target]) => [alias, target]);
  const eventTitleReferencesWithoutAction = subcategories
    .filter((item) => item.title && !actionCards[item.title])
    .flatMap((item) => personModalTexts
      .filter((person) => person.text.includes(item.title))
      .map((person) => [person.name, item.title, item.id]));
  const missingModalEventLinkSupport = eventTitleReferencesWithoutAction.length > 0
    && (!scriptText.includes("event-inline") || !scriptText.includes("openEventSubcategory(eventButton.dataset.eventId)"));
  const missingModalLinkFunction = !scriptText.includes("function modalLinkedText") || !scriptText.includes("modalLinkedText(text, linkOptions)");
  const missingModalSelfLinkSuppression = !scriptText.includes("currentEntry = null")
    || !scriptText.includes("isCurrentModalTarget")
    || !scriptText.includes("html += `<strong>${label}</strong>`")
    || !scriptText.includes("currentEntry: { type: \"action\", id: name }")
    || !scriptText.includes("currentEntry: { type: \"person\", id: person.name }")
    || !scriptText.includes("currentEntry: { type: \"event\", id }");
  const modalSingleFrameSupport = stylesText.includes("max-height: calc(100vh - 30px)")
    && stylesText.includes(".modal-type-person .modal-section-grid")
    && stylesText.includes(".modal-type-action .modal-section-grid")
    && stylesText.includes("display: block;")
    && stylesText.includes(".modal-type-person .modal-info-section + .modal-info-section")
    && stylesText.includes(".modal-type-action .modal-info-section + .modal-info-section")
    && stylesText.includes("grid-template-columns: 38px minmax(0, 1fr)")
    && stylesText.includes("display: contents;")
    && stylesText.includes("grid-row: 1 / span 2")
    && stylesText.includes(".modal-type-event .modal-info-section");
  const protectedPartialInlineTerms = [
    { full: "北条氏康", partial: "北条氏" }
  ];
  const missingInlineBoundarySupport = !scriptText.includes("function isInlineLinkBoundary") || !scriptText.includes("!isInlineLinkBoundary(text, index, name, item)");
  const missingGroupPersonLinkDedupSupport = !scriptText.includes("function enrichDetailLinks(text, options = {})")
    || !scriptText.includes("options.groupPersonLinks instanceof Set")
    || !scriptText.includes("groupPersonLinks.has(groupPersonKey)")
    || !scriptText.includes("renderEraCard(era, groupPersonLinks");
  const protectedPartialInlineHits = protectedPartialInlineTerms
    .filter(({ full, partial }) => JSON.stringify(history).includes(full) || JSON.stringify(peopleData).includes(full))
    .filter(({ partial }) => actionCards[partial] || peopleNames.has(partial))
    .filter(() => missingInlineBoundarySupport)
    .map(({ full, partial }) => [full, partial]);
  const subcategoryTextOutOfRange = subcategories
    .filter((item) => String(item.text || "").length < 100 || String(item.text || "").length > 500)
    .map((item) => [item.id, item.title, String(item.text || "").length]);
  const lineageRequiredIds = ["edo-kaikoku", "edo-unequal", "meiji-ishin", "meiji-sino", "meiji-russo", "showa-ww2"];
  const lineageIdsInScript = lineageThemes.flatMap((theme) => theme.subcategoryIds || []);
  const knownSubcategoryIds = new Set(subcategories.map((item) => item.id));
  const missingLineageIds = lineageIdsInScript.filter((id) => !knownSubcategoryIds.has(id));
  const lineageWarIdsExist = lineageRequiredIds.every((id) => knownSubcategoryIds.has(id));
  const lineageExplorerSupport = indexText.includes('id="lineageOverlay"')
    && indexText.includes('id="lineageOpenButton"')
    && indexText.includes('id="lineageTabs" aria-label="オプションメニュー"')
    && !indexText.includes('id="lineageTabs" aria-label="オプションメニュー" hidden')
    && indexText.indexOf('id="lineageTabs"') < indexText.indexOf('id="lineageOverlay"')
    && !indexText.includes('id="lineageThemeMenuButton"')
    && !indexText.includes('id="lineage" aria-label="テーマ別の歴史の系譜"')
    && indexText.includes("data/lineage-themes.js")
    && scriptText.includes("let lineageThemes = []")
    && scriptText.includes("function normalizeLineageThemesData")
    && scriptText.includes("function loadLineageThemesData")
    && scriptText.includes("function renderLineageExplorer")
    && scriptText.includes("let contentMenuSections = []")
    && scriptText.includes("function renderContentMenu")
    && scriptText.includes("function chooseContentMenuItem")
    && scriptText.includes("function openLineageOverlay")
    && scriptText.includes("function closeLineageOverlay")
    && scriptText.includes("function switchLineageTheme")
    && scriptText.includes("lineageThemeMenuOpen")
    && scriptText.includes("function toggleLineageMenu")
    && scriptText.includes("function chooseLineageTheme")
    && scriptText.includes("document.getElementById(\"lineageTabs\")?.addEventListener")
    && scriptText.includes("lineage-flow-arrow")
    && lineageThemesHaveValidOrder
    && lineageThemes.some((theme) => String(theme.detail || "").includes("戦争の系譜は、幕末の開国から始まります"))
    && !scriptText.includes("lineage-jump-button")
    && stylesText.includes(".lineage-overlay")
    && stylesText.includes(".lineage-panel")
    && stylesText.includes("top: calc(var(--topbar-height, 72px) + 15px)")
    && stylesText.includes("transform: translate(-50%, 0)")
    && stylesText.includes(".lineage-drawer")
    && stylesText.includes("inset: 0 0 0 auto")
    && stylesText.includes("z-index: 1300")
    && stylesText.includes(".lineage-panel-toolbar")
    && !stylesText.includes(".lineage-theme-menu-button")
    && stylesText.includes("font-size: .78rem")
    && stylesText.includes("transition: opacity .42s ease")
    && stylesText.includes("grid-template-rows: auto minmax(350px, 1.35fr) minmax(190px, .65fr)")
    && stylesText.includes(".lineage-event-button span { padding: 0 12px; font-size: .88rem; line-height: 1.22; }")
    && stylesText.includes(".lineage-detail { min-height: 320px;")
    && stylesText.includes(".lineage-flow-arrow")
    && !stylesText.includes("lineage-card:not(:last-child)::after")
    && stylesText.includes("rgba(0, 0, 0, .50)")
    && stylesText.includes(".lineage-card");
  const lineageDetailInlineLinkSupport = /detail\.innerHTML = enrichDetailLinks\(activeTheme\.detail \|\| ""/.test(scriptText)
    && scriptText.includes('const personButton = event.target.closest(".person-inline");')
    && scriptText.includes('openPerson(personButton.dataset.personName);')
    && scriptText.includes('const actionButton = event.target.closest(".action-inline");')
    && scriptText.includes('openAction(actionButton.dataset.actionName, { fromModal: true });')
    && scriptText.includes('const inlineEventButton = event.target.closest(".event-inline");')
    && scriptText.includes('openEventSubcategory(inlineEventButton.dataset.eventId);');
  const lineageRelatedPeopleSupport = scriptText.includes('relatedPeople: (Array.isArray(item?.relatedPeople)')
    && scriptText.includes('function lineageRelatedPersonCard(person)')
    && scriptText.includes('findVisualForPerson(person)')
    && scriptText.includes('lineage-related-person-card')
    && scriptText.includes('data-person-name=')
    && stylesText.includes('.lineage-related-person-card')
    && stylesText.includes('.lineage-related-person-image');
  const parentheticalActionAliasSupport = scriptText.includes("function stripActionParentheticalName(name)")
    && scriptText.includes("function actionParentheticalAliases()")
    && scriptText.includes("allowKanjiAdjacent: true")
    && scriptText.includes('if (item?.type === "person" || item?.allowKanjiAdjacent) return true;')
    && scriptText.includes("const aliasItems = [...actionParentheticalAliases(), ...inlineLinkAliases]");
  const actionReadingRubySupport = scriptText.includes("reading: entry?.reading || entry?.ruby?.reading || \"\"")
    && scriptText.includes("ruby: entry?.ruby || null")
    && scriptText.includes("...Object.entries(actionCards)")
    && scriptText.includes(".map(([name, action]) => [name, action.ruby?.reading || action.reading || \"\"])")
    && scriptText.includes(".filter(([, reading]) => Boolean(reading))");
  const rubyGlossaryOverrideProtection = scriptText.includes("...Object.entries(actionCards)")
    && scriptText.includes(".map(([name, action]) => [name, action.ruby?.reading || action.reading || \"\"])")
    && scriptText.includes(".filter(([, reading]) => Boolean(reading))");
  const actionReadingExceptions = new Set(["元", "第二次世界大戦 (太平洋戦争含む )", "太平洋戦争(第二次世界大戦)"]);
  const actionTermsMissingReadings = Object.entries(actionCards)
    .filter(([name, action]) => hasKanji(name) && !hasKatakana(name) && !actionReadingExceptions.has(name) && !(action?.reading || action?.ruby?.reading || rubyGlossary[name] || rubyGlossary[stripParenthetical(name)]))
    .map(([name]) => name);
  const personRubyTermsMissingReadings = people
    .filter((person) => hasKanji(person.name) && !hasKatakana(person.name) && !(person.kana || person.rubyKana || rubyGlossary[person.name] || rubyGlossary[stripParenthetical(person.name)]))
    .map((person) => person.name);
  const aliasReadingCorpus = JSON.stringify({ history, actionData, lineageData, learningTermsData });
  const personAliasTermsMissingReadings = people
    .flatMap((person) => personAliases(person).map((alias) => ({ alias, person: person.name, rubyName: person.rubyName })))
    .filter(({ alias, person, rubyName }) => hasKanji(alias) && !hasKatakana(alias) && alias !== person && stripParenthetical(alias) !== person && alias !== rubyName && stripParenthetical(alias) !== rubyName)
    .filter(({ alias }) => aliasReadingCorpus.includes(alias) || aliasReadingCorpus.includes(stripParenthetical(alias)))
    .filter(({ alias }) => !(rubyGlossary[alias] || rubyGlossary[stripParenthetical(alias)]))
    .map(({ alias, person }) => [alias, person]);
  const requiredRubyTerms = [
    ["親魏倭王", "しんぎわおう"],
    ["魏志倭人伝", "ぎしわじんでん"],
    ["環濠集落", "かんごうしゅうらく"],
    ["邪馬台国", "やまたいこく"],
    ["遼東半島", "りょうとうはんとう"],
    ["蛤御門", "はまぐりごもん"],
    ["琉球", "りゅうきゅう"],
    ["桶狭間", "おけはざま"],
    ["比叡山", "ひえいざん"],
    ["刀鍛冶", "かたなかじ"],
    ["銅銭", "どうせん"],
    ["絹織物", "きぬおりもの"],
    ["陶磁器", "とうじき"],
    ["慈照寺", "じしょうじ"],
    ["功績", "こうせき"],
    ["壇ノ浦", "だんのうら"],
    ["外祖父", "がいそふ"],
    ["朱雀大路", "すざくおおじ"],
    ["足尾銅山", "あしおどうざん"],
    ["藤原種継", "ふじわらのたねつぐ"],
    ["滝沢馬琴", "たきざわばきん"],
    ["十返舎一九", "じっぺんしゃいっく"],
    ["井原西鶴", "いはらさいかく"],
    ["近松門左衛門", "ちかまつもんざえもん"],
    ["菱川師宣", "ひしかわもろのぶ"],
    ["大村純忠", "おおむらすみただ"],
    ["有馬晴信", "ありまはるのぶ"],
    ["田中正造", "たなかしょうぞう"],
    ["倭寇", "わこう"],
    ["日宋貿易", "にっそうぼうえき"],
    ["連合国軍総司令部", "れんごうこくぐんそうしれいぶ"],
    ["天正遣欧少年使節", "てんしょうけんおうしょうねんしせつ"],
    ["民主主義", "みんしゅしゅぎ"],
    ["選挙権", "せんきょけん"],
    ["盧溝橋", "ろこうきょう"],
    ["人形浄瑠璃", "にんぎょうじょうるり"],
    ["政所", "まんどころ"],
    ["侍所", "さむらいどころ"],
    ["問注所", "もんちゅうじょ"],
    ["踊念仏", "おどりねんぶつ"],
    ["大和絵", "やまとえ"],
    ["平等院鳳凰堂", "びょうどういんほうおうどう"],
    ["開眼供養", "かいげんくよう"]
  ];
  const requiredRubyTermReadings = requiredRubyTerms
    .filter(([term, reading]) => rubyGlossary[term] !== reading)
    .map(([term, reading]) => [term, reading, rubyGlossary[term] || null]);
  const eraIds = new Set(eras.map((era) => era.id));
  const peoplePrimaryEraIdsMissing = people.filter((person) => !person.primaryEraId).map((person) => person.name);
  const peoplePrimaryEraIdsInvalid = people.filter((person) => person.primaryEraId && !eraIds.has(person.primaryEraId)).map((person) => [person.name, person.primaryEraId]);
  const personGenreLabels = peopleData.genreLabels || {};
  const personGenreIds = new Set(Object.keys(personGenreLabels));
  const peopleGenresMissing = people.filter((person) => !person.genre).map((person) => person.name);
  const peopleGenresInvalid = people.filter((person) => person.genre && !personGenreIds.has(person.genre)).map((person) => [person.name, person.genre]);
  const imageItems = subcategories.filter((item) => item.image);
  const imageFocusCounts = imageItems.reduce((counts, item) => {
    const key = item.imageFocus || "center";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  const sourceFiles = [
    "script.js",
    "data/history-content.json",
    "data/history-content.js",
    "data/people-data.json",
    "data/people-data.js",
    "data/action-cards.json",
    "data/action-cards.js",
    "data/lineage-themes.json",
    "data/lineage-themes.js",
    "data/learning-terms.json",
    "data/learning-terms.js",
    "scripts/image-workbench-server.js",
    "image-workbench.js"
  ];
  const dataFiles = [
    "data/history-content.json",
    "data/history-content.js",
    "data/people-data.json",
    "data/people-data.js",
    "data/action-cards.json",
    "data/action-cards.js",
    "data/lineage-themes.json",
    "data/lineage-themes.js",
    "data/learning-terms.json",
    "data/learning-terms.js"
  ];
  const replacementCharacterFiles = dataFiles.filter((file) => read(file).includes("\uFFFD"));
  const katakanaRubyPattern = /<ruby>[^<]*[\u30A1-\u30FA\u30FC]/;
  const syntax = [
    "script.js",
    "data/history-content.js",
    "data/people-data.js",
    "data/action-cards.js",
    "data/lineage-themes.js",
    "data/learning-terms.js"
  ].map(syntaxCheck);
  const modalBoilerplatePatterns = [
    "流れを知るための出来事です",
    "確認することが大切です",
    "単なる暗記ではなく",
    "深く関わって活躍した人物です",
    "役割を果たしました",
    "手がかりになります",
    "に関わる「",
    "tags: [...tags, \\\"もっと知る\\\"]"
  ];

  const modalFavoriteTooltipSupport = scriptText.includes("data-modal-favorite")
    && scriptText.includes("title=\"お気に入りに追加\"")
    && scriptText.includes("button.setAttribute(\"title\", \"お気に入りに追加\");");

  const forbiddenPrimaryEraDeriver = "derive" + "PrimaryEraId" + "ForPerson";

  const result = {
    syntax,
    historyJsMatchesJson: JSON.stringify(sandbox.window.historyContentData) === JSON.stringify(history),
    peopleJsMatchesJson: JSON.stringify(sandbox.window.JAPAN_HISTORY_PEOPLE_DATA) === JSON.stringify(peopleData),
    actionJsMatchesJson: JSON.stringify(sandbox.window.JAPAN_HISTORY_ACTION_CARDS_DATA) === JSON.stringify(actionData),
    peopleSchemaVersion: peopleData.schemaVersion,
    actionSchemaVersion: actionData.schemaVersion,
    peopleAreObjects: people.every((person) => person && !Array.isArray(person) && person.name && person.modal),
    peoplePrimaryEraIdsMissing,
    peoplePrimaryEraIdsInvalid,
    primaryEraIdStoredOnPeople: peoplePrimaryEraIdsMissing.length === 0 && peoplePrimaryEraIdsInvalid.length === 0 && !scriptText.includes(forbiddenPrimaryEraDeriver) && !scriptText.includes("primaryEraId ||"),
    peopleGenresMissing,
    peopleGenresInvalid,
    personGenreStoredOnPeople: Object.keys(personGenreLabels).length > 0 && peopleGenresMissing.length === 0 && peopleGenresInvalid.length === 0 && !scriptText.includes("personGenreGroups") && !scriptText.includes("derivePersonGenre") && scriptText.includes("personGenreLabels = data.genreLabels || {}") && scriptText.includes("return personGenreById(person.genre);"),
    topLevelPersonModalDetails: Boolean(peopleData.personModalDetails),
    groups: groups.length,
    eras: eras.length,
    subcategories: subcategories.length,
    subcategoryImages: imageItems.length,
    imageFocusCounts,
    imageFilesExist: imageItems.every((item) => fs.existsSync(path.isAbsolute(item.image) ? item.image : path.join(root, item.image))),
    people: people.length,
    peopleByName: Object.keys(peopleData.peopleByName || {}).length,
    personReferenceNames: peopleNames.size,
    actions: Object.keys(actionCards).length,
    actionCardsAreObjects: Object.values(actionCards).every((action) => action && !Array.isArray(action) && action.modal),
    actionModalFieldsMissing,
    unexpectedActionDescriptions,
    missingInlineAliases,
    eventTitleReferencesWithoutAction,
    missingModalEventLinkSupport,
    missingModalLinkFunction,
    missingModalSelfLinkSuppression,
    modalSingleFrameSupport,
    missingInlineBoundarySupport,
    missingGroupPersonLinkDedupSupport,
    duplicatePersonMentionsByGroup,
    eventInlineStyled: /\.person-inline,\s*\.action-inline,\s*\.event-inline\s*\{/.test(stylesText) && /\.action-inline,\s*\.event-inline\s*\{/.test(stylesText) && /\.action-inline:hover,\s*\.event-inline:hover\s*\{/.test(stylesText) && /\.person-inline:focus-visible,\s*\.action-inline:focus-visible,\s*\.event-inline:focus-visible\s*\{/.test(stylesText),
    eventModalGeneratedContentRemoved: !scriptText.includes('title: "何につながった？"') && !scriptText.includes('"出来事カード"]') && !scriptText.includes('<span class="tag">出来事カード</span>'),
    modalBoilerplateRemoved: modalBoilerplatePatterns.filter((pattern) => scriptText.includes(pattern)),
    personDisplayNameSupport: scriptText.includes("function personDisplayNameHtml") && scriptText.includes("function personAliases") && scriptText.includes("person.displayName") && scriptText.includes("person.nameQualifier"),
    protectedPartialInlineHits,
    missingPeople,
    peopleNotInText,
    personMentionsMissingFromSubcategoryPeople,
    modalFieldsMissing,
    subcategoryTextOutOfRange,
    duplicatePeople,
    replacementCharacterFiles,
    katakanaRubyFiles: sourceFiles.filter((file) => katakanaRubyPattern.test(read(file))),
    noRegionalTimeline: !JSON.stringify(history).includes("regional-timeline"),
    lineageJsMatchesJson,
    learningTermsJsMatchesJson,
    learningTermsHaveReadings: Object.keys(rubyGlossary).length > 0,
    learningTermsHaveTooltips: Object.keys(termTooltipGlossary).length > 0,
    learningTermsTooltipExcludedViolations,
    lineageThemesHaveValidOrder,
    lineageVisibleOrder,
    lineageVisibleOrderMatchesRequested,
    lineageMenuSectionsHaveValidThemeIds,
    lineageRiseFallSubmenu,
    contentMenuHasLineageSection,
    contentMenuHasExtraItems,
    lineageExplorerSupport,
    lineageDetailInlineLinkSupport,
    lineageRelatedPeopleSupport,
    parentheticalActionAliasSupport,
    actionReadingRubySupport,
    rubyGlossaryOverrideProtection,
    actionTermsMissingReadings,
    personRubyTermsMissingReadings,
    personAliasTermsMissingReadings,
    requiredRubyTermReadings,
    rubyShirabeGuard: scriptText.includes('word === "調" && after === "べ"'),
    rubyHistoricalNameMarkerSupport: scriptText.includes("function hasRubyBlockingKatakana") && scriptText.includes('char === "ヶ" || char === "ノ"') && scriptText.includes("!hasRubyBlockingKatakana(text)"),
    termTooltipSupport: scriptText.includes("let termTooltipGlossary = {}") && scriptText.includes("function normalizeLearningTermsData") && scriptText.includes("function loadLearningTermsData") && indexText.includes("data/learning-terms.js") && scriptText.includes("window.JAPAN_HISTORY_LEARNING_TERMS_DATA") && !scriptText.includes("function fallbackTermTooltip") && !scriptText.includes("fallbackTermTooltip(") && scriptText.includes("function termTooltipHtml") && scriptText.includes("if (!tooltip) return `<strong>${innerHtml}</strong>`;") && scriptText.includes("function setupTermTooltips") && scriptText.includes("function ensureTermTooltipLayer") && scriptText.includes("data-term-tooltip") && stylesText.includes(".term-tooltip-layer"),
    termTooltipRubySupport: scriptText.includes("layer.innerHTML = applyStudyRuby(tooltip, { disableTooltips: true });"),
    modalLinkTooltipSuppression: scriptText.includes("function hasModalLinkTarget") && scriptText.includes("function modalLinkTerms") && scriptText.includes("if (hasModalLinkTarget(word)) return `<strong>${innerHtml}</strong>`;") && scriptText.includes("const inlineLabelOptions = { disableTooltips: true }"),
    modalFavoriteTooltipSupport,
    titleTooltipDisabled: scriptText.includes("const disableTooltips = options.disableTooltips === true") && scriptText.includes("if (!boldTerms || disableTooltips || boldTerms.has(word)) return html;") && scriptText.includes("const headingRubyOptions = { disableTooltips: true }") && scriptText.includes("<h2>${applyStudyRuby(era.name, headingRubyOptions)}</h2>"),
    lineageWarIdsExist,
    missingLineageIds
  };

  const failures = [];
  for (const item of syntax) if (!item.ok) failures.push(`syntax:${item.file}`);
  if (!result.historyJsMatchesJson) failures.push("historyJsMatchesJson");
  if (!result.peopleJsMatchesJson) failures.push("peopleJsMatchesJson");
  if (!result.actionJsMatchesJson) failures.push("actionJsMatchesJson");
  if (result.peopleSchemaVersion !== 2) failures.push("peopleSchemaVersion");
  if (result.actionSchemaVersion !== 2) failures.push("actionSchemaVersion");
  if (!result.peopleAreObjects) failures.push("peopleAreObjects");
  if (result.peoplePrimaryEraIdsMissing.length) failures.push("peoplePrimaryEraIdsMissing");
  if (result.peoplePrimaryEraIdsInvalid.length) failures.push("peoplePrimaryEraIdsInvalid");
  if (!result.primaryEraIdStoredOnPeople) failures.push("primaryEraIdStoredOnPeople");
  if (result.peopleGenresMissing.length) failures.push("peopleGenresMissing");
  if (result.peopleGenresInvalid.length) failures.push("peopleGenresInvalid");
  if (!result.personGenreStoredOnPeople) failures.push("personGenreStoredOnPeople");
  if (result.topLevelPersonModalDetails) failures.push("topLevelPersonModalDetails");
  if (result.groups !== 7) failures.push("groups");
  if (result.eras !== 16) failures.push("eras");
  if (result.subcategories < 1) failures.push("subcategories");
  if (!result.imageFilesExist) failures.push("imageFilesExist");
  if (result.people < 1) failures.push("people");
  if (result.peopleByName !== result.people) failures.push("peopleByName");
  if (result.actions < 1) failures.push("actions");
  if (!result.actionCardsAreObjects) failures.push("actionCardsAreObjects");
  if (!result.lineageJsMatchesJson) failures.push("lineageJsMatchesJson");
  if (!result.learningTermsJsMatchesJson) failures.push("learningTermsJsMatchesJson");
  if (!result.learningTermsHaveReadings) failures.push("learningTermsHaveReadings");
  if (!result.learningTermsHaveTooltips) failures.push("learningTermsHaveTooltips");
  if (result.learningTermsTooltipExcludedViolations.length) failures.push("learningTermsTooltipExcludedViolations");
  if (!result.lineageThemesHaveValidOrder) failures.push("lineageThemesHaveValidOrder");
  if (!result.lineageVisibleOrderMatchesRequested) failures.push("lineageVisibleOrderMatchesRequested");
  if (!result.lineageMenuSectionsHaveValidThemeIds) failures.push("lineageMenuSectionsHaveValidThemeIds");
  if (!result.lineageRiseFallSubmenu) failures.push("lineageRiseFallSubmenu");
  if (!result.contentMenuHasLineageSection) failures.push("contentMenuHasLineageSection");
  if (!result.contentMenuHasExtraItems) failures.push("contentMenuHasExtraItems");
  if (result.actionModalFieldsMissing.length) failures.push("actionModalFieldsMissing");
  if (result.unexpectedActionDescriptions.length) failures.push("unexpectedActionDescriptions");
  if (result.missingInlineAliases.length) failures.push("missingInlineAliases");
  if (result.missingModalEventLinkSupport) failures.push("missingModalEventLinkSupport");
  if (result.missingModalLinkFunction) failures.push("missingModalLinkFunction");
  if (result.missingModalSelfLinkSuppression) failures.push("missingModalSelfLinkSuppression");
  if (!result.modalSingleFrameSupport) failures.push("modalSingleFrameSupport");
  if (result.missingGroupPersonLinkDedupSupport) failures.push("missingGroupPersonLinkDedupSupport");
  if (result.protectedPartialInlineHits.length) failures.push("protectedPartialInlineHits");
  if (!result.eventInlineStyled) failures.push("eventInlineStyled");
  if (!result.eventModalGeneratedContentRemoved) failures.push("eventModalGeneratedContentRemoved");
  if (result.modalBoilerplateRemoved.length) failures.push("modalBoilerplateRemoved");
  if (!result.personDisplayNameSupport) failures.push("personDisplayNameSupport");
  if (result.missingPeople.length) failures.push("missingPeople");
  if (result.peopleNotInText.length) failures.push("peopleNotInText");
  if (result.modalFieldsMissing.length) failures.push("modalFieldsMissing");
  if (result.subcategoryTextOutOfRange.length) failures.push("subcategoryTextOutOfRange");
  if (result.duplicatePeople.length) failures.push("duplicatePeople");
  if (result.replacementCharacterFiles.length) failures.push("replacementCharacterFiles");
  if (result.katakanaRubyFiles.length) failures.push("katakanaRubyFiles");
  if (!result.noRegionalTimeline) failures.push("noRegionalTimeline");
  if (!result.lineageExplorerSupport) failures.push("lineageExplorerSupport");
  if (!result.lineageDetailInlineLinkSupport) failures.push("lineageDetailInlineLinkSupport");
  if (!result.lineageRelatedPeopleSupport) failures.push("lineageRelatedPeopleSupport");
  if (!result.parentheticalActionAliasSupport) failures.push("parentheticalActionAliasSupport");
  if (!result.actionReadingRubySupport) failures.push("actionReadingRubySupport");
  if (!result.rubyGlossaryOverrideProtection) failures.push("rubyGlossaryOverrideProtection");
  if (result.actionTermsMissingReadings.length) failures.push("actionTermsMissingReadings");
  if (result.personRubyTermsMissingReadings.length) failures.push("personRubyTermsMissingReadings");
  if (result.personAliasTermsMissingReadings.length) failures.push("personAliasTermsMissingReadings");
  if (result.requiredRubyTermReadings.length) failures.push("requiredRubyTermReadings");
  if (!result.rubyShirabeGuard) failures.push("rubyShirabeGuard");
  if (!result.rubyHistoricalNameMarkerSupport) failures.push("rubyHistoricalNameMarkerSupport");
  if (!result.termTooltipSupport) failures.push("termTooltipSupport");
  if (!result.termTooltipRubySupport) failures.push("termTooltipRubySupport");
  if (!result.modalFavoriteTooltipSupport) failures.push("modalFavoriteTooltipSupport");
  if (!result.titleTooltipDisabled) failures.push("titleTooltipDisabled");
  if (!result.lineageWarIdsExist) failures.push("lineageWarIdsExist");
  if (result.missingLineageIds.length) failures.push("missingLineageIds");

  result.ok = failures.length === 0;
  result.failures = failures;
  console.log(JSON.stringify(result, null, 2));
  if (failures.length) process.exit(1);
}

run();







































































