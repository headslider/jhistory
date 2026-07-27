# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

「スクロールでわかる 日本のれきし」という日本史教材のWebページ。ビルドツールなし、`package.json`なしの静的HTML/CSS/JSサイト。データは`data/`配下のJSON(正本)とJS(ブラウザ配布用)のペアで管理し、画像編集専用の別ツール(`image-workbench.*`)と小さなNode製ローカルサーバーが付随する。

## 作業前に必ず読むもの

このリポジトリには詳細な運用ドキュメントが既に存在する。**作業前に必ず読み、記載済みの失敗パターンを繰り返さないこと。**

- [AGENTS.md](AGENTS.md) — 絶対ルール(デザイン変更の許可、コントラスト確認、フォント、ルビ禁則など)
- [ARCHITECTURE_MAP.md](ARCHITECTURE_MAP.md) — 機能・データ・CSS・APIがどのファイル/関数にあるかの正本の地図。追加・削除・修正時は**同じ作業内で必ず更新する**
- [DESIGN_GUARDRAILS.md](DESIGN_GUARDRAILS.md) — デザインルール、人物/アクションカード仕様、バックアップ手順
- [DESIGN_RESTORE.md](DESIGN_RESTORE.md) — 承認済みデザインへの復元手順
- [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) — 検証手順と過去の失敗パターン(記録済みの失敗方法を繰り返さない)

これらのドキュメントは互いにリンクし合っており、実装と矛盾した場合は実装を正としてドキュメント側を修正する。

## 絶対ルール(AGENTS.mdより抜粋)

- モーダル以外の重要なデザイン・レイアウト・データ構造・復元仕様を変更する前に、必ずユーザーの許可を取る。
- 背景色を確認せずに文字色を固定しない(特に赤文字・薄い文字・半透明文字はコントラスト確認必須)。
- 基準フォントは `Noto Sans JP`、`Noto Serif JP`、`Shippori Mincho`。
- アコーディオン等の開閉UIは文字表記でなくシェブロンアイコンで統一。
- 枠線/背景を持つコンテンツ領域は内側余白15px以上(小さな操作部品は例外)。
- `styles.css` 変更前は必ずバックアップを残す。承認済みデザインの上書きはユーザー確認後に `scripts/save-design-baseline.ps1` を実行。
- カタカナを含む語にはルビを付けない(例: `キリスト教`、`テレビ`、`ペリー`)。
- 変更後は「トップ、7つの大区切り、各時代カード、詳細アコーディオン、人物・アクションモーダル、西暦表示」を確認する。

## よく使うコマンド

Node.jsはPATHに無いことがあるため、**必ずbundled Nodeを使う**(記録済みの失敗パターン)。

```powershell
# 静的データ検証(構文・JSON/JS同期・件数・文字数・リンク整合などを一括確認)
.\scripts\verify-static.ps1

# 個別の構文チェック
& 'C:\Users\tamak\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check .\script.js
& 'C:\Users\tamak\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check .\data\history-content.js
& 'C:\Users\tamak\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check .\data\people-data.js

# 画像作業ページ専用サーバー起動 (http://127.0.0.1:4184/)
.\start-image-workbench-server.bat
```

`verify-static.ps1` の成功条件は出力に `"ok": true` と `"failures": []`。失敗した場合は `failures` を直してから先に進む(ブラウザ確認に進まない)。

検証の使い分け:
- データ(JSON/JSペア、人物・アクションカード・子カテゴリー本文・画像パス)のみの変更 → `verify-static.ps1` で十分。
- `script.js` のクリック処理・モーダル生成・アコーディオン・左メニュー・スクロール処理の変更 → 構文チェック + `verify-static.ps1` + ブラウザ確認が必要。
- `styles.css` 変更 → バックアップ + 配信CSS確認 + `DESIGN_GUARDRAILS.md` の該当画面確認。

既知の検証制約: この環境ではアプリ内ブラウザ接続が `CreateProcessWithLogonW failed: 267` で失敗する場合がある。画面目視ができていない場合は「未実施」と明記し、確認済みと偽らない。

## アーキテクチャ

### 全体構成

| 領域 | ファイル | 役割 |
|---|---|---|
| 本番ページ | `index.html` | 教材本体のHTML。`data/*.js` → `script.js` の順で読み込む |
| 本番表示ロジック | `script.js` | 年表・カード・モーダル・検索・現在地表示のすべてを制御する単一ファイル |
| 本番デザイン | `styles.css` | 本番ページのレイアウト・カード・モーダルの見た目 |
| 画像作業ページ | `image-workbench.html`/`.js`/`.css` | 画像の割り当て・削除・差し替え・本体反映・ロールバックUI(本番とは独立したツール) |
| 専用サーバー | `scripts/image-workbench-server.js` | `http://127.0.0.1:4184/` の配信、画像反映API、バックアップ、ロールバック |
| データ正本 | `data/*.json` | すべてのコンテンツデータの正本 |
| 配布用データ | `data/*.js` | ブラウザ読み込み用の `window.*` 代入ファイル。**JSONと常に同期が必要** |

