# 検証ガイド

このファイルは「スクロールでわかる 日本のれきし」の検証手順を記録する。データ・表示・モーダル・デザインに関わる変更後は、ここに書かれた効率的な方法を優先して使う。同じ失敗した検証方法を繰り返さない。

## 最重要ルール

- 検証中に、より効率的で再現性の高い方法、または失敗しやすい方法とその原因・解決策が分かった場合は、作業完了前にこの `VERIFICATION_GUIDE.md` を更新する。
- このガイドの記録内容と実装が矛盾した場合は、実装を確認し、ガイドを最新状態へ修正してから完了する。
- `styles.css` を変更した場合は、`DESIGN_GUARDRAILS.md` の画面確認項目も必ず確認する。
- 同じ検証失敗を繰り返してはいけない。失敗した検証は、失敗理由・原因・次に使う修正版の検証方法を記録してから再実行する。
- 検証が2回連続で同じ種類の失敗をした場合は、検証を中断し、先に実装コード・API仕様・入力形式を確認する。原因が不明なまま同じ検証を再試行しない。
- 「確認したい内容」と「実際に検証している内容」が一致しているかを、実行前に明文化する。画像作業ページでは、単なる表示画像ではなく、`data/*.json`、`data/*.js`、4184配信データ、修正画面上の直接割り当て判定が一致することを検証対象にする。
- 検証結果はレポート化し、未確認の項目を確認済みとして扱わない。画面確認が未実施の場合は、未実施と明記する。
- 機能、データ構造、CSS、保存API、検証手順を追加・削除・修正した場合は、検証完了前に [ARCHITECTURE_MAP.md](ARCHITECTURE_MAP.md) を確認し、該当箇所を更新する。構成マップが古い状態で作業完了にしない。

## 基本方針

1. まず静的検証を行う。
2. 次にDOM件数や重要UIの状態を確認する。
3. 最後にブラウザで代表表示を確認する。
4. 検証で失敗した場合は、原因がコードなのか検証方法なのかを分けて判断する。
失敗時の停止条件:

- API検証で400エラーが出た場合は、同じPOSTを再実行しない。エラーメッセージ、サーバー側の期待するpayload形式、画面側の実際の送信形式を確認してから修正版を1回だけ実行する。
- `patch.operations` が必要なAPIに、配列そのものを `patch` として送るなど、画面と異なる入力形式で検証した場合、その検証は無効とする。無効検証はレポートに残し、合格・不合格の判断材料にしない。
- 表示画像の確認だけで「直接割り当てが保存された」と判断しない。直接割り当ては、対象オブジェクトの `image` フィールドに保存され、修正画面で「直接画像」と表示されることまで確認する。

重要:

- データだけの変更で、HTML/CSS/表示ロジックを変えていない場合は、まず「静的データ検証」を完了させる。
- 静的データ検証で、JSON/JS同期、件数、文字数、参照整合、構文チェックがすべて通る場合、ブラウザ検証は必要なUI変更がある場合だけ行う。
- ブラウザ検証やサーバー起動は時間と承認が必要になるため、データ更新だけで毎回行わない。
- テーマ別系譜ビューを変更した場合は、`scripts/verify-static.ps1` の `lineageExplorerSupport`、`lineageDetailInlineLinkSupport`、`parentheticalActionAliasSupport`、`lineageWarIdsExist` を確認し、`#lineageOpenButton`、`#lineageTabs`、`#lineageOverlay`、`lineageThemes`、`openLineageOverlay()`、`closeLineageOverlay()`、`.lineage-overlay`、`.lineage-panel`、`.lineage-flow-arrow` が同時に存在することを最低条件にする。テーマ一覧は常時タブ表示せず、系譜パネル内にも置かず、トップバー右端の系譜ボタンから右固定ドロワーとして開く。初期状態では系譜テーマを選択済みにしない。系譜説明文は `enrichDetailLinks()` で描画し、`.person-inline`、`.action-inline`、`.event-inline` クリックで既存モーダルを開く。系譜パネルは上部バー下15px基準で表示し、中央 `top:50%` 前提へ戻さない。年表内の旧 `#lineage` セクションや `lineage-jump-button` は復活させない。
- 表示ロジック、CSS、クリック挙動、アコーディオン、モーダル、左メニューを変更した場合は、静的検証だけで完了しない。

## 使うNode

通常の `node --check script.js` は、環境によって `node` が見つからず失敗する。必ず bundled Node を使う。

```powershell
& 'C:\Users\tamak\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check script.js
```


## 固定検証スクリプト

2026-07-03以降、データ構造・人物カード・子カテゴリー・アクションカードの基本検証は、手入力の長いNodeスニペットではなく、次の固定スクリプトを優先する。

```powershell
.\scripts\verify-static.ps1
```

このスクリプトは bundled Node を自動で使い、次をまとめて確認する。

- `script.js`、`data/history-content.js`、`data/people-data.js`、`data/action-cards.js` の構文。
- `history-content`、`people-data`、`action-cards` のJSON/JS同期。`actionReadingRubySupport` により、アクションカードの `reading` / `ruby.reading` が本文ルビへ渡る経路も確認する。
- 人物データが `schemaVersion: 2` の1人1オブジェクト構造であること。
- アクションカードデータが `schemaVersion: 2` の1用語1オブジェクト構造であること。
- 上位 `personModalDetails` が残っていないこと。
- 各人物に `modal.profile`、`modal.whatDid`、`modal.whyImportant` があること。
- 各アクションカードに `summary`、`tags`、`modal.whatHappened`、`modal.whyImportant` があり、カード内 `description` が残っていないこと。
- 人物モーダル本文内の人物別名、アクションカード語、アクション未登録の出来事タイトルがリンク処理対象になっていること。
- アクション未登録の出来事リンク `.event-inline` が、本文中で `.action-inline` と同じリンク見た目になるCSS対象に含まれていること。
- 出来事モーダルに自動生成の「何につながった？」セクションと「出来事カード」タグが表示されないこと。
- 人物・アクション・出来事モーダル本文に、script.js側で自動生成した定型文を混ぜず、外部JSONの本文だけを表示すること。
- 人物データの `displayName`、`rubyName`、`nameQualifier`、`aliases` / `nameAliases` が表示・検索・本文リンクで扱えること。
- 大区切り・時代・子カテゴリー・画像付き子カテゴリー・人物・アクションカードの件数を出力する。件数は更新で変わるため固定値で判定しない。
- 子カテゴリーの人物参照切れ、本文未登場、重複人物、カタカナルビ混入。
- 子カテゴリー本文100〜500文字。

成功条件:

- 最後に `"ok": true` と `"failures": []` が出る。
- 失敗した場合は `failures` に出た項目を直し、ブラウザ確認へ進まない。

この検証で十分な場合:

- 人物データ、アクションカード、子カテゴリー本文、画像パス、JSON/JS同期だけを変更した場合。
- UI/CSS/クリック処理を変更していない場合。

この検証だけでは不十分な場合:

- `script.js` のクリック処理、モーダル生成、アコーディオン、左メニュー、スクロール処理を変更した場合。
- `styles.css` を変更した場合。
- その場合は固定検証スクリプトを先に通してから、ブラウザ検証を行う。

## 画像作業ページの文字化け検証

2026-07-06、`http://127.0.0.1:4184/image-workbench.html` の本体反映で、画像を含む大きなJSONをPOSTすると日本語が `�` に化ける可能性を確認した。原因は専用サーバーの `readBody()` が `body += chunk` でBufferを文字列化していたこと。UTF-8のマルチバイト文字がチャンク境界で分割されると、Nodeが置換文字 `�` を生成し、そのまま `data/*.json` と `data/*.js` に保存される。

現在の対策:

