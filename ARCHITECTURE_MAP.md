# 日本史教材 アーキテクチャマップ

このファイルは、機能・データ・表示・保存処理がどこにあり、どのように連動しているかを監査するための地図です。追加・削除・修正を行った場合は、該当する項目を必ず同じ作業内で更新します。

## 更新ルール

- 機能、データ構造、CSSクラス、保存API、検証手順を変更したら、このファイルを更新する。
- ファイル名、関数名、データ項目名、API名、CSSクラス名を具体的に書く。
- 推測で書かない。確認できた構造だけを書く。
- 古い仕様を残す場合は「廃止」「互換」「バックアップ」と明記する。
- 検証済みでない画面確認を「確認済み」と書かない。

## 全体構成

| 領域 | 主ファイル | 役割 |
|---|---|---|
| 本番ページ | `index.html` | 教材本体のHTML。`data/*.js` と `script.js` を読み込む。テーマ別系譜と特集はトップバーの `#lineageOpenButton` と上部バー下15px基準のオーバーレイ `#lineageOverlay` で定義する。右上ボタンは「オプション」メニューで、系譜はその中のサブメニューとして扱う。テーマ/特集一覧はパネル内に置かず、トップバー右端の `#lineageOpenButton` から画面右固定の `#lineageTabs.lineage-drawer` として開く。 |
| 本番表示ロジック | `script.js` | 年表、子カテゴリー、人物カード、アクションカード、出来事カード、リンク、モーダル、検索、現在地表示を制御する。モーダル本文では `currentEntry` と `isCurrentModalTarget` により、現在開いている同名コンテンツはリンク化せず `<strong>` で強調する。人物カード・アクションカードにならない初出太字語は `data/learning-terms.json` の `terms[語].tooltip` に個別説明がある場合だけロールオーバー説明を持つ。UI側の定型文 fallback は廃止し、説明文は外部データで管理する。表示は `setupTermTooltips()` / `ensureTermTooltipLayer()` が `body` 直下へ作る固定レイヤー `.term-tooltip-layer` で行い、本文カードやモーダル内の `overflow` に切られない。PCのホバー可能環境では `pointerover` / `pointerout` によるロールオーバー表示、携帯ではタップまたは長押しによる表示切替を行う。ツールチップ本文は `applyStudyRuby(tooltip, { disableTooltips: true })` で描画し、説明文内の学習語にもルビを付けるが、入れ子のツールチップは生成しない。 |
| 本番デザイン | `styles.css` | 本番ページのレイアウト、カード、モーダル、年代表記、画像表示位置を制御する。人物・アクションモーダルは `.modal-type-person .modal-section-grid` / `.modal-type-action .modal-section-grid` を一体枠にし、内部の `modal-info-section` を縦並びにする。各セクションはアイコンを左に固定し、右側に小さめの見出しと本文を縦に配置する。出来事モーダルは `.modal-type-event` の単独セクション表示を維持する。系譜メニュー `.lineage-tab` は `script.js` で `escapeHtml(theme.title)` のプレーンテキストとして描画し、`styles.css` で `white-space: nowrap` を指定して項目名の途中改行を防ぐ。`.term-tooltip` は初出太字語の対象を示し、通常リンクとは違う点線下線・薄い背景・helpカーソルで補足説明語として区別する。通常リンク `.person-inline` / `.action-inline` / `.event-inline` は実線下線のクリック可能リンクとして表示する。実際の説明ポップアップは `body` 直下の `.term-tooltip-layer` で最前面表示する。 |
| 画像作業ページ | `image-workbench.html` | 画像の割り当て、削除、差し替え、既存カテゴリー画像選択、本体反映、ロールバックUI。 |
| 画像作業ページロジック | `image-workbench.js` | 画像作業ページの一覧、編集、プレビュー、変更パッチ、本体反映リクエストを制御する。 |
| 画像作業ページデザイン | `image-workbench.css` | 画像作業ページの一覧、編集パネル、プレビュー、書き出しUIを制御する。 |
| 専用サーバー | `scripts/image-workbench-server.js` | `http://127.0.0.1:4184/` の配信、画像反映API、バックアップ、ロールバックを制御する。 |
| データ | `data/*.json` | 本番データの正本。 |
| 配布用データ | `data/*.js` | ブラウザ読み込み用の `window.*` 代入ファイル。JSONと同期必須。 |
| 静的検証 | `scripts/verify-static.ps1`, `scripts/verify-static.js` | JSON/JS同期、構文、リンク、文字化け、基本データ構造を確認する。`renderEraCard(era, groupPersonLinks, groupRubyBoldTerms)` のような追加引数付き呼び出しでも、人物リンクの大カテゴリー内重複抑制が残っているかを確認する。 |
| 検証手順 | `VERIFICATION_GUIDE.md` | 検証の順序、失敗済み手順、UNC作業フォルダでブラウザ自動化が起動しない場合の代替確認方針を管理する。 |
| バックアップ | `backups/` | 手動変更・画像反映・ロールバック用の保存先。 |
| デザイン復元 | `design-baseline/`, `scripts/save-design-baseline.ps1`, `scripts/restore-design-baseline.ps1` | 承認済みデザインの保存・復元。 |

## 本番ページの読み込み順

`index.html` は次の順で読み込む。

1. `styles.css?v=...`
2. `data/history-content.js`
3. `data/people-data.js`
4. `data/action-cards.js`
5. `data/lineage-themes.js`
6. `data/learning-terms.js`
7. `script.js?v=...`

`script.js` は `window.historyContentData`、`window.JAPAN_HISTORY_PEOPLE_DATA`、`window.JAPAN_HISTORY_ACTION_CARDS_DATA`、`window.JAPAN_HISTORY_LINEAGE_THEMES_DATA` を優先して読み込む。存在しない場合はJSONをfetchする。

## データ正本と配布データ

| 正本JSON | 配布JS | window名 | 主な内容 |
|---|---|---|---|
| `data/history-content.json` | `data/history-content.js` | `window.historyContentData` | 大カテゴリー、時代、時代画像、子カテゴリー、子カテゴリー画像、本文、年代、人物参照。 |
| `data/people-data.json` | `data/people-data.js` | `window.JAPAN_HISTORY_PEOPLE_DATA` | 人物カード。表示名、ルビ、別名、`primaryEraId`、`genre`、`genreLabels`、モーダル本文、画像。人物説明の正本は `modal.profile`。人物ジャンルと主所属時代は外部JSONを正とし、`script.js` では推測・補完しない。 |
| `data/action-cards.json` | `data/action-cards.js` | `window.JAPAN_HISTORY_ACTION_CARDS_DATA` | アクションカード。用語、summary、tags、modal.whatHappened、modal.whyImportant、画像。カード内 `description` は廃止済み。本文リンク対象の用語もここで管理する。 |
| `data/lineage-themes.json` | `data/lineage-themes.js` | `window.JAPAN_HISTORY_LINEAGE_THEMES_DATA` | オプションメニュー。系譜テーマは表示順 `order`、系譜内サブメニュー `menuSections`、テーマID、タイトル、summary、detail、参照する既存子カテゴリーID列で管理する。右上メニュー全体は `contentMenuSections` が正本で、`source: "lineageThemes"` の系譜セクションと、`日本の怨霊` などの `type: "content"` 特集を同じドロワーに表示する。系譜本文・画像は複製せず、既存子カテゴリーを参照する。 |
| `data/learning-terms.json` | `data/learning-terms.js` | `window.JAPAN_HISTORY_LEARNING_TERMS_DATA` | ルビ辞書、特殊語、人物・アクションカードにならない初出太字語のツールチップ説明文。`schemaVersion: 1`、`terms[語].reading` を基本に、特別な補足説明が必要な非リンク語だけ任意の `terms[語].tooltip` を持つ。`～時代`、人物カード名、アクションカード名、`武士` などの一般語には tooltip を持たせない。 |

同期ルール:

- JSONを更新したら対応するJSも同時更新する。
- `scripts/verify-static.ps1` のJSON/JS同期項目が真であることを確認する。
- 画像作業ページの本体反映は正本JSONと配布JSの両方を書き換える。
### 人物名カバレッジ監査

- 対象人物名は `data/people-data.json` の `people[].name` だけを正とする。
- 対象本文は `data/history-content.json` の全子カテゴリー `subcategories[].text` とする。
- 監査時は全人物名リストを `reports/person-card-name-list-*.txt` に保存し、本文に一度も登場しない人物を `reports/person-name-missing-*.json` に保存する。
- 欠落人物を追加した場合は、該当子カテゴリー本文に人物名を入れ、同じ子カテゴリーの `people` 配列にも同じ人物名を追加する。
- 合格条件は、欠落人物数が0、`subcategoryTextOutOfRange` が空、`scripts/verify-static.ps1` の `"ok": true` と `"failures": []` が同時に成立すること。

## `script.js` 機能マップ

### データ読み込み・正規化