### データ正本と配布データの対応

| 正本JSON | 配布JS | window変数 | 内容 |
|---|---|---|---|
| `data/history-content.json` | `.js` | `window.historyContentData` | 大カテゴリー・時代・子カテゴリー・本文・年代・人物参照 |
| `data/people-data.json` | `.js` | `window.JAPAN_HISTORY_PEOPLE_DATA` | 人物カード(表示名・ルビ・別名・モーダル本文・画像) |
| `data/action-cards.json` | `.js` | `window.JAPAN_HISTORY_ACTION_CARDS_DATA` | アクションカード(用語・summary・tags・modal本文) |
| `data/lineage-themes.json` | `.js` | `window.JAPAN_HISTORY_LINEAGE_THEMES_DATA` | 系譜メニュー(表示順・サブメニュー・参照子カテゴリーID) |

**同期ルール**: JSONを更新したら対応するJSも必ず同時更新する。`script.js` は `window.*` を優先し、存在しなければ対応するJSONをfetchするフォールバックを持つ。系譜テーマなどの本文・順序・構造は `script.js` に直書きせず、必ずこれらの外部データを正本とする。

### `script.js` の主要機能グループ

1点物の巨大ファイル。機能ごとに以下のグループに分かれる(詳細な関数一覧は [ARCHITECTURE_MAP.md](ARCHITECTURE_MAP.md) を参照):

- **データ読み込み・正規化**: `normalizeHistoryContent`、`normalizePersonRecord`、`normalizeActionCardEntry` など。旧形式データを現行形式へ変換する層。
- **ルビ・表示名・本文リンク**: `applyStudyRuby`、`enrichDetailLinks`、`isInlineLinkBoundary`。本文中の人物名・アクション語を自動でモーダルリンク化し、カタカナ語や誤リンクを境界判定で除外する。
- **年表・子カテゴリー描画**: `renderTimeline`、`renderEraCard`、`openEraDetail`。大カテゴリー→時代→子カテゴリーの階層構造。
- **人物図鑑**: `renderPeople`、`personMatches`、`getPersonGenre`。
- **モーダル**: `openPerson`/`openAction`/`openEventSubcategory` が共通の `renderLearningModal` を呼ぶ。`currentEntry`/`isCurrentModalTarget` で「今開いている項目自身へのリンク」を無効化する。
- **系譜(lineage)ビュー**: `loadLineageThemesData`、`renderLineageThemeMenu`、`renderLineageExplorer`。トップバー右端の `#lineageOpenButton` から `#lineageTabs` ドロワーを開き、テーマ選択後に `#lineageOverlay` パネルを表示する。系譜カードは既存の子カテゴリーを参照するだけで、本文・画像を複製しない。

### 保存・反映フロー(画像作業ページ)

1. `image-workbench.js` が変更を `operations` にまとめる。
2. `applyToProject()` が `/api/apply-image-data` にPOST。
3. `image-workbench-server.js` が `validatePayload()` → Data URL画像を `assets/` へ実体化 → `assertAppliedImageOperations()`(反映前照合) → `backupCurrent()`(保存前バックアップ) → `writeDataSet()`(JSON+JS同時書き出し) → `assertAppliedImageOperations()`(保存後照合)。

POST本文は必ずBufferで受けてから一度だけUTF-8デコードする(`readBody()`)。チャンク境界での文字化け(`�`)が過去に発生したため、保存前に `assertNoReplacementCharacters()` でチェックする。

### バックアップ・復元

- `backups/` — 手動変更・画像反映・ロールバック用の保存先。
- `design-baseline/` + `scripts/save-design-baseline.ps1` / `scripts/restore-design-baseline.ps1` — 承認済みデザインの保存・復元。ユーザーが「この状態を基準にする」と明示した場合だけ更新する。

## 変更時の必須フロー

1. 変更前に関連ドキュメント([AGENTS.md](AGENTS.md)、[DESIGN_GUARDRAILS.md](DESIGN_GUARDRAILS.md))を確認する。
2. データのみの変更ならJSON/JS両方を更新する。
3. `verify-static.ps1` を実行し `ok: true` を確認する。
4. UI/CSS/クリック挙動の変更なら追加でブラウザ確認を行う(未実施なら「未実施」と明記)。
5. 機能・データ構造・API・検証方法を変更した場合は [ARCHITECTURE_MAP.md](ARCHITECTURE_MAP.md) の該当箇所と更新履歴を同じ作業内で更新する。