- `scripts/image-workbench-server.js` はPOST本文をBuffer配列で受け、`Buffer.concat(chunks).toString("utf8")` で一度だけデコードする。
- 保存前に `historyContent`、`peopleData`、`actionData` に置換文字 `�` が含まれていれば保存を中止する。
- `scripts/verify-static.js` は `data/history-content.*`、`data/people-data.*`、`data/action-cards.*` に置換文字 `�` が残っていないことを `replacementCharacterFiles` で確認する。

検証方法:

```powershell
.\scripts\verify-static.ps1
```

成功条件は `replacementCharacterFiles: []` かつ `ok: true`。画像作業ページで本体反映を行った後は、必ずこの検証を実行する。

## ブラウザ自動化のUNC作業フォルダ注意

2026-07-14、作業フォルダが \LS720DD35\Family\永人\日本の歴史 のUNCパスの状態で in-app browser の Node REPL 接続を試したところ、Windows sandbox の起動で `CreateProcessWithLogonW failed: 267` が発生した。同じ状態で再試行を繰り返さない。ブラウザ確認が必要な場合は、先にローカルドライブ上の作業ディレクトリまたはブラウザ接続が起動できるcwdへ切り替える。切り替えられない場合は、固定静的検証、対象関数の構文チェック、辞書・DOM生成経路のコード検査を行い、画面確認は未実施として報告する。

## 静的データ検証

データ変更のみの場合は、この順序を優先する。ブラウザを開く前に、ここでほとんどの不整合を検出できる。

### 構文チェック

```powershell
& 'C:\Users\tamak\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check .\script.js
& 'C:\Users\tamak\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check .\data\history-content.js
& 'C:\Users\tamak\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check .\data\people-data.js
```

成功条件:

- 何も出力されず終了する。
- 構文エラーが出た場合は、表示確認へ進まずデータ生成・カンマ・引用符・代入形式を直す。

### データ全体の一括検証

履歴コンテンツ、人物データ、子カテゴリー本文、人物参照、カタカナルビ混入を一度に確認する。

```powershell
@'
const fs = require('fs');
const vm = require('vm');
const history = JSON.parse(fs.readFileSync('data/history-content.json', 'utf8'));
const peopleData = JSON.parse(fs.readFileSync('data/people-data.json', 'utf8'));
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync('data/history-content.js', 'utf8'), sandbox);
vm.runInNewContext(fs.readFileSync('data/people-data.js', 'utf8'), sandbox);

const groups = history.groups || [];
const eras = groups.flatMap(group => group.eras || []);
const subcategories = eras.flatMap(era => era.subcategories || []);
const peopleNames = new Set((peopleData.people || []).map(person => person.name));
const missingPeople = [];
const peopleNotInText = [];

for (const item of subcategories) {
  for (const name of item.people || []) {
    if (!peopleNames.has(name)) missingPeople.push([item.id, name]);
    if (!String(item.text || '').includes(name)) peopleNotInText.push([item.id, item.title, name]);
  }
}

const subcategoryTextOutOfRange = subcategories
  .filter(item => String(item.text || '').length < 100 || String(item.text || '').length > 500)
  .map(item => [item.id, item.title, String(item.text || '').length]);
const peopleAreObjects = (peopleData.people || []).every(person => person && !Array.isArray(person) && person.name && person.modal);
const modalFieldsMissing = (peopleData.people || [])
  .filter(person => !person.modal || !person.modal.profile || !person.modal.whatDid || !person.modal.whyImportant)
  .map(person => person.name);
const duplicatePeople = (peopleData.people || [])
  .map(person => person.name)
  .filter((name, index, all) => all.indexOf(name) !== index);
const imageItems = subcategories.filter(item => item.image);
const imageFocusCounts = imageItems.reduce((counts, item) => {
  const key = item.imageFocus || 'center';
  counts[key] = (counts[key] || 0) + 1;
  return counts;
}, {});
const sourceFiles = [
  'script.js',
  'data/history-content.json',
  'data/history-content.js',
  'data/people-data.json',
  'data/people-data.js'
];
const katakanaRubyPattern = /<ruby>[^<]*[\u30A1-\u30FA\u30FC]/;

console.log(JSON.stringify({
  historyJsMatchesJson: JSON.stringify(sandbox.window.historyContentData) === JSON.stringify(history),
  peopleJsMatchesJson: JSON.stringify(sandbox.window.JAPAN_HISTORY_PEOPLE_DATA) === JSON.stringify(peopleData),
  groups: groups.length,
  eras: eras.length,
  subcategories: subcategories.length,
  subcategoryImages: imageItems.length,
  imageFocusCounts,
  imageFilesExist: imageItems.every(item => fs.existsSync(item.image)),
  people: (peopleData.people || []).length,
  peopleByName: Object.keys(peopleData.peopleByName || {}).length,
  missingPeople,
  peopleNotInText,
  subcategoryTextOutOfRange,
  duplicatePeople,
  katakanaRubyFiles: sourceFiles.filter(file => katakanaRubyPattern.test(fs.readFileSync(file, 'utf8'))),
  noRegionalTimeline: !JSON.stringify(history).includes('regional-timeline')
}, null, 2));
'@ | & 'C:\Users\tamak\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
```

現在の期待値:

- `historyJsMatchesJson`: `true`
- `peopleJsMatchesJson`: `true`
- `groups`: `7`
- `eras`: `16`
- `subcategories`: 出力値を確認する。更新で変わるため固定値として扱わない。
- `subcategoryImages`: 固定値にしない。画像追加・削除で変わるため、件数ではなく `imageFilesExist: true` とJSON/JS一致を確認する。
- `imageFocusCounts`: `{"down":1,"center":34,"up":11}` または同じ件数
- `imageFilesExist`: `true`
- `people`: 出力値を確認する。更新で変わるため固定値として扱わない。
- `peopleByName`: 出力値を確認する。更新で変わるため固定値として扱わない。
- `peopleAreObjects`: `true`
- `topLevelPersonModalDetails`: `false`
- `modalFieldsMissing`: `[]`
- `actionSchemaVersion`: `2`
- `actionCardsAreObjects`: `true`
- `actionModalFieldsMissing`: `[]`
- `missingInlineAliases`: `[]`
- `missingModalEventLinkSupport`: `false`
- `eventInlineStyled`: `true`
- `eventModalGeneratedContentRemoved`: `true`
- `modalBoilerplateRemoved`: `[]`
- `personDisplayNameSupport`: `true`
- `missingModalLinkFunction`: `false`
- `missingPeople`: `[]`
- `peopleNotInText`: `[]`
- `subcategoryTextOutOfRange`: `[]`
- `duplicatePeople`: `[]`
- `katakanaRubyFiles`: `[]`
- `noRegionalTimeline`: `true`

この検証で確認できること:

- JSON正本とJS配布版の同期漏れ。
- 子カテゴリーが参照する人物カードの未登録。
- 子カテゴリーの `people` にある人物名が本文に登場していない問題。
- 子カテゴリー本文の100文字以上500文字以内ルール。
- カタカナ語に静的な `<ruby>` が混入していないこと。
- 子カテゴリー画像ファイルの存在。

この検証では確認できないこと:

- 実際のクリックでモーダルが開くか。
- CSS崩れ、余白、色、アイコンの見切れ。
- アコーディオンや左メニューの開閉アニメーション。

上記を変更していないデータ追加だけなら、この静的検証を優先し、ブラウザ検証は省略してよい。


## 子カテゴリー・詳細本文の人物リンク監査

2026-07-06、人物名リンクが `3代将軍足利義満は` や `山名宗全側` のように漢字へ隣接すると、誤リンク防止の境界判定で落ちる問題を確認した。人物名はフルネーム・明示別名であれば漢字へ隣接していてもリンク対象にする。一方、`北条氏` のような集団・制度・氏族名は、`北条氏康` の一部として誤リンクしないよう境界判定を維持する。