| 関数 | 役割 |
|---|---|
| 
ormalizeHistoryContent(content)` | `history-content` を本番表示用の `eras`、`eraGroups`、`eraDetails`、`eraEventSubcategories` に展開する。 |
| `loadHistoryContent()` | `window.historyContentData` または `data/history-content.json` を読み込む。 |
| 
ormalizeActionCardEntry(name, entry)` | 旧形式を含むアクションカード1件を現行形式へ正規化する。現行形式では `reading` と `ruby` も保持し、本文ルビへ渡す。 |
| 
ormalizeActionCardsData(data)` | アクションカード全体を正規化する。 |
| `loadActionCardsData()` | `window.JAPAN_HISTORY_ACTION_CARDS_DATA` または `data/action-cards.json` を読み込む。 |
| 
ormalizeLearningTermsData(data)` | `data/learning-terms.json` / `.js` の `terms` からルビ用 `rubyGlossary` とツールチップ用 `termTooltipGlossary` を作る。 |
| `loadLearningTermsData()` | `window.JAPAN_HISTORY_LEARNING_TERMS_DATA` または `data/learning-terms.json` を読み込み、ルビ辞書とツールチップ辞書を初期化する。 |
| 
ormalizePersonRecord(record, modalDetails)` | 人物カード1件を現行形式へ正規化する。`primaryEraId` と `genre` は人物データ上の値を保持し、`script.js` 側では推測・補完しない。欠落や不正値は `scripts/verify-static.js` で失敗扱いにする。 |
| 
ormalizePeopleData(data)` | 人物データ全体を正規化し、`personByName` を作る。 |
| `loadPeopleData()` | `window.JAPAN_HISTORY_PEOPLE_DATA` または `data/people-data.json` を読み込む。 |

### ルビ・表示名・リンク

| 関数 | 役割 |
|---|---|
| `hasKatakana(text)` | カタカナ混入を判定する。カタカナ語にルビを付けないための基礎判定に使う。 |`r
| `hasRubyBlockingKatakana(text)` | 外来語などのカタカナ語ルビを止める。`関ヶ原` の `ヶ`、`壇ノ浦` の `ノ` のように、漢字を含む日本史固有名の表記記号だけは例外としてルビを許可する。 |
| `isRubyWordBoundary(source, index, word)` | 一文字の漢字学習語が別の漢字熟語内で誤ってルビ化されないよう、前後の漢字接続を判定する。`調べ` は学習語 `調` として分割せず、誤ルビ `調(ちょう)べ` を防ぐ。 |
| `shouldApplyRuby(text, reading)` | ルビ適用可否を判定する。 |
| `ruby(text, reading)` | `<ruby>` HTMLを生成する。 |
| `personAliases(person)` | 人物別名を取得する。 |
| `personDisplayNameText(person)` | 人物のプレーン表示名を作る。 |
| `personDisplayNameHtml(person)` | 人物のHTML表示名を作る。 |
| `studyRubyReadings()` / `applyStudyRuby(text, options)` | 本文中の学習語ルビを適用する。`rubyGlossary`、人物 
ame/kana`、人物 `rubyName/rubyKana`、アクションカード `reading` / `ruby.reading` を統合して読みを決める。`options.boldTerms` に大カテゴリー単位の `Set` を渡した場合、その大カテゴリー内で初めて出た学習語だけ `<strong>` で強調し、2回目以降はルビのみ表示する。本文上で太字にしたい人物名・特殊語も `rubyGlossary` の固定読みで管理し、外来語などのカタカナ語は追加しない。ただし `関ヶ原` の `ヶ`、`壇ノ浦` の `ノ` のような漢字を含む日本史固有名の表記記号は `hasRubyBlockingKatakana()` の例外としてルビ対象にする。`data/learning-terms.json` の `terms[].tooltip` に説明がある非リンク語だけ個別説明を表示する。`options.disableTooltips: true` を渡した大カテゴリー名・見出し・タグなどのタイトル領域はルビだけを表示し、ツールチップリンクや大カテゴリー内の初出消費を行わない。`fallbackTermTooltip()` は廃止済みで、未登録語は `termTooltipHtml()` が通常の `<strong>` に戻し、定型文ツールチップを出さない。`setupTermTooltips()` がイベント委譲でPCの hover/focus、携帯のタップ/長押し、Enter/Space、Escapeを拾い、`ensureTermTooltipLayer()` が `body` 直下へ固定レイヤーを生成して画面端で上下左右を補正する。 |
| `enrichDetailLinks(text, options)` | 本文中の人物・アクション・出来事へのリンクを生成する。`options.groupRubyBoldTerms` を `applyStudyRuby()` に渡し、リンク化されない学習語も大カテゴリー内の初回だけ太字にする。人物カード・アクションカードがある語はボタンリンクを優先し、ツールチップ太字にはしない。 |
| `isInlineLinkBoundary(text, index, name, item)` | 語の境界を判定し、誤リンクを防ぐ。 |

### 年表・子カテゴリー

| 関数 | 役割 |
|---|---|
| `renderEraLinks()` | 左メニュー/ページ目次を描画する。 |
| `renderEraCard(era, groupPersonLinks, groupRubyBoldTerms)` | 1つの時代カード、詳細カード、子カテゴリー一覧、時代人物一覧を生成する。`groupRubyBoldTerms` を共有し、大カテゴリー内の学習語初出だけを太字にする。 |
| `syncSubcategoryYearLabels()` | 開いている大カテゴリー内の子カテゴリー年代札を、左年代ライン側へ同期配置する。 |
| `scheduleSubcategoryYearLabelSync()` | 年代札同期を `requestAnimationFrame` で予約する。 |
| `renderTimeline()` | 大カテゴリーと時代カードを生成する。大カテゴリー年代表記は `group.westernYear` を優先し、未設定時だけ時代カードの `westernYear` から補完する。大カテゴリーごとに `groupRubyBoldTerms` を作り、`groupRubyBoldTermsById` に保存して時代カード・子カテゴリー・開閉詳細の初出太字判定で共有する。大カテゴリー開閉時に子カテゴリー年代札を再同期する。 |
| `openGroupForEra(eraId)` | 指定時代を含む大カテゴリーを開く。 |
| 
avigateToGroupFromMenu(groupId)` | 目次から大カテゴリーへ移動する。 |
| `openEraDetail(button)` / `closeEraDetail()` | `くらし`、`できごと`、`大きな力` の詳細パネルを開閉する。PCでは従来通り3項目の後ろに詳細を表示し、スマホ幅では押した `.fact-item` の直後へ `.inline-detail` を差し込んで、選んだ項目のすぐ下に本文を表示する。開いた詳細本文も `groupRubyBoldTermsById` の大カテゴリー単位セットを使い、既出学習語は太字を繰り返さない。 |
| 
ormalizeLineageThemesData(data)` / `loadLineageThemesData()` / `lineageThemes` / `lineageThemeMenuSections` / `contentMenuSections` / `contentMenuItemsById` | `data/lineage-themes.json` / `.js` のオプションメニュー正本を読み込み、`order` 順に表示用 `lineageThemes`、`menuSections` 順に系譜内サブメニュー、`contentMenuSections` 順に右上オプションメニューを正規化する。テーマ本文・表示順・参照子カテゴリーID・特集本文・サブメニュー構造は `script.js` へ直書きしない。 |
| `renderLineageThemeMenu()` / `renderContentMenu()` / `renderLineageExplorer()` / `chooseContentMenuItem()` | 右固定の `#lineageTabs.lineage-drawer` と系譜/特集パネルを描画する。`renderContentMenu()` は `contentMenuSections` に従い、系譜セクションと特集セクションを同じ右ドロワーに表示する。系譜項目は既存の系譜カード列を開き、`type: "content"` 項目は同じオーバーレイで本文のみを表示する。 |
| `openEventSubcategory(id)` | 系譜カードから既存の出来事/アクションモーダルを手前に開く。年表へジャンプする専用ボタンは使わない。 |

大カテゴリー年代の現在仕様:

- データ項目は `history-content.json` の各 `group.westernYear`。
- 表示形式は `1185年～1567年` のように `～` を使う。`ごろ` と半角ハイフンは使わない。
- 子カテゴリー年代を含めつつ、大カテゴリー同士の範囲が重ならないようにする。
- 境界上の子カテゴリーが矛盾する場合は、子カテゴリーの所属を見直してから大カテゴリー範囲を決める。
子カテゴリー年代の現在仕様:

- データ項目は `history-content.json` の各 `subcategory.yearLabel`。
- DOM上では子カテゴリーカードに `data-year-label` として保持する。
- 表示ラベルは `.timeline-subcategory-year-label` として `script.js` が `.era` 直下に生成する。
- 子カテゴリー本文内に余白を作らない。スクロール量を増やさない。
- スマホの子カテゴリーカードでは、`header p` のサブタイトルを必ず表示する。ただしルビ付き文字が省略表示で崩れないよう、`-webkit-line-clamp` は使わず通常ブロックで省略なしに表示する。タイトルは右上のCaretボタンに被らないよう、`.event-subcategory-title` を最大8文字幅程度で折り返し、`h4` にCaret分の右余白を確保する。
- `.era-card { overflow: hidden; }` に切られないよう、年代札は `.era-card` の外側、`.era` 内に置く。

### 人物図鑑

| 関数 | 役割 |
|---|---|
| `personMatches(person, query)` | 人物検索対象テキストを作り、検索に使う。 |
| `personGenreEntries()` / `personGenreById(genreId)` / `getPersonGenre(person)` | `data/people-data.json` の `genreLabels` と各人物の `genre` を読み、人物図鑑フィルター用ジャンルを返す。分類推測は行わない。 |
| `renderPeopleFilters()` | 人物フィルターを描画する。 |
| `renderPersonNameButton(person)` | 人物名一覧ボタンを描画する。 |
| `renderPeople()` | 人物図鑑全体を描画する。`activeFilter === "favorite"` のとき、`localStorage.historyFavorites` に保存された人物だけを表示する。 |
| `toggleFavorite(name, event)` / `updateModalFavoriteButton(name)` | お気に入り状態を `localStorage.historyFavorites` に保存し、人物図鑑と開いている人物モーダル左アイコン下の `data-modal-favorite` ★トグル表示を同期する。 |

### モーダル

| 関数 | 役割 |
|---|---|
| `modalLinkedText(text)` | モーダル本文内リンクを生成する。 |
| `findVisualForPerson(person)` | 人物モーダル画像を決定する。 |
| `findVisualForAction(name, tags, action)` | アクションモーダル画像を決定する。 |
| `findVisualForEventSubcategory(item)` | 出来事モーダル画像を決定する。 |
| `modalVisualHtml(visual, icon, title)` | モーダル画像領域HTMLを生成する。 |
| `modalSectionHtml(icon, title, text)` | モーダル本文セクションを生成する。 |
| `pushCurrentModalToHistory(fromModal)` | モーダル遷移履歴を保存する。 |
| `showLearningDialog()` | `<dialog>` を表示する。 |
| `openModalEntry(entry)` | 履歴エントリーからモーダルを開く。 |
| `goBackModalHistory()` | モーダル履歴を1つ戻る。 |
| `resetModalHistory()` | モーダル履歴を初期化する。 |
| `renderLearningModal(...)` | 人物・アクション・出来事の共通モーダルを描画する。人物モーダルのお気に入り操作は `sideActions` として左アイコン下に★トグルを置き、タイトル側へ横長ボタンを追加しない。 |
| `personModalSections(person)` | 人物モーダルのセクションを作る。 |
| `actionModalSections(name, action)` | アクションモーダルのセクションを作る。 |
| `eventModalSections(item, eraName)` | 出来事モーダルのセクションを作る。 |
| `openPerson(name, options)` | 人物モーダルを開く。 |
| `openAction(name, options)` | アクションモーダルを開く。 |
| `openEventSubcategory(id, options)` | 出来事モーダルを開く。 |

### クイズ・現在地

| 関数 | 役割 |
|---|---|
| `renderQuiz()` | ミニクイズを描画する。 |
| `answerQuiz(option)` | クイズ回答を処理する。 |
| `observeEra()` | IntersectionObserverで現在地表示を更新する。 |

## `styles.css` 表示制御マップ

| セレクタ | 役割 |
|---|---|
| `.topbar`, `.now-era`, `.settings` | 固定上部バー、現在地、設定ボタン。 |
| `.era-drawer`, `.era-links` | ページ目次ドロワー。 |
| `.hero`, `.hero-copy` | トップヒーロー。 |
| `.timeline`, `.timeline::before` | 縦年表全体と左年代ライン。 |
| `.era-group`, `.era-group::after` | 大カテゴリーと大カテゴリー年代札。 |
| `.era`, `.era::after`, `.era::before` | 時代カード、時代年代札、時代アイコン。 |
| `.era-card`, `.era-head`, `.era-visual`, `.era-body` | 時代カード本体。 |
| `.fact-grid`, `.fact-card`, `.inline-detail` | くらし・できごと・大きな力のカードと詳細。 |
| `.action-subcategory-section`, `.event-subcategory-card` | 子カテゴリー一覧。 |
| `.timeline-subcategory-year-label` | 子カテゴリー年代札。JSが `.era` 直下へ生成する。 |
| `.lineage-drawer`, `.lineage-theme-links`, `.lineage-menu-section`, `.lineage-menu-section-title`, `.lineage-menu-section-items`, `.lineage-overlay`, `.lineage-panel`, `.lineage-tabs`, `.lineage-detail`, `.lineage-card`, `.lineage-flow-arrow` | 右上オプションメニューとテーマ別系譜ビュー。トップバーから開き、黒50%背景上で上部バー下15px基準のパネルとして表示する。系譜一覧と特集一覧はパネル内ではなく、トップバー右端のオプションボタンから右固定ドロワーとして開く。系譜サブメニューは左上メインメニューと同じカード状ボタン基準で表示する。系譜カードは子カテゴリーの縮小画像とタイトルだけを持ち、カード間に明示的な `→` を表示し、押すと既存の出来事/アクションモーダルを手前に開く。 |
| `.subcategory-image`, `.subcategory-image-up`, `.subcategory-image-down` | 子カテゴリー画像と上下位置。現在はinline `object-position` も併用。 |
| `.person-dialog`, `.learning-modal-card`, `.modal-*` | 共通モーダルデザイン。`.modal-icon-stack` は種類アイコンと人物モーダル用★お気に入りトグルを縦に配置し、`.modal-favorite-button` は文字ラベルを出さない小型アイコンボタンとして表示する。 |
| `.person-inline`, `.action-inline`, `.event-inline` | 本文リンクの見た目。実線下線とクリックカーソルで、補足説明用の `.term-tooltip` と区別する。 |
| `.term-tooltip`, `.term-tooltip-layer` | 非リンク重要語の太字表示とツールチップ。`.term-tooltip` は点線下線・薄い背景・helpカーソルで通常リンクと見分ける。`.term-tooltip-layer` は `position: fixed` かつ高い `z-index` で `body` 直下に置かれ、親要素の `overflow` に切られない。 |
| `.people-accordion`, `.people-grid`, `.person-*` | 人物図鑑。 |

## 画像作業ページ

### UI

| ファイル/ID | 役割 |
|---|---|
| `image-workbench.html` | 画像作業ページのDOM。 |
| `#recordList` | 画像編集対象一覧。 |
| `#editor` | 選択中レコードの編集パネル。 |
| `#currentPreview` | 本体で表示される画像プレビュー。 |
| `#nextPreview` | 直接割り当て・入力中画像プレビュー。 |
| `#imageInput` | 画像URL、相対パス、Data URLを入力する。 |
| `#categoryImageSelect` | 既存の大カテゴリー・時代・子カテゴリー画像を選択する。 |
| `#focusInput` | 子カテゴリー画像の `imageFocus`。人物・アクションでは表示不要。 |
| `#applyButton` | 選択中レコードへ挿入・入れ替え。 |
| `#applyToProjectButton` | 変更を本番データへ反映。 |
| `#backupSelect`, `#rollbackButton` | バックアップ選択とロールバック。 |

### `image-workbench.js`

| 処理 | 主な制御 |
|---|---|
| 初期データ | `historyData`, `peopleData`, `actionData`, `baseline`, `state` |
| 対象一覧生成 | `collectRecords()`、`subcategoryRecords()`、`renderList()` |
| 実表示画像判定 | `imageOf(record)`、`effectiveVisual(record)`、`originalSource(record)` |
| 既存カテゴリー画像 | `buildCategoryImageChoices()`、`matchingCategoryImageChoice()`、`applyCategoryImageChoice()` |
| プレビュー | `previewSource()`、`cacheBustPreviewSrc()`、`renderPreviewImage()` |
| 画像軽量化 | `optimizeImageFile()`、`canvasToDataUrl()`、`dataUrlBytes()` |
| 編集反映 | `applyCurrentImage()`、`deleteCurrentImage()`、`revertCurrentRecord()` |
| 変更パッチ | `buildPatch()`、`syncSelectedEditorState()` |
| 本体反映 | `applyToProject()` が `/api/apply-image-data` にPOSTする。 |
| バックアップ | `loadBackups()`、`rollbackBackup()` |

重要:

- 本番データを二重管理しない。保存時は正本 `data/*.json` と配布 `data/*.js` を更新する。
- 画像作業ページ上で「直接画像」と表示されるには、対象オブジェクト自身の `image` フィールドに保存されている必要がある。
- 人物カード・アクションカードには上下位置表示が不要。`focusInput` は子カテゴリー対象だけで扱う。

## 専用サーバー

`scripts/image-workbench-server.js` が `http://127.0.0.1:4184/` を担当する。

| 関数 | 役割 |
|---|---|
| `safePath(urlPath)` | 静的配信パスを安全に解決する。 |
| `readBody(req)` | POST本文をBufferとして受け、UTF-8で一度だけデコードする。文字化け防止の重要処理。 |
| `validatePayload(payload)` | 反映payloadの形式を検証する。 |
| `assertNoReplacementCharacters(name, data)` | `�` 混入を保存前に検出し、保存を止める。 |
| `materializeDataUrlImage(value, folder, id, stats)` | Data URL画像を `assets/` 配下へ実体化する。公開サーバーで日本語ファイル名が404になる事故を防ぐため、ファイル名は `assetFilePrefix(folder)` と画像ハッシュだけを使うASCII名に固定する。 |
| `materializeEmbeddedImages(history, people, actions)` | 各データ内の埋め込み画像をファイル化する。 |
| `writeDataSet(name, data)` | JSONとJSを同時に書き出す。 |
| `loadCurrentDataSets()` | 現在の正本データを読み込む。 |
| `handleApply(req, res)` | 画像作業ページから受け取った本番データ全体を検証し、保存前バックアップ、Data URL画像のassets実体化、JSON+JS同時書き出し、保存後照合を行う。 |
| `assertAppliedImageOperations(datasets, operations)` | 操作が実際に反映されたか保存前に検証する。 |
| `backupCurrent(kind, meta)` | 保存前バックアップを作る。 |
| `restoreBackup(relativeDir)` | バックアップから復元する。 |
| `handleApply(req, res)` | `/api/apply-image-data`。本体反映の入口。 |
| `handleRollback(req, res)` | `/api/rollback-image-data`。ロールバックの入口。 |
| `handleBackups(res)` | `/api/backups`。バックアップ一覧。 |