現在の対策:

- `script.js` の `isInlineLinkBoundary(text, index, name, item)` は、`item.type === "person"` の場合は漢字隣接でもリンクを許可する。
- `scripts/verify-static.js` は `personBoundaryAllowsAdjacentKanji` と `personMentionsMissingFromSubcategoryPeople` を確認する。
- 全人物名と本文検出結果は `reports/person-link-audit.md` に書き出して確認できる。

確認ポイント:

- `足利義満`、`山名宗全`、`細川勝元` のような人物名が子カテゴリー説明本文・時代カード詳細本文でリンク対象になること。
- 子カテゴリー説明本文に人物名が出る場合、該当人物が `people` 配列にも入っていること。
- 子カテゴリー説明本文では、同じ大カテゴリーに属する子カテゴリー全体で同じ人物リンクは最初の1回だけになること。`script.js` では大カテゴリーごとに `groupPersonLinks` を共有し、`scripts/verify-static.js` では `missingGroupPersonLinkDedupSupport` が `false` であることを確認する。
- `北条氏康` の中の `北条氏` は誤リンクしないこと。

## 人物モーダル本文リンク確認

人物カードの `modal.profile`、`modal.whatDid`、`modal.whyImportant` に、別名・出来事名・アクションカード語が出る場合は、本文リンクと同じ導線でリンク化する。

確認例:

- `羽柴秀吉` は人物カード名が `豊臣秀吉` のため、別名リンクとして `豊臣秀吉` を開く。
- `長篠の戦い` はアクションカード未登録だが子カテゴリーの出来事カードに存在するため、出来事カードを開く。
- アクションカードが存在する語は、従来どおりアクションカードを優先する。

固定検証では `missingInlineAliases`、`missingModalEventLinkSupport`、`missingModalLinkFunction`、`missingModalSelfLinkSuppression`、`modalSingleFrameSupport` を確認する。同名の人物・アクション・出来事が自分自身のモーダル本文に出る場合は、リンクではなく `<strong>` 強調だけにする。ブラウザ検証が使える場合は、代表例として織田信長モーダルで `羽柴秀吉` と `長篠の戦い` がクリック可能か確認し、環濠集落など自分自身の語は戻る履歴を作らないことを確認する。

## 部分一致誤リンク確認

人物名や固有名詞の一部に、短いアクションカード語が含まれる場合は、その短い語だけをリンクしてはいけない。

確認例:

- `北条氏康` の中の `北条氏` はリンクしない。
- `北条氏の支え` の `北条氏` はリンクしてよい。
- `島津氏など` の `島津氏` はリンクしてよい。

実装では `isInlineLinkBoundary()` で前後が漢字につながる部分一致を除外する。固定検証では `protectedPartialInlineHits` が `[]`、`missingInlineBoundarySupport` が `false` であることを確認する。
## ローカルHTTPサーバー

Codexの自動ブラウザ検証では `file://` ページへの直接遷移がブロックされるため、`http://127.0.0.1:<port>/` を使う。

通常権限の `Start-Process` や `Start-Job` は、環境によってコマンド終了後にサーバーが終了し、ブラウザ側で `ERR_CONNECTION_REFUSED` になることがある。ブラウザ確認が必要なときは、理由を付けて承認付きで bundled Python のHTTPサーバーを起動する。

```powershell
$python='C:\Users\tamak\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
Start-Process -FilePath $python -ArgumentList @(
  '-m','http.server','4176',
  '--bind','127.0.0.1',
  '--directory','\\LS720DD35\Family\永人\日本の歴史'
) -WindowStyle Hidden
Start-Sleep -Seconds 1
Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:4176/' |
  Select-Object StatusCode, @{Name='Length';Expression={$_.RawContentLength}}
```

期待値:

- `StatusCode`: 200
- `Length`: 0より大きい

確認URL:

```text
http://127.0.0.1:4176/
```

## ブラウザ検証で確認すること

ページロード後、最低限以下を確認する。

- `document.documentElement.dataset.peopleDataSource` が `js` または `json` になっている
- `document.documentElement.dataset.historyContentSource` が `js` または `json` になっている
- `.era-group`: 7件
- `.era`: 16件
- `.fact-item`: 48件
- `.detail-toggle`: 48件
- `.action-subcategory-section`: 16件
- `.action-subcategory-card`: 93件
- `.event-subcategory-title`: 93件
- `.subcategory-image`: 46件
- 子カテゴリーでは世界史側の勢力タイムラインや地域タイムラインを採用しないため、`.regional-timeline` が日本史の子カテゴリー内に表示されていないこと
- `.person-name-item`: 155件
- `.era-group::after` と `.era::after` の西暦表示が空ではない
- `ひらく`、`とじる` の文字ラベルが開閉ボタンに戻っていない
- `データを読み込めませんでした` が表示されていない
- `人物データを読み込めませんでした` が表示されていない
- 左メニューの大カテゴリーリンクをクリックすると、他の `.era-group` が閉じ、指定した大カテゴリーだけが開く

デザイン変更後は、代表箇所で以下を確認する。

- トップタイトルが画像に埋もれていない
- 左メニューが縦に詰まりすぎず、リンクがスクロールできる
- 7つの大区切りカードが縦に長すぎない
- `くらし`、`できごと`、`大きな力` の開閉ボタンが右上に表示される
- 詳細アコーディオンがカード内ではなくカードの下に表示される
- 代表の詳細アコーディオンを開いた後、必要に応じて `.person-inline` または `.action-inline` が生成される
- 西暦表示が消えていない
- 人物・アクションモーダルが開く
- カタカナを含む語に `ruby` 要素が付いていない。例: `キリスト教`、`テレビ`、`インターネット`、`アメリカ`、`ペリー`、`細川ガラシャ`


## 子カテゴリー画像ロード確認

子カテゴリー画像は遅延読み込みのため、ページ読み込み直後や大カテゴリーが閉じた状態では `.subcategory-image` がDOMにあっても `naturalWidth` が `0` のままになることがある。

表示確認で画像の実ロードまで見る場合は、次の順序を使う。

1. ローカルHTTPサーバーで `http://127.0.0.1:<port>/` を開く。
2. すべての `details.era-group` を開く。
3. ページ下部まで段階的にスクロールする。
4. `.subcategory-image` の件数が46件で、全画像の `complete` が `true`、`naturalWidth` が0より大きいことを確認する。

大カテゴリーを開かずに画像ロード数だけを確認すると、遅延読み込みにより失敗に見えるため注意する。

## ルビ表示の確認

ルビ処理を変更した場合は、静的検証に加えてカタカナ語がルビ化されないことを確認する。カタカナを含む語は、難しい語でもルビではなく本文説明やカード説明で補う。

確認用の代表語:

- `キリスト教`
- `テレビ`
- `インターネット`
- `アメリカ`
- `ペリー`
- `細川ガラシャ`

実装上の基準:

- `script.js` の `ruby()` と `applyStudyRuby()` は、表示語にカタカナが含まれる場合は `<ruby>` を生成しない。
- カタカナを含まない難しい漢字語は、従来通り必要に応じてルビを付ける。

## 人物データ外部化の確認

人物カードの元データは `data/people-data.json` と `data/people-data.js` に置く。`index.html` では `data/people-data.js` を `script.js` より前に読み込む。

2026-07-03以降、人物データは管理しやすさを優先し、1人1オブジェクト構造に統合した。モーダル専用の上位 `personModalDetails` は使わず、各人物の `modal` フィールドに入れる。

基本構造:

```json
{
  "name": "織田信長",
  "kana": "おだのぶなが",
  "era": "戦国時代",
  "field": "戦国大名",
  "title": "全国統一を進めた大名",
  "icon": "⚔️",
  "modal": {
    "profile": "どんな人物？",
    "whatDid": "何をした？",
    "whyImportant": "なぜ重要？"
  }
}
```

件数確認用JavaScript:

```javascript
const fs = require('fs');
const vm = require('vm');
const data = JSON.parse(fs.readFileSync('data/people-data.json','utf8'));
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync('data/people-data.js','utf8'), sandbox);
const people = data.people || [];
console.log(JSON.stringify({
  jsMatchesJson: JSON.stringify(sandbox.window.JAPAN_HISTORY_PEOPLE_DATA) === JSON.stringify(data),
  schemaVersion: data.schemaVersion,
  people: people.length,
  peopleByName: Object.keys(data.peopleByName || {}).length,
  peopleAreObjects: people.every(person => person && !Array.isArray(person) && person.name),
  topLevelPersonModalDetails: Boolean(data.personModalDetails),
  modalFieldsMissing: people
    .filter(person => !person.modal || !person.modal.profile || !person.modal.whatDid || !person.modal.whyImportant)
    .map(person => person.name)
}, null, 2));
```

期待値:

- `jsMatchesJson`: `true`
- `schemaVersion`: `2`
- `people`: 155
- `peopleByName`: 155
- `peopleAreObjects`: `true`
- `topLevelPersonModalDetails`: `false`
- `modalFieldsMissing`: `[]`

## 履歴コンテンツデータ更新の確認

`data/history-content.json`、`data/history-content.js` を更新した場合は、表示確認の前に必ず次を確認する。

```powershell
@'
const fs = require('fs');
const vm = require('vm');
const json = JSON.parse(fs.readFileSync('data/history-content.json', 'utf8'));
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync('data/history-content.js', 'utf8'), sandbox);
const js = sandbox.window.historyContentData;
const groups = json.groups || [];
const eras = groups.flatMap(group => group.eras || []);
const subcategories = eras.flatMap(era => era.subcategories || []);
const lengths = subcategories.map(item => String(item.text || '').length);
const imageItems = subcategories.filter(item => item.image);
console.log(JSON.stringify({
  jsMatchesJson: JSON.stringify(js) === JSON.stringify(json),
  groups: groups.length,
  eras: eras.length,
  subcategories: subcategories.length,
  subcategoryImages: imageItems.length,
  imageFilesExist: imageItems.every(item => fs.existsSync(item.image)),
  minTextLength: Math.min(...lengths),
  maxTextLength: Math.max(...lengths),
  requiredFieldsReady: subcategories.every(item =>
    item.id && item.title && item.summary && item.text && Array.isArray(item.tags)
  ),
  noRegionalTimeline: !JSON.stringify(json).includes('regional-timeline')
}, null, 2));
'@ | & 'C:\Users\tamak\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
```

期待値:

- `jsMatchesJson`: `true`
- `groups`: `7`
- `eras`: `16`
- `subcategories`: 出力値を確認する。更新で変わるため固定値として扱わない。
- `subcategoryImages`: 固定値にしない。画像追加・削除で変わるため、件数ではなく `imageFilesExist: true` とJSON/JS一致を確認する。
- `imageFilesExist`: `true`
- `requiredFieldsReady`: `true`
- `noRegionalTimeline`: `true`
- `minTextLength` は100以上、`maxTextLength` は500以下にする。

注意:

- データ更新前に `data/history-content.json` と `data/history-content.js` を `backups/` 配下へ退避する。
- JSONを正本にし、JS版だけを直接編集しない。
- 子カテゴリーの `actions` と `people` は配列として保持する。不要な場合も空配列にする。
- 件数が変わる場合は、実装・左メニュー・検証期待値も変わるため、先にユーザーへ確認する。

## アコーディオン表示のクリップ確認

大カテゴリーの開くアニメーションを変更した場合は、`.group-eras` に `overflow: hidden` や `clip-path` を付けていないか確認する。

理由:

- 時代カードのアイコン `.era::before` と西暦表示 `.era::after` はカード左側に出るため、親要素でクリップすると丸アイコンや西暦が欠ける。
- 開閉アニメーションは `opacity` と `transform` を基本にし、時代カードの左側表示領域を切らない。

## 避ける方法

ここにある方法は、過去に失敗した、または今回のようなデータ更新だけでは不要だった方法である。原因と解決策を確認し、同じ検証で無駄な作業を繰り返さない。

### データ更新だけで毎回ブラウザを起動する

今回の結果:

- 実行しなかった。

原因:

- 人物カード、アクションカード、子カテゴリー本文、JSON/JS同期の追加だけなら、DOMを開かなくても静的データ検証で未登録参照、本文未登場、件数、文字数、構文を確認できる。
- ブラウザ起動はサーバー維持や承認が必要になりやすく、データだけの変更では費用対効果が低い。

解決:

- データ変更だけの場合は、先に「静的データ検証」の一括検証を実行する。
- UI、CSS、クリック挙動、アコーディオン、モーダル、左メニューを変更した場合だけブラウザ検証へ進む。

### JSONだけ、またはJSだけを確認する

今回の結果:

- JSONとJSの両方を `vm.runInNewContext` で読み込み、同期確認できた。

原因:

- このプロジェクトは `data/history-content.json` と `data/history-content.js`、`data/people-data.json` と `data/people-data.js` の二重配布になっている。
- JSONだけを確認すると、ブラウザで読まれるJS版とのズレを見落とす。

解決:

- 必ず `JSON.stringify(window.historyContentData) === JSON.stringify(json)` と `JSON.stringify(window.JAPAN_HISTORY_PEOPLE_DATA) === JSON.stringify(data)` を確認する。

### 人物名の目視確認だけで済ませる

今回の結果:

- `missingPeople` と `peopleNotInText` を機械的に検証できた。

原因:

- 子カテゴリーの `people` 配列に入っていても、本文に人物名が出ていないと本文リンクが生成されない。
- 逆に本文に人物名だけがあり、人物カードに存在しない場合もリンクできない。

解決:

- 子カテゴリーごとに `people` 配列の人物が `people-data` に存在するか確認する。
- 同じ人物名が `text` に含まれているか確認する。
- どちらかが欠けた場合は表示確認へ進まず、データを修正する。

### カタカナルビを目視だけで確認する

今回の結果:

- `Select-String` と一括検証の正規表現で、静的な `<ruby>` 混入を確認できた。

原因:

- カタカナ語は本文・人物名・タグ・アクション名に広く出るため、目視確認では漏れやすい。

解決:

- 静的検証で `/<ruby>[^<]*[\u30A1-\u30FA\u30FC]/` を確認する。
- 実装側では `script.js` の `ruby()` と `applyStudyRuby()` がカタカナを含む語をルビ化しないことを維持する。

### 自動ブラウザでの `file://` 直接確認

原因:

- Codexのブラウザ操作は安全ポリシーにより `file://` ページへの直接遷移がブロックされる。

解決:

- 自動検証では `http://127.0.0.1:<port>/` を使う。
- ユーザーが直接 `index.html` を開く確認は、手元ブラウザで行う。

### 通常権限の短命サーバー

失敗例:

- ブラウザで `ERR_CONNECTION_REFUSED` になる。

原因:

- サンドボックス環境では、通常権限で起動したバックグラウンドプロセスがコマンド終了後に維持されないことがある。

解決:

- ブラウザ確認が必要なときだけ、理由を付けて承認付きでサーバーを起動する。

### `networkidle` 待機

原因:

- このブラウザAPIでは `networkidle` がサポートされないことがある。

解決:

- `load` 待機後、必要に応じて短い待機と具体的なDOM件数確認を行う。