## 保存・反映フロー

画像作業ページで本体反映する流れ:

1. `image-workbench.js` が変更済みレコードから `operations` を作る。
2. `applyToProject()` が `/api/apply-image-data` にPOSTする。
3. `image-workbench-server.js` が `validatePayload()` を通す。
4. 現在の `data/*.json` を `loadCurrentDataSets()` で読み込む。
5. `backupCurrent()` で保存前バックアップを作る。
6. Data URL画像があれば `assets/` 配下へ実体化する。この時の保存名は `action-<hash>.webp`、`person-<hash>.webp`、`subcategory-<hash>.webp` のようなASCII名に限定する。
7. `handleApply()` が受け取った本番データ全体を `writeDataSet()` で JSON+JS に同時反映する。旧 `applyImageOperations()` は廃止済み。
8. `assertAppliedImageOperations()` で保存前に反映確認する。
9. `writeDataSet()` でJSONとJSを書き出す。
10. 画面側は教材本体を再読み込みして確認する。

## 画像保存先

| 種類 | 保存先 |
|---|---|
| 大カテゴリー/時代画像 | `assets/periods/` または既存 `assets/` 管理 |
| 子カテゴリー画像 | `assets/subcategories/` |
| 人物カード画像 | `assets/people/` |
| アクションカード画像 | `assets/actions/` |
| ヒーロー画像 | `assets/hero-history.png` |

実際の保存先は `image-workbench-server.js` の `materializeEmbeddedImages()` と対象typeに従う。公開用に、`data/*.json` と `data/*.js` 内の画像参照はASCIIパスのみを許可し、日本語ファイル名の参照を残さない。

## 検証マップ

| 変更内容 | 最低限の検証 |
|---|---|
| JSON/JSデータのみ | `./scripts/verify-static.ps1` |
| `script.js` 変更 | bundled Nodeで `--check ./script.js`、`verify-static.ps1`、必要に応じてDOM/画面確認 |
| `styles.css` 変更 | バックアップ、配信CSS確認、`DESIGN_GUARDRAILS.md` の該当画面確認 |
| 画像作業ページ変更 | `/api/apply-image-data` のpayload形式、正本JSON、配布JS、画面上の直接割り当て判定を確認 |
| 専用サーバー変更 | 保存前バックアップ、文字化け検出、JSON/JS同期、ロールバック可能性を確認 |
| 子カテゴリー年代表示 | `subcategory.yearLabel`、`data-year-label`、`.timeline-subcategory-year-label`、大カテゴリー開閉時の再同期を確認 |
| テーマ別系譜表示 | `data/lineage-themes.json` / `.js`、`menuSections`、`#lineageOpenButton`、`#lineageTabs`、`#lineageOverlay`、
ormalizeLineageThemesData()`、`loadLineageThemesData()`、`renderLineageThemeMenu()`、`renderLineageExplorer()`、`openLineageOverlay()`、`closeLineageOverlay()`、`switchLineageTheme()`、`.lineage-overlay`、`.lineage-panel`、`.lineage-menu-section-title`、`.lineage-flow-arrow`、`verify-static.ps1` の `lineageExplorerSupport` / `lineageJsMatchesJson` / `lineageThemesHaveValidOrder` / `lineageMenuSectionsHaveValidThemeIds` / `lineageRiseFallSubmenu` を確認 |

## 既知の検証制約

- この環境ではアプリ内ブラウザ接続が `CreateProcessWithLogonW failed: 267` で失敗する場合がある。同じ失敗方法を繰り返さない。
- 画面目視ができていない場合は、必ず「未実施」と報告する。
- 配信ファイル確認は `http://127.0.0.1:4184/...` に対して行う。

## 更新履歴


- 2026-07-09: 昭和時代に `満州国`、`五・一五事件`、`二・二六事件`、`東京大空襲`、`東京裁判`、`財閥解体` 子カテゴリーを追加。`警察予備隊・自衛隊の設立` を `戦後復興` の後へ移動。`租・庸・調`、`ミッドウェー海戦`、`連合艦隊`、`戦艦大和` などのアクションカードと昭和戦中・戦後人物カードを追加。当時の件数記録は子カテゴリー99、人物167、アクション109。ただし件数は更新で変動するため、固定検証期待値として扱わない。

- 2026-07-09: テーマ別系譜ビューをトップバー起動の中央オーバーレイへ変更。`#lineageOpenButton`、`#lineageTabs`、`#lineageOverlay`、`openLineageOverlay()`、`closeLineageOverlay()`、`switchLineageTheme()`、`.lineage-overlay`、`.lineage-panel`、`.lineage-flow-arrow` により、年表スクロールを邪魔せず、トップバー右端の系譜ボタンで右固定メニューを開き、テーマを選び、系譜カードから既存モーダルを手前に開く。

- 2026-07-09: 足尾鉱毒事件アクションカードを追加。アクションカード数を99件へ更新し、`公害問題` 子カテゴリー本文・actions 内の同語からカードリンクされる。

- 2026-07-09: サンフランシスコ平和条約アクションカードを追加。アクションカード数を98件へ更新し、`戦後復興` 子カテゴリー本文・actions 内の同語からカードリンクされる。

- 2026-07-09: 富岡製糸場・八幡製鉄所アクションカードを追加。アクションカード数を97件へ更新し、`明治維新` 子カテゴリー本文・actions 内の2語からカードリンクされる。

- 2026-07-09: 水俣病アクションカードを追加。アクションカード数を95件へ更新し、`公害問題` 子カテゴリー本文・actions 内の `水俣病` からカードリンクされる。

- 2026-07-09: 大カテゴリー年代表記仕様を追記。`group.westernYear` を正本とし、`～` 表記・重複なし・子カテゴリー年代包含をルール化。
- 2026-07-09: 初版作成。現行の本番ページ、画像作業ページ、専用サーバー、データ、検証の構成を記録。








- 2026-07-09: 系譜パネルを画面中央基準から上部バー下15px基準へ変更。初期状態はテーマ未選択にし、系譜ボタンで右固定メニューを開いてテーマ選択後にパネルを表示する。説明欄は縮小し、カードタイトルが見える高さを確保。フェード/スライド時間を長めにして急な表示切替を避ける。

- 2026-07-09: 系譜パネルの閉じるボタン行を絶対配置に変更し、左上の空白を削減。説明テキスト欄を `minmax(300px, 1.1fr)` 相当で広げ、下部カード列はタイトルが見える高さを維持する。

- 2026-07-09: 系譜カードの子カテゴリータイトルを `.88rem` へ縮小し、カード画像高を118pxへ圧縮。説明テキスト欄を `minmax(350px, 1.35fr)` / `min-height: 320px` に拡大して長文を読みやすくした。

- 2026-07-09: 系譜説明文を `enrichDetailLinks()` で描画し、本文中に存在する人物カード・アクションカード・出来事カードへのモーダル表示用インラインリンクを有効化。`lineageOverlay` のクリック処理で `.person-inline`、`.action-inline`、`.event-inline` を受ける。



- 2026-07-09: 括弧付きアクションカード名は、本文中の括弧なし表記も同じカードへリンクする。例: `太平洋戦争` は `太平洋戦争(第二次世界大戦)`、`第二次世界大戦` は `第二次世界大戦 (太平洋戦争含む )` へつなぐ。括弧なし別名は `actionParentheticalAliases()` で生成し、漢字接尾の `後` などに隣接してもリンク対象にする。


- 2026-07-09: 系譜パネル `.lineage-panel` に `border-radius: 16px` を追加し、人物・アクションモーダルと同系統の角丸外枠へ揃えた。


- 2026-07-09: 社会問題の系譜の説明文を、関東大震災、公害問題、阪神・淡路大震災、東日本大震災、新型コロナウイルス、少子高齢化、環境問題をたどる本文へ更新。系譜本文は既存の本文リンク生成処理で人物・アクション・出来事モーダルへ接続する。

- 2026-07-10: 各系譜テーマの subcategoryIds を本文の段落順・論旨に沿って再整理。表示対象9テーマは、天皇、武士、治水と農業、戦争、財閥と企業、政党、国づくり、仏教、社会問題の本文に出る歴史の流れを優先して子カテゴリーを並べる。旧定義の外交・くらしと産業も、非表示化された場合に備えて本文要約に沿う順番を維持する。

## 2026-07-10 未使用整理と監査
- 旧バックアップ・旧ログはルートや `data/`、`scripts/` 直下に残さず、削除前に `backups/cleanup-unused-20260710-002332/` へ退避する運用へ整理した。
- 系譜テーマは `script.js` の `lineageThemeOrder` にある9件を正規表示対象とする。メニューから外れていた旧 `diplomacy` / `industry` 定義は削除済み。
- 正本データは `data/*.json`、ブラウザ配布用は `data/*.js`。画像作業ページはこの正本を直接更新し、保存ごとに `backups/` へ退避する。
- 監査記録は `CLEANUP_AUDIT_20260710.md` に残す。削除・追加・修正時は、この構成マップと監査記録を更新する。

## 2026-07-10 治水と農業の系譜の子カテゴリー選定修正
- `script.js` の `waterAgriculture` は、本文の流れに合わせて「米づくり、むらの争い、ヤマト王権、大化の改新、律令国家、奈良時代の税、戦国大名、太閤検地、享保の改革、地租改正、戦後復興、高度経済成長」を参照する。
- 本文に対応しない `国風文化` は削除した。
- 荘園単独の子カテゴリーは現状存在しないため、無関係な文化カテゴリで代用しない。

## 2026-07-10 系譜メニューサイズ調整と儒学アクション追加
- `styles.css` の `.lineage-theme-links` と `.lineage-tab` を左上メインメニュー `.era-links a` の余白・文字サイズ・太さに合わせて縮小した。
- `data/action-cards.json` / `data/action-cards.js` に `儒学` を追加した。`ruby` は語全体読み `じゅがく` とする。
- `文化と信仰の系譜` は2026-07-11に表示対象から削除済み。`儒学` アクションカードはデータとして維持する。

## 2026-07-10 検証件数固定の解除
- `scripts/verify-static.js` のアクションカード件数固定 `109` を廃止した。アクションカードは追加・削除で変動するため、固定数ではなく存在確認と構造検証で判定する。
- `VERIFICATION_GUIDE.md` の固定件数表現を、出力値確認へ修正した。

## 2026-07-10 左メニュー開閉・人物ジャンル分類・儒学アクション
- `#menuButton` は `eraDrawer.classList.toggle("open")` で左上メニューを開閉する。開いた状態で同じ三ボタンを押すと閉じる。`aria-expanded` と `aria-label` も開閉に合わせて更新する。
- 人物図鑑の `getPersonGenre(person)` は、`data/people-data.json` の各人物 `genre` と `genreLabels` だけを参照する。`field`、`title`、`modal.profile` から分類推測しない。人物データの `description` は廃止済み。
- 人物ジャンルの宗教系ラベルは `宗教・思想`。`仏教`、`僧`、`寺`、`信仰`、`キリスト教`、`思想`、`思想家` を含む。
- `data/action-cards.json` / `data/action-cards.js` の `actionCards` 配下に `儒学` を追加した。4184配信の `data/action-cards.js` でも `儒学` と `じゅがく` が返ることを確認済み。








## 2026-07-10 ルビ辞書監査と空読み上書き防止
- `script.js` の `rubyGlossary` は、カード化されていない重要語、人物カードの旧名・別名、カード本文で出る検索参照名の読み補完に使う。
- 人物カードの正式名は `data/people-data.json` の `kana` / `rubyKana` を正とし、正式名を重複して `rubyGlossary` に追加しない。ただし `親魏倭王`、`魏志倭人伝` のような本文上の重要語、また人物の旧名・別名は固定辞書へ登録する。
- アクションカード名は `data/action-cards.json` の `reading` または `ruby.reading` を正とする。`applyStudyRuby()` ではアクションカード読みを `rubyGlossary` に統合するが、空文字の読みは必ず除外し、既存辞書の `環濠集落`、`邪馬台国` などを上書きしない。
- `scripts/verify-static.js` は `actionTermsMissingReadings`、`personRubyTermsMissingReadings`、`personAliasTermsMissingReadings`、`requiredRubyTermReadings`、`rubyGlossaryOverrideProtection`、`rubyShirabeGuard` を確認する。

## 2026-07-10 大カテゴリー・子カテゴリー画像のWebP化
- `data/history-content.json` / `data/history-content.js` の `eraImages` 16件を `assets/periods/*.png` から `assets/periods/*.webp` へ変更した。
- 同ファイル内の子カテゴリー画像48件を `assets/subcategories/*.png` / 一部 `assets/periods/*.png` 参照から `.webp` へ変更した。
- 変換はPillow WebP `quality=92`、`method=6` で実施した。PNG元ファイルは削除せず、参照だけWebPへ切り替えた。
- 変換レポート: `reports/png-to-webp-history-images-20260710-205031.json`、`reports/png-to-webp-era-images-20260710-205031.json`。
- 検証条件: `history-content` 内の `assets/periods` / `assets/subcategories` PNG参照0件、WebP欠落0件、`scripts/verify-static.ps1` が `ok: true`。


## 2026-07-11 子カテゴリー・人物件数固定の解除
- `scripts/verify-static.js` の子カテゴリー件数 `99`、人物件数 `167`、`peopleByName` 件数 `167` の固定判定を廃止した。
- 子カテゴリーと人物は教材更新で増減するため、子カテゴリー・人物は1件以上、`peopleByName` は `people` 件数と一致することを検証条件にする。
- 武士の系譜へ `守護大名` を追加するため、`data/history-content.json` / `.js` に `muromachi-shugo-daimyo` を追加し、`script.js` の `warriors.subcategoryIds` を `muromachi-bakufu` → `muromachi-shugo-daimyo` → `muromachi-onin` の順にした。

## 2026-07-11 仏教の系譜追加
- 2026-07-11: 仏教の系譜本文の `比叡山延暦寺焼き討ち` は、`inlineLinkAliases` で出来事リンクとして `sengoku-ishiyama-hieizan` 子カテゴリーへ接続する。
- `script.js` の `lineageThemeOrder` に `buddhism` を追加し、現在は国づくりの系譜の後、社会問題の系譜の前に表示する。
- `data/history-content.json` / `.js` に `heian-sohei`（僧兵の誕生）、`sengoku-ishiyama-hieizan`（石山合戦と比叡山）、`meiji-haibutsu-kishaku`（廃仏毀釈）を追加した。
- `data/action-cards.json` / `.js` に `僧兵`、`比叡山延暦寺`、`石山本願寺`、`石山合戦`、`廃仏毀釈`、`神仏分離`、`寺請制度`、`浄土真宗`、`一向一揆` を不足分として追加した。
- 系譜本文は `enrichDetailLinks()` により既存人物・アクション・出来事カードへリンクする。系譜カードは既存子カテゴリーIDを参照し、本文や画像を複製しない。


## 2026-07-11 系譜検証順序の更新
- 2026-07-11: `文化と信仰の系譜` を削除し、`lineageThemeOrder` と `scripts/verify-static.js` の期待順序から `culture` を除外した。
- `scripts/verify-static.js` の `lineageExplorerSupport` は、`script.js` 直書き順序ではなく `data/lineage-themes.json` / `.js` の同期、`order` と `themes` の整合、参照子カテゴリーIDの存在を確認する。
- 系譜テーマを追加・削除・並び替えする場合は、`data/lineage-themes.json` を正本として更新し、`data/lineage-themes.js` を同期する。`script.js` にテーマ本文・順序を直書きしない。

## 2026-07-11 石山本願寺アクション追加
- `data/action-cards.json` / `.js` に `石山本願寺` を追加した。`ruby.reading` は `いしやまほんがんじ`。
- `data/history-content.json` / `.js` の `sengoku-ishiyama-hieizan.actions` に `石山本願寺` を追加し、本文中の `石山本願寺` は既存の `enrichDetailLinks()` によりアクションモーダルへリンクされる。

## 2026-07-11 石山本願寺アクション再反映
- `data/action-cards.json` / `.js` に `石山本願寺` を再追加した。`ruby.reading` は `いしやまほんがんじ`。
- `data/history-content.json` / `.js` の `sengoku-ishiyama-hieizan.actions` に `石山本願寺` を再追加した。本文中の `石山本願寺` は既存の `enrichDetailLinks()` によりアクションモーダルへリンクされる。
- 以前の追加後、後続のデータ更新で `data/action-cards.*` と `data/history-content.*` から欠落していたため、現在の本番正本へ再反映した。



## 2026-07-13 系譜メニュー外部データ化
- 系譜メニューの正本を `data/lineage-themes.json`、ブラウザ配布用を `data/lineage-themes.js` に分離した。
- `script.js` は `window.JAPAN_HISTORY_LINEAGE_THEMES_DATA` を優先し、なければ `data/lineage-themes.json` をfetchして `lineageThemes` を作る。テーマ本文・表示順・子カテゴリーID列は `script.js` に直書きしない。
- `scripts/verify-static.js` は `lineageJsMatchesJson`、`lineageThemesHaveValidOrder`、`missingLineageIds` を検証し、JSON/JS同期と参照ID破損を検出する。

## 2026-07-13 系譜メニューのサブメニュー化
- `data/lineage-themes.json` / `.js` に `menuSections` を追加し、`栄枯盛衰の系譜` サブメニューへ `天皇の系譜`、`武士の系譜`、`財閥と企業の系譜`、`政党の系譜` を所属させた。
- `script.js` は `lineageThemeMenuSections` と `renderLineageThemeMenu()` でサブメニュー区画を描画する。テーマ本文・順序・サブメニュー構造は引き続き外部JSONを正本とする。
- `styles.css` は `.lineage-menu-section-title` / `.lineage-menu-section-items` を追加し、左上メインメニューと同じカード状・小型フォント基準で表示する。
- `scripts/verify-static.js` は `lineageMenuSectionsHaveValidThemeIds` と `lineageRiseFallSubmenu` を検証する。