### `window.openPerson` 直接呼び出し

原因:

- ブラウザ検証スコープからトップレベル関数が `window` に見えない場合がある。

解決:

- 実際のUI操作と同じく、本文リンクやカードボタンをクリックして確認する。

## 効率的な検証順

### データ変更だけの場合

1. 変更前に対象データを `backups/` へ退避する。
2. `data/*.json` を正本として更新し、同じ内容で `data/*.js` を生成する。
3. bundled Node で `script.js`、`data/history-content.js`、`data/people-data.js` の構文チェックを行う。
4. 「静的データ検証」の一括検証を行う。
5. `missingPeople`、`peopleNotInText`、`modalFieldsMissing`、`actionModalFieldsMissing`、`missingInlineAliases`、`subcategoryTextOutOfRange`、`duplicatePeople`、`katakanaRubyFiles` が空であることを確認する。`missingModalEventLinkSupport`、`missingModalLinkFunction`、`missingModalSelfLinkSuppression`、`missingInlineBoundarySupport` が `false` であることを確認する。`protectedPartialInlineHits`、`modalBoilerplateRemoved` が空であることを確認する。
6. 件数が変わった場合は、この `VERIFICATION_GUIDE.md` の期待値を更新する。
7. UIやCSSを変更していなければ、ブラウザ検証は省略してよい。

### 表示・操作を変更した場合

1. 静的データ検証を先に通す。
2. ローカルHTTPサーバー起動とページ取得確認を行う。
3. ブラウザで件数確認を行う。
4. 代表の詳細アコーディオンをクリック確認する。
5. 代表の子カテゴリータイトルをクリックし、出来事カードのモーダルが開くことを確認する。
6. 左メニューの大カテゴリーリンクをクリックし、全閉じ後に指定大カテゴリーだけが開くことを確認する。
7. 代表の人物・アクションモーダルをクリック確認する。
8. デザイン変更がある場合だけスクリーンショット確認を行う。






### 2026-07-03 人物データ統合時に失敗した検証方法

今回失敗した方法:

- `node_repl` でPlaywrightを使う方法。UNC作業ディレクトリで `CreateProcessWithLogonW failed: 267` になった。
- bundled Nodeから `require("playwright")` する方法。環境内の `playwright` が `playwright-core` を解決できず失敗した。
- DOMを手作りして `script.js` 全体をVM実行する方法。`menuButton`、`window.addEventListener`、`rubyToggle` などブラウザのIDグローバルやUI要素スタブが増え続け、検証コストが高い。

結論:

- まず `scripts/verify-static.ps1` を使う。
- ブラウザ操作が必要な変更では、Playwright環境が整っているかを先に確認する。整っていない場合は、VMスタブを拡張し続けず、ブラウザ検証環境の整備を別タスクとして扱う。
- 手書きの長い検証スニペットを毎回作らない。必要になった検証は `scripts/` 配下へ固定化してから使う。

















## 画像作業ページの保存往復検証

画像作業ページ、`image-workbench.js`、`scripts/image-workbench-server.js`、本番モーダルの画像解決を変更した場合は、画像ファイルの存在確認やHTTP 200だけで完了しない。必ず次を確認する。

- 修正画面で選択・入力した画像URLが `buildPatch()` の `after.image` に入ること。
- `/api/apply-image-data` に送られた操作が `ok: true` / `operations` 1以上で保存されること。
- 保存後の `data/*.json` と `data/*.js` が同期していること。
- HTTP配信される `data/*.json` が保存後の画像URLを返すこと。
- 本番モーダルの画像解決ロジックが同じ画像URLへ解決すること。

代表的な確認方法は、対象カードを一時的に別の既存画像へ保存し、HTTP配信JSONで変化を確認してから元画像へ戻す往復テストである。テスト後は必ず `.\scripts\verify-static.ps1` を実行し、`ok: true`、`failures: []` を確認する。

注意: in-app browser 操作がUNC起動問題で失敗する場合がある。その場合、同じ失敗手順を繰り返さず、保存API往復検証とHTTP配信確認で代替する。

## 2026-07-08 子カテゴリー画像の直接割り当て検証

画像作業ページで「自動画像」と表示される子カテゴリーは、子カテゴリー自身の `image` が空で、関連アクションカードの画像をフォールバック表示している状態である。ユーザーが設定した画像を直接画像として扱う場合は、`data/history-content.json` と `data/history-content.js` の該当子カテゴリーに `image` / `imageFocus` / `imageAlt` が保存されていることを確認する。

今回の修正後の基準値:

- 子カテゴリー総数: 固定値にしない。作業中の追加・削除で変わる。
- 直接画像あり: 固定値にしない。作業中の画像追加・削除で変わる。
- 関連アクション画像フォールバック: 意図しない残存がないことを監査レポートで確認する。
- 画像なし: 固定値にしない。未設定項目は作業進行に応じて変わる。

検証では、画像が見えるかだけではなく、修正画面の一覧で `直接画像` と表示されること、また `reports/image-workbench-source-audit-20260708.json` の `summary.actionFallbackWithoutDirect` が意図しない値になっていないことを確認する。画像作業ページの表示確認後に `.\scripts\verify-static.ps1` を実行し、`ok: true` / `failures: []` を確認する。





## 2026-07-08 子カテゴリー画像 up/down が本番カードで効かない問題

### 原因
`data/history-content.json` と `data/history-content.js` には `imageFocus: "up" / "down"` が保存され、`script.js` でも `subcategory-image-up` / `subcategory-image-down` クラスを付与していた。しかし本番表示はCSSクラス依存のみで、実表示側で上下が効かない状態をユーザーが確認した。保存経路ではなく、本番子カテゴリー画像HTMLの位置指定が弱いことが問題だった。

### 修正
`script.js` の子カテゴリー画像生成で、既存クラスに加えて `imageFocus` 由来のインライン `object-position` を出力するようにした。

- `up`: `object-position:50% calc(50% + 100px)`
- `down`: `object-position:50% calc(50% - 100px)`
- `center`: `object-position:50% 50%`

モーダル画像は従来どおり上下を無視する。今回の修正対象は本番の子カテゴリーカード画像だけ。

### 検証ルール
この問題では、JSON/JS同期や保存APIだけを確認して完了扱いにしてはいけない。必ず次を確認する。

1. `data/history-content.json` の該当子カテゴリーに `imageFocus` が保存されている。
2. `data/history-content.js` とJSONが一致している。
3. 4184で配信される `script.js` に `object-position:50% calc(...)` が含まれる。
4. `script.js` の子カテゴリー画像生成HTMLに、`subcategory-image-up/down` クラスとインライン `object-position` の両方が出る。
5. `scripts/verify-static.ps1` が `ok: true` / `failures: []` で通る。

同じ検証を繰り返さず、レポート `reports/subcategory-production-focus-html-audit-20260708.json` を確認する。

## 2026-07-08 子カテゴリー画像 imageFocus だけ変更しても本番に反映されない問題

### 現象
本番の子カテゴリー画像で `up` / `down` を保存して強制キャッシュクリアしても画像位置が変わらなかった。添付例の `大日本帝国憲法` を確認したところ、本番 `data/history-content.json` 上の `imageFocus` は `center` のままだった。

### 原因
保存APIは `imageFocus` を保存できるが、管理画面 `image-workbench.js` 側で画像URLが同じまま `focusInput` だけ変更した場合、対象レコードへ即時反映されない経路があった。特に別項目へ移動する際の未確定変更チェックが `image` の差分だけを見ており、`imageFocus` と `imageAlt` の差分を見ていなかった。

### 修正
`image-workbench.js` を修正し、以下を保証した。