## 2026-07-13 系譜メニューの栄枯盛衰サブメニュー化
- `data/lineage-themes.json` / `.js` の `menuSections` は `themeId: "riseFall"` を親ボタンにし、`栄枯盛衰の系譜` の下に `天皇の系譜`、`武士の系譜`、`財閥と企業の系譜`、`政党の系譜` を配置する。親テーマと見出しを二重表示しない。
- `国づくりの系譜` は系譜メニュー正本から削除し、`order` と `themes` の両方から `state` を除外した。
- `scripts/verify-static.js` のサブメニュー検証は `riseFallSubmenu` / `栄枯盛衰の系譜` を期待値に変更した。

## 2026-07-13 栄枯盛衰サブメニューの親ボタン化
- `data/lineage-themes.json` / `.js` の `menuSections[0].themeId` に `riseFall` を追加し、`栄枯盛衰の系譜` 自体をクリック可能な親ボタンにした。
- `script.js` の `renderLineageThemeMenu()` は `sectionByParentId` と `childThemeIds` で、親テーマを1回だけ表示し、子テーマは親の下にだけ表示する。これにより `栄枯盛衰の系譜` の重複表示を防ぐ。
- `scripts/verify-static.js` は、サブメニュー親 `themeId` が存在し、親自身が子テーマに含まれないことを検証する。

## 2026-07-13 系譜メニュー表示順の指定更新
- `data/lineage-themes.json` / `.js` の `order` を更新し、単独表示される系譜メニュー順を `栄枯盛衰の系譜` → `戦争の系譜` → `仏教の系譜` → `治水と農業の系譜` → `社会問題の系譜` にした。
- `天皇の系譜`、`武士の系譜`、`財閥と企業の系譜`、`政党の系譜` は `menuSections[0].themeIds` に残し、`栄枯盛衰の系譜` のサブメニューとしてだけ表示する。
- `scripts/verify-static.js` に `lineageVisibleOrderMatchesRequested` を追加し、サブメニュー子テーマを除外した実表示順が指定順から外れた場合に失敗するようにした。

- 2026-07-14: `戦争の系譜` の本文を幕末の開国起点へ更新し、参照子カテゴリーに `edo-kaikoku` を追加した。`scripts/verify-static.js` の `lineageExplorerSupport` も新しい冒頭文言を期待し、`lineageWarIdsExist` の必須IDに `edo-kaikoku` を含める。

## 2026-07-14 ルビ辞書・初出太字・特殊語の追加
- `script.js` の `rubyGlossary` に、遼東半島、蛤御門、琉球、桶狭間、比叡山、刀鍛冶、銅銭、絹織物、陶磁器、慈照寺、功績、壇ノ浦、外祖父、朱雀大路、足尾銅山を追加した。
- 本文初出を太字にする人物名として、藤原種継、滝沢馬琴、十返舎一九、井原西鶴、近松門左衛門、菱川師宣、大村純忠、有馬晴信、田中正造を固定読みへ追加した。
- 特殊語として、倭寇、日宋貿易、連合国軍総司令部、天正遣欧少年使節、民主主義、選挙権、盧溝橋、人形浄瑠璃、政所、侍所、問注所、踊念仏、大和絵、平等院鳳凰堂、開眼供養を固定読みへ追加した。
- `isRubyWordBoundary()` は `調べ` の `調` を単独学習語として扱わない。`scripts/verify-static.js` の `requiredRubyTerms` と `rubyShirabeGuard` で再発を検出する。

## 2026-07-14 初出太字語ツールチップ
- `script.js` に `termTooltipGlossary` と `termTooltipHtml()` を持つ。人物カード・アクションカードへのリンクにならない初出太字語は、`data/learning-terms.json` に個別 `tooltip` がある場合だけ `data-term-tooltip` 付き `<strong class="term-tooltip">` として描画する。`fallbackTermTooltip()` は廃止済みで、未登録語に定型文説明を出さない。
- `styles.css` の `.term-tooltip::before` / `.term-tooltip::after` が、ホバーまたはキーボードフォーカス時に白背景の説明ポップアップを表示する。
- `scripts/verify-static.js` の `termTooltipSupport` で、外部辞書、`fallbackTermTooltip()` 不在、`data-term-tooltip`、CSSの存在を確認する。tooltip は任意項目なので、全語必須にはしない。



## 2026-07-14 ルビ・特殊語・ツールチップ説明の外部データ化
- `script.js` 直書きだった `rubyGlossary`、`termTooltipGlossary`、追加 `Object.assign(...)` を廃止し、正本を `data/learning-terms.json`、配布用を `data/learning-terms.js` に分離した。
- 各語は `terms[語].reading` を基本に持つ。`terms[語].tooltip` は特殊語の補足説明が必要な場合だけ持つ任意項目で、ルビだけの語も同じ構造で管理する。
- `script.js` は 
ormalizeLearningTermsData()` / `loadLearningTermsData()` で外部データを読み込み、既存の `applyStudyRuby()` と `termTooltipHtml()` へ渡す。
- `scripts/verify-static.js` は `learningTermsJsMatchesJson`、`learningTermsHaveReadings`、`learningTermsHaveTooltips`、外部読み込み経路、不要tooltipが残っていないことを検証する。

## 2026-07-14 ツールチップ fallback 廃止
- `fallbackTermTooltip()` を廃止した。ツールチップ説明は `data/learning-terms.json` / `data/learning-terms.js` の `terms[語].tooltip` だけを正とする。
- `termTooltipHtml(word, innerHtml)` は、個別 `tooltip` がある語だけ `.term-tooltip` と `data-term-tooltip` を付ける。`tooltip` がない語は通常の `<strong>` で強調し、定型文ツールチップを出さない。
- 2026-07-14時点では全語tooltip補完を行ったが、2026-07-22の監査で方針を変更した。現在は特殊語だけにtooltipを残し、時代名・人物カード名・アクションカード名・一般語はルビのみまたは通常強調にする。
- `scripts/verify-static.js` は `fallbackTermTooltip()` の残存を失敗扱いにし、`learningTermsTooltipExcludedViolations` で時代名・人物カード名・アクションカード名・一般語にtooltipが残っていないことを検証する。

## 2026-07-14 大カテゴリータイトルのツールチップ無効化
- `script.js` の `applyStudyRuby(text, options)` は `options.disableTooltips === true` のとき、ルビだけを付けて `.term-tooltip` を生成しない。
- `renderEraCard()` と詳細パネルの大カテゴリー名・見出し・タグなどのタイトル領域は `headingRubyOptions = { disableTooltips: true }` を使う。大カテゴリータイトルでツールチップリンクを出さず、本文側の初出太字・ツールチップ判定も消費しない。
- 本文・詳細本文は従来通り `groupRubyBoldTerms` を渡すため、人物・アクションリンクではない重要語だけ本文内で初回強調と個別ツールチップを表示する。
- `scripts/verify-static.js` の `titleTooltipDisabled` で、`disableTooltips` 経路と大カテゴリータイトルへの適用を検証する。\n



## 2026-07-14 ツールチップ本文ルビ対応と人物ジャンル保存化
- `data/people-data.json` / `data/people-data.js` の全人物に `primaryEraId` と `genre` を保存し、`genreLabels` も同じ外部データに保存した。人物図鑑の分類は人物オブジェクトから取得し、`script.js` は分類推測を行わない。
- `script.js` の 
ormalizePersonRecord()` は `primaryEraId` と `genre` を保持するだけで、欠落時の補完は行わない。欠落や不正値は `scripts/verify-static.js` の `peoplePrimaryEraIdsMissing`、`peoplePrimaryEraIdsInvalid`、`peopleGenresMissing`、`peopleGenresInvalid` で検出する。
- `showTermTooltip()` は `layer.innerHTML = applyStudyRuby(tooltip, { disableTooltips: true })` で説明文を描画する。ツールチップ説明文内のルビは有効、入れ子ツールチップは無効。
- `scripts/verify-static.js` は `peoplePrimaryEraIdsMissing`、`peoplePrimaryEraIdsInvalid`、`peopleGenresMissing`、`peopleGenresInvalid`、`personGenreStoredOnPeople`、`termTooltipRubySupport` を検証し、保存項目の欠落、`personGenreGroups` や旧ジャンル・時代推測関数など旧推測仕様への戻りを失敗扱いにする。人物別名の読み検証は教材本文に実際に登場する別名を対象にし、本文未使用の旧名・幼名・号まではルビ必須にしない。


## 2026-07-14 不要関数と旧引継ぎ資料の整理
- 参照監査後、旧UI残存関数 `lineageEraName()`、`eventTextExcerpt()`、`jumpToLineageEvent()`、`renderPersonCard()` を `script.js` から削除した。人物一覧は `renderPersonNameButton()` / `renderPeople()` が正。
- 画像作業サーバーは直接本番データを受け取り、`validatePayload()`、`materializeEmbeddedImages()`、`assertAppliedImageOperations()`、`backupCurrent()`、`writeDataSet()` の順で保存する。旧 `applyImageOperations()` は未使用のため削除した。
- 旧引継ぎ資料 `CONTENT_JSON_HANDOFF.md`、`MODAL_REDESIGN_HANDOFF.md`、`IMAGE_WORKBENCH_SAVE_INCIDENT_20260708.md` はルートから外し、`backups/cleanup-unused-20260714-175058/removed-root-docs/` に退避した。
- 未使用候補監査は `reports/unused-code-audit-20260714T1751.json` に保存した。削除はプロジェクト全体参照が定義のみであることを確認したものに限定する。


## 2026-07-16 人物モーダルのお気に入り追加
- 人物モーダルの左アイコン下に `data-modal-favorite` の★トグルを表示する。ボタンは `toggleFavorite(name, event)` を使い、既存の人物図鑑お気に入りと同じ `localStorage.historyFavorites` に保存する。タイトル側に横長ボタンや文字ラベルを出して余白を増やさない。
- `renderLearningModal()` は `sideActions` を受け取り、人物モーダルだけが左アイコン下にお気に入り★トグルを表示する。アクションカード・出来事カードには表示しない。
- `updateModalFavoriteButton(name)` は、モーダルを開いたまま押したときに `☆/★`、`aria-pressed`、`aria-label` を更新する。★ボタンは `title="お気に入りに追加"` を持ち、マウスオーバー時にお気に入り追加の説明を出す。
- CSSは `.modal-favorite-button` で制御する。人物図鑑側の `お気に入り` フィルターは既存の `renderPeople()` をそのまま使う。






## 2026-07-16 右上オプションメニュー化
- 右上 `#lineageOpenButton` の表示を `オプション` に変更し、`#lineageTabs` の aria-label も `オプションメニュー` に変更した。`系譜` は右ドロワー内のサブメニューとして表示する。
- `data/lineage-themes.json` / `.js` に `contentMenuSections` を追加。`source: "lineageThemes"` の系譜セクションと、特集 `日本の怨霊` を同じ正本データで管理する。
- `script.js` に `contentMenuSections`、`contentMenuItemsById`、`renderContentMenu()`、`chooseContentMenuItem()`、`renderFreeContent()` を追加。系譜項目は従来の系譜カード列、特集は同じオーバーレイ内の本文表示として開く。
- `scripts/verify-static.js` は `contentMenuHasLineageSection` と `contentMenuHasExtraItems` を検証し、右上メニューが系譜専用に戻った場合や特集が欠落した場合に失敗する。




## 2026-07-16 オプションメニューと日本の怨霊関連人物
- 右ドロワーの呼称を「オプションメニュー」に統一した。
- 特集から「日本史エンタメ」と「系譜以外の特集・読み物」サブタイトルを削除し、系譜以外の特集・読み物を表示しない。
- `data/lineage-themes.json` の `japanese-vengeful-spirits.relatedPeople` に、本文に登場し人物カードが存在する `菅原道真`、`平将門`、`早良親王`、`桓武天皇` を保管する。
- `renderFreeContent()` は本文の下に関連人物リストを描画し、各ボタンは既存の `.person-inline` クリック経路で人物モーダルを開く。

## 2026-07-16 崇徳上皇人物カード追加
- `data/people-data.json` / `data/people-data.js` に `崇徳上皇` を人物カードとして追加。`kana`、`primaryEraId: "heian"`、`genre: "politics"`、`modal.profile` / `modal.whatDid` / `modal.whyImportant` を正本データで管理する。
- `data/history-content.json` / `data/history-content.js` の `heian-insei` に `崇徳上皇` を追加し、子カテゴリー本文から人物カードへ辿れる状態にした。
- `data/learning-terms.json` / `data/learning-terms.js` に `崇徳上皇` の読み `すとくじょうこう` と小学生向けツールチップ説明を追加。
- `data/lineage-themes.json` / `data/lineage-themes.js` の `日本の怨霊` 関連人物に `崇徳上皇` を追加。
- 検証は `scripts/verify-static.ps1` で `ok: true`、`failures: []` を確認済み。

## 2026-07-16 日本の怨霊関連人物表示
- `script.js` の `renderFreeContent(content)` は、特集本文を `#lineageDetail` に本文だけで描画し、`relatedPeople` は本文内へ追記しない。
- `relatedPeople` は `lineageRelatedPersonCard(person)` で `findVisualForPerson(person)` を使い、`#lineageList.lineage-related-person-list` に画像付き人物カードとして表示する。クリックは既存の `.person-inline` / `data-person-name` 経路で人物モーダルを開く。
- `styles.css` の `.lineage-related-person-card`、`.lineage-related-person-image`、`.lineage-related-person-name` が、特集下部の人物カード表示を制御する。
- `scripts/verify-static.js` の `lineageRelatedPeopleSupport` は、本文内チップではなく本文外の画像付き人物カード表示を検証する。
## 2026-07-18 公開用画像パスASCII化
- 公開URLで日本語ファイル名画像が404になる事故を防ぐため、`data/history-content.json`、`data/action-cards.json`、`data/people-data.json`、`data/lineage-themes.json` 内の画像参照をASCII名へ統一した。
- 既存画像は削除せず、ASCII名のコピーを作成して参照先だけ変更した。変換マップは `backups/ascii-image-paths-20260718142647/image-path-map.json`。
- `scripts/image-workbench-server.js` の画像実体化処理は、日本語タイトルを使わず `assetFilePrefix(folder)` と画像ハッシュで保存名を生成する。管理画面から新規保存しても日本語ファイル名を再生成しない。
- 検証条件: `scripts/verify-static.ps1` が `ok: true`、画像参照の非ASCII件数0、欠落画像0、`people-data.js` / `action-cards.js` / `lineage-themes.js` の `window.*` 変数名が本体参照名と一致。
## 2026-07-19 スマホ用タイムライン表示
- `styles.css` の `@media (max-width: 760px)` がスマホ表示を制御する。トップバーは左メニュー、現在地、オプションを1行で表示し、トップ `#top` と学び方 `#intro` は左上メニューから到達できる導線としてスマホでも表示する。年表ラインを左側固定、時代グループを色付きカード、子カテゴリーを画像付きリストへ圧縮する。スマホ時代グループの `.group-icon` はカード内に収め、`.group-copy` の左余白で見出しと重ならないよう制御する。
- スマホ用の子カテゴリー圧縮は `.event-subcategories .subcategory-head p:not(.eyebrow)`、`.event-subcategory-card .subcategory-card-body`、`.subcategory-image`、`.subcategory-description`、`.tag-row` で制御する。閉じた状態では本文プレビューを出さず、画像・時代を除いたタイトル情報を優先する。タップで `.is-description-expanded` になった時だけ、本文をカード下の全幅領域に表示し、画像もカード横幅いっぱいへ拡大する。閉じた状態のサムネイルは一覧性を優先して `object-position: center` に固定し、展開時だけ `.subcategory-image-up` / `.subcategory-image-down` の上下補正を再有効化する。
- 2026-07-21時点で、スマホ下部固定ナビは不要導線として `index.html` / `script.js` / `styles.css` から削除済み。スマホの主要操作は左上メニューと右上オプションメニューで行う。
- 検証は `scripts/verify-static.ps1`、同梱Nodeの `--check`、Chrome実表示の430px幅CDP計測で行う。左側の年代札は疑似要素の表示X座標が画面内になるよう補正する。2026-07-28の世界史同期後、スマホの最終上書きは `styles.css` 末尾の `mobile timeline/card layout consolidation` で管理し、`--mobile-line-x: 36px`、`--mobile-card-left: 58px` を基準にする。大カテゴリーの年代札 `.era-group::after` はカード横ではなく、大カテゴリー同士の上下余白に入るようスマホだけ `margin-top` と `top` を調整する。各時代カードの年代札 `.era::after` もスマホではカード横ではなく時代カード上の余白へ配置し、`.era` の `margin-top` と `.era::after top` でカード本体と重ならないよう制御する。スクリーンショットは `reports/visual-checks/mobile-timeline-20260719-era-card-year-top.png`。

## 2026-07-19 スマホ子カテゴリー本文と出来事モーダル修復
- `styles.css` のスマホ用 `.event-subcategory-card` は、子カテゴリー本文を3行プレビューに固定し、タイトル直下の余白を増やす。本文そのものは変更しない。
- 子カテゴリータイトルを開いた出来事モーダルは、スマホ幅では `.person-dialog` を画面幅内に収め、`.modal-hero-row` を縦積みにして画像を本文の上へ配置する。閉じるボタンとの干渉を避けるため、ヘッダー右側に余白を持たせる。
- `.modal-type-event .modal-section-grid` はスマホ幅で1カラムにし、本文枠の内側余白・文字サイズ・画像高さをスマホ用に抑える。人物・アクションの一体枠仕様は維持する。
- 検証は `scripts/verify-static.ps1` と、既存Chrome CDPのDOM計測で `.subcategory-description` の3行制限、横はみ出し0、出来事モーダルの画面内配置を確認する。

## 2026-07-19 スマホ子カテゴリー一覧プレビュー非表示
- `styles.css` のスマホ用 `.event-subcategory-card` は、本文プレビューと開閉ボタンを非表示にし、画像とタイトル領域だけで一覧性を優先する。
- 子カテゴリー本文データは変更しない。本文は子カテゴリーを開いたモーダル側で読む。
- 前回の3行プレビュー指定より後ろに最終上書きルールを置き、スマホ表示で再び本文が出ないようにしている。

## 2026-07-19 スマホ子カテゴリーのタップ全文展開
- スマホ幅では `.event-subcategory-card` 全体のタップで `is-description-expanded` を切り替え、本文をカード下部に全文表示する。PC幅では従来どおりタイトルから出来事モーダルを開く。
- 一覧初期状態では本文プレビューを出さず、画像・タイトル・サブタイトルだけを表示する。サブタイトルは少し下げ、文字をやや大きくして右端で折り返す。
- 展開本文は `.subcategory-description` をカード下の全幅領域に表示する。本文データは変更しない。