- 一覧で別項目へ移動する前に、画像URLだけでなく `imageFocus` / `imageAlt` の差分も検出して `commitImageInput()` する。
- `focusInput` の変更時に、直接画像がある項目なら即座に対象レコードへ `imageFocus` を反映し、`buildPatch()` を更新する。
- 管理画面の4184配信でも `focusInput.addEventListener("change")` と `!== focusOf(current)` が含まれることを確認した。

### 検証
`大日本帝国憲法` を対象に、管理画面と同じ `/api/apply-image-data` 形式で `center -> up -> center` の往復保存を実施した。

- 一時変更後、`data/history-content.json` は `up` になった。
- 4184配信の `data/history-content.js` も `up` を含んだ。
- 復元後、`center` に戻った。
- レポート: `reports/image-focus-save-roundtrip-meiji-constitution-20260708.json`
- 最終 `scripts/verify-static.ps1`: `ok: true`, `failures: []`

### 今後の厳守事項
子カテゴリー画像の上下問題では、キャッシュやCSSを疑う前に、対象子カテゴリーの `data/history-content.json` と `data/history-content.js` の `imageFocus` が実際に希望値へ変わっているかを確認する。管理画面で「変更 0件」のままなら本体反映しても本番データは変わらない。

## 画像作業ページの focus 保存検証

2026-07-08、保存API自体は正常でも、管理画面で見えている `focusInput` の値が `patch.operations` に確実に入っているかを別に確認する必要があると分かった。特に、同じ画像URLのまま `up/down` だけ変更したケースを含めること。

確認順序:

1. 4184配信の `image-workbench.js` に `syncSelectedEditorState`、`const selected = syncSelectedEditorState()`、`focusObjectPosition` が含まれることを確認する。
2. `data/history-content.json` または対象JSONで、保存対象の `imageFocus` の現在値を確認する。
3. `/api/apply-image-data` 形式で `center -> up -> center` の往復検証を1件だけ行い、ディスク上のJSONが更新されることを確認する。
4. `scripts/verify-static.ps1` を実行し、`ok: true` を確認する。

禁止事項:

- 管理画面プレビューが動かない状態で、保存完了と判断しない。
- 同じ往復検証を複数項目で繰り返さない。1件で保存APIの健全性を確認したら、以降は対象データと配信JSの確認へ切り替える。

## 2026-07-08 画像作業ページを本番データ直接編集へ変更した後の検証ルール

### 設計原則
- 管理画面の編集対象は常に本番データ相当の `historyData` / `peopleData` / `actionData` だけとする。
- 差分表示のために保持してよいのは、`image` / `imageFocus` / `imageAlt` の基準スナップショットだけである。
- 本番データ全体の複製を別に持って比較する設計へ戻さない。

### 保存時に必ず確認すること
1. `/api/apply-image-data` 実行で `ok: true` が返る。
2. 返却 `backupDir` が新しく作成され、`backups/.../manifest.json` に `kind: "apply"` が入る。
3. 対象の `data/*.json` が保存内容へ変わっている。
4. 対象の `data/*.js` も同じ内容へ同期している。
5. `scripts/verify-static.ps1` が `ok: true` / `failures: []` で終わる。

### ロールバック時に必ず確認すること
1. `/api/rollback-image-data` 実行で `ok: true` が返る。
2. `rollbackBackupDir` が新しく作成され、`manifest.json` に `kind: "rollback-before-restore"` が入る。
3. 復元対象の `data/*.json` が保存前の値へ戻る。
4. `data/*.js` も同じ値へ戻る。
5. `scripts/verify-static.ps1` が再度 `ok: true` で終わる。

### 今回の厳格検証で実施した代表ケース
- アクションカード `豪族`: `imageFocus center -> up -> center`
- 子カテゴリー `meiji-constitution`: `imageFocus center -> down -> center`

どちらも、保存後に本番 `data/*.json` / `data/*.js` が更新され、ロールバック後に元へ戻ることを確認済み。

### 禁止事項
- `node` で `.ps1` を実行しない。PowerShellスクリプトは PowerShell で実行する。
- 同じ往復保存検証を複数項目で無駄に繰り返さない。保存APIの健全性確認は代表1〜2件で十分。
- 「管理画面で見えた」「HTTP 200 が返った」だけで完了扱いにしない。必ずディスク上の `data/*.json` / `data/*.js` とバックアップを確認する。

## 2026-07-08 子カテゴリー画像位置検証での禁止事項追加

現象: ユーザーが Ctrl+Shift+R などでキャッシュを解放済みでも、管理画面で保存した子カテゴリー画像の上下位置が本番表示に反映されない事例が発生した。この問題でキャッシュを主因として扱わない。

確認順序:

1. 対象子カテゴリーの `data/history-content.json` と `data/history-content.js` の `imageFocus` を確認する。
2. 4184 の `/data/history-content.json` が同じ `imageFocus` を返すか確認する。
3. `/api/apply-image-data` の保存後照合が有効なサーバーで保存し、保存後にAPIが `ok: true` を返すことを確認する。
4. 本番表示側で `subcategory-image` の `object-position` が `imageFocus` 由来で出力されることを確認する。

禁止事項:

- キャッシュクリア済みとユーザーが明言している場合に、キャッシュを原因として再提案しない。
- 本番データの `imageFocus` を確認せずに、表示側だけを原因と断定しない。
- アプリ内ブラウザ検証で `node_repl kernel exited unexpectedly` / `CreateProcessWithLogonW failed: 267` が出た場合、同じ手順を繰り返さない。この場合は未検証として明記し、HTTP配信データ・JSON/JS整合・本番コード生成経路の確認に切り替える。
- 管理画面で「保存できたように見える」だけで検証完了としない。保存API、ディスク上のJSON/JS、HTTP配信データを必ず照合する。

今回追加した防止策:

- `scripts/image-workbench-server.js` の `/api/apply-image-data` は、保存後に操作対象を再照合し、`image` / `imageFocus` / `imageAlt` が本番データへ残っていなければ `ok: false` を返す。
- 埋め込みData URLは保存時に `assets/...` へ実体化されるため、画像URLはData URL完全一致ではなく `assets/` 化を許容して照合する。ただし `imageFocus` と `imageAlt` は厳密一致とする。

## 2026-07-08 画像作業ページの本番データ直接保存ルール

### 原因

画像作業ページは管理画面上で `historyData` / `peopleData` / `actionData` を直接編集する設計へ変更したが、保存サーバー側の `/api/apply-image-data` はまだ `patch.operations` だけを本番データへ適用していた。そのため、管理画面上のデータが正しく変わっていても、patch生成・差分検出・選択中項目の同期に漏れがあると、本番 `data/*.json` / `data/*.js` へ保存されない可能性が残っていた。

### 修正

`scripts/image-workbench-server.js` は、送信された `historyContent` / `peopleData` / `actionData` を本番データの正とし、これを検証・バックアップ後にそのまま保存する。`patch.operations` は保存対象そのものではなく、変更件数表示・照合・記録の補助として扱う。

保存APIは以下を保証する。

- `patch.operations` が空でも、送信された本番データ本体に変更があれば `data/*.json` / `data/*.js` へ保存される。
- `patch.operations` がある場合は、保存前後で `image` / `imageFocus` / `imageAlt` を照合する。
- Data URL画像は保存時に `assets/...` へ実体化されるため、画像URLの照合は `assets/` 化を許容する。ただし `imageFocus` と `imageAlt` は厳密一致とする。
- 保存前に必ずバックアップを作成する。

### 検証

`meiji-constitution` を対象に、`patch.operations: []` のまま送信データ本体だけを `center -> up -> center` に変更する往復検証を行った。

確認結果:

- `patchlessSaveOk: true`
- `patchlessOperations: 0`
- `diskFocusAfterPatchless: up`
- `httpFocusAfterPatchless: up`
- `restoreOk: true`
- `restoredFocus: center`

この検証により、管理画面側のpatch生成漏れがあっても、送信された本番データ本体が保存されることを確認した。

### 禁止事項

- 本番データ直接編集設計に戻した後、保存サーバーを `patch.operations` だけに依存する方式へ戻さない。
- `patch.operations` が0件であることだけを理由に、送信済みの本番データ本体を破棄しない。
- 画像位置問題の検証では、必ず `data/history-content.json`、`data/history-content.js`、4184配信JSONの3点で対象 `imageFocus` を確認する。

## 2026-07-08 画像作業ページの本体反映ボタン送信前中断問題

### 原因

保存サーバーを本番データ直接保存方式へ変更しても、管理画面 `image-workbench.js` の `applyToProject()` が `patch.operations.length === 0` かつ埋め込み画像0件の場合に、API送信前に `return` していた。このため、管理画面の `historyData` / `peopleData` / `actionData` 本体に変更が入っていても、patch生成に漏れがあるとサーバーへ届かず、本番データは変わらなかった。

### 修正

`applyToProject()` から `patch.operations` 0件時の送信前中断を削除した。今後は `patch.operations` が0件でも、現在の本番データ本体を `/api/apply-image-data` へ送信する。保存サーバー側は送信されたデータ本体を正として保存する。

### 検証

4184配信の `image-workbench.js` で以下を確認した。

- 古い文言 `反映する変更はありません` が含まれない。
- 新しい文言 `本番データを再保存しています` が含まれる。
- `historyContent: historyData` を送信している。
- `scripts/verify-static.ps1` が `ok: true`。

### 禁止事項

- 本番データ直接保存方式では、`patch.operations` が0件という理由だけでAPI送信を止めない。
- 画像位置・画像URL・代替テキストの保存不具合では、サーバー側だけでなく、クライアント側がAPI送信前に中断していないか確認する。

## 2026-07-08 既存直接画像の位置だけ変更が保存されない問題

### 原因

`image-workbench.js` の `syncSelectedEditorState()` は、画像URL入力欄が空の場合に即returnしていた。そのため、対象レコードに既に直接画像 `image` が保存されていても、入力欄状態によっては `imageFocus` だけの変更が `record.target` へ同期されない経路が残っていた。

### 修正

`syncSelectedEditorState()` は、画像URL入力欄が空でも既存の直接画像 `imageOf(record)` がある場合は、`imageFocus` と `imageAlt` を同期するようにした。`focusInput` の change イベントも、入力欄が空でも既存直接画像があれば処理を続ける。

### 検証

4184配信の `image-workbench.js` で以下を確認した。

- `const existingImage = imageOf(record)` が含まれる。
- 古い `if (!record || !els.imageInput.value.trim()) return` が含まれない。
- `本番データを再保存しています` が含まれる。
- `image-workbench.html` は `image-workbench.js?v=20260708-focus-sync-existing-image` を参照している。
- `scripts/verify-static.ps1` が `ok: true`。

### 禁止事項

- 画像URLの差分だけで保存可否を判断しない。`imageFocus` と `imageAlt` だけの変更も保存対象とする。
- 「既存画像がある項目の位置だけ変更」の検証を省略しない。







### 2026-07-09 系譜パネル表示検証の注意

- In-app Browser の Node REPL 接続は、このUNC環境で `CreateProcessWithLogonW failed: 267` により失敗することがある。この失敗後に同じ in-app browser 接続を繰り返さない。
- bundled Node の `require("playwright")` は、現環境では `playwright-core` 欠落で失敗する。Playwright実画面検証として使わない。
- 系譜パネルのUI変更では、まず `verify-static.ps1`、次に 4184 配信中の `index.html` / `styles.css` / `script.js` の内容照合で、キャッシュバスター、初期未選択、上部バー下15px配置、説明文縮小、フェード時間を確認する。実ブラウザ目視が必要な場合は、ユーザー画面での確認結果を別途反映する。




## 2026-07-10 人物フィルターと左メニューDOM検証の注意

左メニューの開閉処理を変更した場合は、`#menuButton` を2回クリックし、1回目で `#eraDrawer.open === true` / `aria-expanded="true"`、2回目で `open === false` / `aria-expanded="false"` になることを確認する。

人物フィルター検証では、フィルタークリック後に `renderPeopleFilters()` がボタンを再描画するため、クリック前に取得した別フィルターボタン参照を使い回さない。必ずフィルター切り替えごとにDOMからボタンを再取得する。古い参照をクリックすると検証が無効になる。

代表確認:
- `宗教・思想` フィルターに `法然` が表示される。
- `武士・戦い` フィルターに `法然` が表示されない。
### 2026-07-10 系譜メニューのルビ崩れ確認

- UNC作業フォルダ上では、in-app browser 用 `node_repl` が `CreateProcessWithLogonW failed: 267` で起動失敗する場合がある。この失敗が出たら同じ接続を繰り返さない。
- bundled Node の `playwright` は `playwright-core` 欠落で失敗する場合がある。この場合も同じ手順を繰り返さない。
- 系譜メニューのCSS修正確認は、まず `Invoke-WebRequest http://127.0.0.1:4184/index.html` で `styles.css?v=...` の最新値を確認し、続けて配信CSSに `.lineage-tab rt { display: none; }` が含まれることを確認する。
- 実画面確認が必要な場合は、ユーザーの開いている画面で再読み込み後に右上の「系譜」メニューを開き、武士の系譜だけ高さが増えないことを確認する。





## 2026-07-10 ルビ辞書・カード名監査

ルビ辞書へ追加する基準:

- 人物カードの正式名は `people-data.json` の `kana` / `rubyKana` を正とする。
- 人物カードの別名・旧名・検索参照名で、漢字のみの語は `rubyGlossary` に登録する。ただし `北条早雲（後北条氏）` のような「本人名＋括弧補足」は、括弧を除いた本人名の読みで足りるため重複登録しない。
- アクションカード名は `action-cards.json` の `reading` / `ruby.reading` を正とする。
- アクションカードの読みが空の場合、`rubyGlossary` の既存読みを上書きしてはいけない。`applyStudyRuby()` では `.filter(([, reading]) => Boolean(reading))` を必須にする。
- カタカナを含む語は、プロジェクト規則によりルビ対象外。

必須検証:

```powershell
.\scripts\verify-static.ps1
```

成功条件:

- `ok: true`
- `rubyGlossaryOverrideProtection: true`
- `actionTermsMissingReadings: []`
- `personRubyTermsMissingReadings: []`
- `personAliasTermsMissingReadings: []`
- `requiredRubyTermReadings: []`

代表語の直接確認では、少なくとも `環濠集落: かんごうしゅうらく`、`邪馬台国: やまたいこく`、`親魏倭王: しんぎわおう`、`魏志倭人伝: ぎしわじんでん` を確認する。


### 人物ジャンルとツールチップ本文ルビ

人物カードまたはツールチップ描画を変更した場合は、`scripts/verify-static.ps1` / `scripts/verify-static.js` で次を確認する。

- `peoplePrimaryEraIdsMissing` と `peoplePrimaryEraIdsInvalid` が空。
- `peopleGenresMissing` と `peopleGenresInvalid` が空。
- `primaryEraIdStoredOnPeople: true`、`personGenreStoredOnPeople: true`。
- `termTooltipSupport: true`、`termTooltipRubySupport: true`。

この検証が通る場合、人物ジャンルは `data/people-data.json` の各人物オブジェクトに保存され、ツールチップ本文は `applyStudyRuby(tooltip, { disableTooltips: true })` 経由でルビ対応されている。

## 2026-07-16 4184配信元確認の注意