## 2026-07-20 スマホ展開時の子カテゴリー画像
- スマホ幅で `.event-subcategory-card.is-description-expanded` になった子カテゴリーは、画像をカード横幅いっぱいで表示し、高さはPC最大表示幅に対する200pxの比率から算出する。固定200pxにはしない。
- 展開時のみ `.subcategory-image-up` / `.subcategory-image-down` の `object-position` を `!important` で再指定し、スマホ初期表示用の中央固定ルールより優先する。上下補正量はPCの100px固定ではなく、可変画像高さの約半分に合わせて縮小・拡大する。
- 初期状態のスマホ子カテゴリーは従来どおり小さなサムネイルで一覧性を優先し、展開した時だけPC比率に近い横長画像へ切り替える。






## 2026-07-20 モバイルモーダル圧縮表示
- `styles.css` 末尾の `2026-07-20 mobile modal compact layout` が、スマホ幅 `max-width: 760px` の人物・アクション・出来事モーダルを制御する。
- 対象は `.person-dialog`、`.learning-modal-card`、`.modal-hero-row`、`.modal-title-block h2`、`.modal-visual-image img`、`.modal-section-grid`、`.modal-info-section`、`.close-modal`。PC幅のモーダルには影響させない。
- スマホではタイトルを旧スマホ指定より小さく保ちつつ、本文サイズは読みやすい大きさへ戻す。画像は閉じるボタン用の右余白を受けない全幅表示とし、`object-fit: contain` と `height: auto` で上下を切らずに表示する。閉じるボタンは小型化して右上に固定する。


## 2026-07-21 上部メニュー整理・モーダル文字・ツールチップ操作

- `index.html`: 上部の `ふりがな`、`ゆっくり`、`音` ボタンは運用対象外のため削除。上部右側は `オプション` ボタンのみを残す。
- `index.html`: スマホ用の固定下部メニュー `.mobile-bottom-nav` はトップ画面下部の不要導線として削除。
- `script.js`: 削除した3ボタンのイベント登録を削除。スマホ下部固定メニュー用の関数・呼び出しも削除し、存在しないUIの制御コードを残さない。
- `script.js`: `.term-tooltip[data-term-tooltip]` の `pointerdown` / `click` を捕捉し、親の子カテゴリー開閉・モーダルリンク処理へ伝播しないようにした。モバイル/PCとも、ツールチップ語はタップまたはEnter/Spaceで表示・非表示を切り替える。長押しで発生する `contextmenu` も通常メニューを出さず同じ切り替え処理に入る。外側タップ、Escapeで閉じる。
- `styles.css`: モーダル内部の本文・見出し・タグを子カテゴリー本文と同じ `var(--font-sans)` に統一。モバイルのモーダルタイトルは読みやすい範囲で拡大し、閉じるボタンの `×` は小さく調整。
- `styles.css`: 下部メニュー削除に伴い、モバイル `body` の下部余白を解除。ツールチップレイヤーはモーダルやカードより前面に出る `z-index: 4000` を維持する。


## 2026-07-21 スマホ上部メニュー一段化
- `styles.css` のスマホ用 `.topbar` は末尾の `mobile topbar hard single-row override` で `display:flex`、`flex-wrap: nowrap` にし、左メニュー、現在地、オプションを同じ上下位置の一段に固定する。
- `.now-era` は中央の可変幅領域で省略表示し、`.settings` は右端の必要幅だけを持つ。`index.html` のCSS読み込みバージョンも更新し、古い二段CSSを参照し続けないようにする。未使用の `ふりがな`、`ゆっくり`、`音`、スマホ下部ナビは復活させない。


## 2026-07-21 ツールチップのタップ切り替え仕様
- `script.js` の `setupTermTooltips()` は、PCのホバー可能環境で `.term-tooltip[data-term-tooltip]` の `pointerover` / `pointerout` を捕捉してロールオーバー表示する。携帯・タッチ操作では `click` を捕捉し、親の子カテゴリー開閉、モーダルリンク、背景クリックへ伝播させない。対象語をタップすると `toggleTermTooltip()` で表示・非表示を切り替える。
- 長押しで発生する `contextmenu` はブラウザ標準メニューを抑止し、同じ `toggleTermTooltip()` を実行する。キーボードでは Enter / Space で切り替え、Escapeで閉じる。
- `termTooltipHtml()` は対象語に `role="button"` と `aria-expanded` を付与する。`showTermTooltip()` / `hideTermTooltip()` が `aria-expanded` を更新し、現在開いている語を明示する。
- `styles.css` の `.term-tooltip` は点線下線・薄い背景・`cursor: help`・`touch-action: manipulation` を使い、通常リンクではなく補足説明語であることを示す。本文リンクは `.person-inline` / `.action-inline` / `.event-inline` の実線下線で区別する。

## 2026-07-21 子カテゴリー開閉をCaret専用に変更
- スマホ子カテゴリーの全文展開は `.subcategory-description-toggle` だけで行う。ボタンは `.subcategory-card-body` 直下に `.subcategory-description-toggle.disclosure-icon` として生成する。カード全体タップで `.event-subcategory-card.is-description-expanded` を切り替える処理は廃止した。
- `script.js` の `timeline.addEventListener("click", ...)` は `.subcategory-description-toggle` を検出した場合だけ開閉し、本文内の `.term-tooltip` タップは `setupTermTooltips()` が先に捕捉して親へ伝播させない。
- `styles.css` 末尾の `subcategory accordion: mobile caret button` が、スマホ子カテゴリー右上に共通 `.disclosure-icon` デザインのCaretボタンを表示する。閉じた状態は下向き、開いた状態は上向きで示す。古いグリッド移動型CSSや文字の `⌄` を使うインラインCaretは復活させない。
- 子カテゴリーのCaretボタンはスマホだけ表示し、PCでは表示しない。子カテゴリー本文、人物・アクション・出来事リンク、ツールチップ語句をタップしても子カテゴリーを閉じない。
- `era-people` アコーディオンにも `group-action disclosure-icon` を表示し、`.era-people[open] .group-action` で開状態を示す。






## 2026-07-22 PCツールチップのホバー対応とリンク視覚差分
- `script.js` の `setupTermTooltips()` に `hasHoverPointer()` と `pointerover` / `pointerout` を追加し、PCではマウスオーバー・ロールオーバーでツールチップを表示する。携帯は既存のタップ/長押し切替を維持し、親の子カテゴリー開閉へ伝播させない。
- `styles.css` は通常リンク `.person-inline` / `.action-inline` / `.event-inline` を実線下線、ツールチップ語 `.term-tooltip` を点線下線・薄い背景・helpカーソルに分け、PC/携帯の両方でリンクと補足説明の違いを視覚的に判断できるようにした。
- `index.html` の `styles.css` / `script.js` 読み込みバージョンを `20260722-tooltip-hover-link-distinction` に更新した。

## 2026-07-22 ツールチップ対象監査
- `data/learning-terms.json` / `data/learning-terms.js` から、`～時代`、人物カード名・別名、アクションカード名・別名、`武士` などの非特殊一般語の `tooltip` を削除した。`reading` はルビ用に残す。
- 削除対象の監査結果は `reports/tooltip-target-removals-20260722.csv` に保存した。今回は180件の不要tooltipを除去した。
- `scripts/verify-static.js` は旧「全語tooltip必須」検証を廃止し、`learningTermsTooltipExcludedViolations` により不要tooltipの再混入を失敗扱いにする。
- 表示方針: 人物・アクション・出来事カードがある語はリンク、特殊語だけ点線下線のツールチップ、時代名や一般語はルビまたは通常強調にとどめる。


## GitHub Actions / CORESERVER公開

| 項目 | 内容 |
|---|---|
| ワークフロー | `.github/workflows/deploy.yml` |
| 起動条件 | `main` ブランチへの push、または GitHub Actions 画面からの手動実行 `workflow_dispatch` |
| デプロイ方式 | SSH/SCP/rsync ではなく、`SamKirkland/FTP-Deploy-Action@v4.3.5` によるFTP方式。 |
| FTP接続情報 | GitHub Secrets の `CORESERVER_FTP_SERVER`、`CORESERVER_FTP_USERNAME`、`CORESERVER_FTP_PASSWORD` を使用する。ワークフロー内に接続情報を直書きしない。 |
| 公開先URL | `https://www.realemotionfactory.com/jhistory/` |
| CORESERVER公開先パス | `public_html/www.realemotionfactory.com/jhistory/` に固定する。 |
| 公開対象 | `index.html`、`script.js`、`styles.css`、`data/`、`assets/` を `public-deploy/` に一時コピーしてFTP送信する。 |
| 非公開対象 | `.github/`、`.git/`、`backups/`、`reports/`、`scripts/`、`image-workbench.*`、各種mdなどの管理・検証・作業用ファイルは `public-deploy/` に入れない。 |

運用ルール:

- CORESERVERの公開先パスは `public_html/www.realemotionfactory.com/jhistory/` から変更しない。
- SSH方式へ戻す場合は、ユーザー確認後にこの章と `.github/workflows/deploy.yml` を同時に更新する。
- FTP方式の検証は、`.github/workflows/deploy.yml` に `ssh`、`scp`、`rsync`、`appleboy`、`sftp` が残っていないこと、かつ `server-dir` が固定パスであることを確認する。