`http://127.0.0.1:4184/` は、その時点で別教材や別サーバーが配信されている場合がある。日本史側のUI変更を確認する前に、配信 `index.html` が日本史フォルダの最新版であることを、キャッシュバスターや期待する識別子で確認する。期待する `script.js?v=...` / `styles.css?v=...` が返らない場合は、4184の結果を日本史の検証結果として扱わない。必要な場合は、日本史フォルダを一時ポートで配信し、確認後にサーバーを停止する。

## ブラウザ確認で使えない手順: bundled Node の `require("playwright")`

2026-07-16、`C:\Users\tamak\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules` を `NODE_PATH` に入れて `require("playwright")` からヘッドレス確認を試したが、`Cannot find module 'playwright-core'` で失敗した。この環境ではこの方法を画面確認の手段として繰り返さない。

代替方針:

- まず `scripts/verify-static.ps1` と対象コードの追加静的検証を行う。
- in-app browser 接続はUNC作業フォルダ起因の `CreateProcessWithLogonW failed: 267` が発生するため、同じ状態で再試行しない。
- 実画面確認が必要な場合は、ユーザーの開いている画面で確認してもらうか、ブラウザ接続が起動できるローカル作業ディレクトリへ切り替えられる状態を作ってから行う。

## 追加コンテンツの関連人物表示検証

2026-07-16以降、`日本の怨霊` などの追加コンテンツで使う `relatedPeople` は、説明本文 `#lineageDetail` の中に追記しない。本文の下にある `#lineageList` へ `.lineage-related-person-list` と `.lineage-related-person-card` で画像付き人物カードとして表示する。検証では `scripts/verify-static.ps1` の `lineageRelatedPeopleSupport` が、`lineageRelatedPersonCard(person)`、`findVisualForPerson(person)`、`.lineage-related-person-card`、`.lineage-related-person-image` を確認する。

## 2026-07-19 スマホ子カテゴリー展開UIの検証注意

スマホ子カテゴリー本文の展開確認では、Chrome CDP の `Runtime.evaluate` によるDOM計測を優先する。確認項目は、`.subcategory-description-toggle` の `aria-expanded`、カードの `is-description-expanded`、本文の `clientHeight` / `scrollHeight`、横はみ出し0、スマホ画像 `object-position: 50% 50%` とする。

同日の検証で、既存Chromeタブに対する `Page.captureScreenshot` はタイムアウトし、スクリーンショットファイルが作成されなかった。この方法を同じ条件で繰り返さない。視覚記録が必要な場合は、先にDOM検証を完了し、別プロセスのChrome headless `--screenshot` またはブラウザ操作ツールで実施する。

## 2026-07-21 スマホ子カテゴリー開閉とツールチップ競合防止

スマホ子カテゴリー本文の展開は、右上の `.subcategory-description-toggle` だけで行う。共通 `.disclosure-icon::before` を実表示に使う。カード全体タップで `.event-subcategory-card` を開閉する処理を戻してはいけない。本文内の `.term-tooltip`、`.person-inline`、`.action-inline`、`.event-inline` はそれぞれのリンク/ツールチップ操作を優先し、子カテゴリー開閉へ伝播させない。

静的確認の最低条件:

- `script.js` に `const mobileSubcategoryCard = event.target.closest(".event-subcategory-card")` が残っていない。
- 子カテゴリー開閉ボタンに `subcategory-description-toggle disclosure-icon` がある。文字の `⌄` や `.subcategory-caret-mark` は使わない。
- `styles.css` に `subcategory accordion: mobile caret button` があり、スマホだけ `.subcategory-description-toggle` を `display: grid !important` で表示している。
- `scripts/verify-static.ps1` が `ok: true` / `failures: []` で終わる。



## 2026-07-21 スマホの時代詳細パネル配置

`くらし`、`できごと`、`大きな力` の詳細は、PCでは従来通り `.fact-grid` 末尾へ `.inline-detail` を追加する。スマホ幅 `max-width: 760px` では、押した `.fact-item` の直後へ `item.after(panel)` で差し込む。検証では `script.js` に `window.matchMedia("(max-width: 760px)").matches`、`item.after(panel)`、`item.parentElement.appendChild(panel)` の3つが同時に存在することを確認する。CSSだけで順序を変えようとしてカード本文や子カテゴリー本文を変更しない。

## GitHub Actions / FTP公開設定の検証

GitHub Actions の公開方式を変更した場合は、ブラウザ表示検証の前にワークフロー設定を静的に確認する。デプロイ方式の確認にPlaywrightは使わない。

確認対象:

- `.github/workflows/deploy.yml` が存在すること。
- `SamKirkland/FTP-Deploy-Action@v4.3.5` を使っていること。
- `server-dir: public_html/www.realemotionfactory.com/jhistory/` が固定されていること。
- `ssh`、`scp`、`rsync`、`appleboy`、`sftp` などSSH方式の記述がワークフローに残っていないこと。
- 公開対象は `public-deploy/` にコピーした `index.html`、`script.js`、`styles.css`、`data/`、`assets/` に限定され、画像作業ページ、バックアップ、レポート、管理スクリプトをFTP送信しないこと。

推奨確認:

```powershell
rg -n "ssh|scp|rsync|appleboy|sftp" .\.github\workflows
rg -n "SamKirkland/FTP-Deploy-Action|server-dir: public_html/www.realemotionfactory.com/jhistory/" .\.github\workflows\deploy.yml
```

成功条件:

- 1つ目の検索でSSH方式の実行記述が出ない。
- 2つ目の検索でFTP Actionと固定公開先パスが出る。

## CDPでのスマホ表示検証

2026-07-28、Chrome DevTools Protocolでスマホ幅の表示状態を検証する際、`Page.navigate` 後にすぐ `Runtime.evaluate` すると、`Page` / `Runtime` ドメインが有効化されていないため結果が `null` になり、無効な検証になることを確認した。同じ方法を繰り返さない。

正しい手順:

1. `Page.enable` と `Runtime.enable` を先に送る。
2. `Emulation.setDeviceMetricsOverride` で対象のスマホ幅を設定する。
3. `Page.navigate` 後、`Page.loadEventFired` を待つ。
4. `Runtime.evaluate` で `getComputedStyle()` と `getBoundingClientRect()` を確認する。

トップと学び方のスマホ表示を確認する場合は、`#top` が `display: grid`、`#intro` が `display: block`、どちらも高さと表示テキストを持つことを確認する。
- 2026-07-28、PowerShellだけでCDP WebSocketを直接扱うスマホ幅一括計測はタイムアウトしやすかった。`Page.loadEventFired` やWebSocket受信待ちで止まる場合があるため、同じ長いCDPスクリプトを繰り返さない。携帯レイアウト確認では、まず `styles.css` の最終上書き順、`scripts/verify-static.ps1`、Chrome headlessの幅別スクリーンショット生成を使い、必要な場合だけ短いCDP計測に分ける。
## Chrome CDPで携帯DOMを確認するときの注意

2026-07-28、携帯幅のDOM確認で `http://127.0.0.1:<port>/json/version` の `webSocketDebuggerUrl` に接続すると、ブラウザ全体のターゲットになり `Page.enable` が存在しない失敗を確認した。この失敗は画面検証として扱わない。CDPでページを検証する場合は、Chromeを対象URL付きで起動し、`/json/list` から `type: "page"` の `webSocketDebuggerUrl` を選んで接続する。

同じ検証内でPowerShellのダブルクォート文字列にJavaScriptのバッククォートを直接入れると、ブラウザへ渡す式が壊れ、Node側で `document is not defined` になる失敗を確認した。CDP検証スクリプトはシングルクォートのhere-stringで作成し、URLだけをプレースホルダー置換する。
