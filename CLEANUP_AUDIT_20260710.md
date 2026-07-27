# Cleanup Audit 2026-07-10

## 目的
ローカルに残った不要データ、旧バックアップ、古いログ、UIから到達しないコード定義を整理し、以後の監査で同じ確認を繰り返さないように根拠を残す。

## 削除・整理したもの
- ルート直下の旧 `*.bak-*` ファイルと `.codex-http-server*.log` を削除。
- `scripts/` と `data/` 直下の旧 `*.bak-*` ファイルを削除。
- `script.js` の旧系譜テーマ `diplomacy` と `industry` を削除。
  - 現行の `lineageThemeOrder` に含まれず、系譜メニューから到達しないため。
  - 現行の正規テーマは `emperors`, `warriors`, `waterAgriculture`, `war`, `zaibatsuCompany`, `parties`, `state`, `culture`, `society` の9件。

## バックアップ
削除前に以下へ退避済み。

- `backups/cleanup-unused-20260710-002332/root-stale-files/`
- `backups/cleanup-unused-20260710-002332/subdir-stale-files/`
- `backups/cleanup-unused-20260710-002332/code-before/`

## 残したもの
- `backups/` 配下の保存バックアップ本体。
- `design-baseline/` の承認済みデザイン復元データ。
- `reports/` の検証レポート。
- `CONTENT_JSON_HANDOFF.md`, `MODAL_REDESIGN_HANDOFF.md`, `IMAGE_WORKBENCH_SAVE_INCIDENT_20260708.md` などの引継ぎ・事故記録。
- 現行正本の `data/*.json` と配布用 `data/*.js`。

## 今後の整理ルール
- 削除前に必ず `backups/cleanup-unused-YYYYMMDD-HHMMSS/` へ退避する。
- `rg` で参照がないことを確認してから削除する。
- `data/*.json` と `data/*.js` は本番正本なので、未使用に見えても静的検証なしに削除しない。
- `backups/`, `reports/`, `design-baseline/` は運用上必要な履歴領域として扱い、容量整理が必要な場合は別途ユーザー承認を取る。
- 同じ検証を繰り返さず、実施済み検証と結果をこのような監査MDに残す。

## 再検証結果
- `script.js` の構文検証を実施する。
- `scripts/verify-static.ps1` を実施する。
- HTTP経由で `index.html` と `script.js` の更新内容を確認する。

## 実施済み検証結果
- 同梱Node `C:\Users\tamak\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check script.js`: 成功。
- `scripts/verify-static.ps1`: 成功。`ok: true`、`failures: []`。
- ルート直下の旧 `*.bak-*` / `.codex-http-server*`: 残存0件。
- `data/` と `scripts/` 直下の旧 `*.bak-*`: 残存0件。
- HTTP確認 `http://127.0.0.1:4184/index.html`: `script.js?v=20260710-cleanup-unused-lineage` を参照していることを確認。
- HTTP確認 `http://127.0.0.1:4184/script.js?v=20260710-cleanup-unused-lineage`: 旧 `diplomacy` / `industry` 定義が含まれないことを確認。
- 更新ファイル `ARCHITECTURE_MAP.md`, `CLEANUP_AUDIT_20260710.md`, `script.js`, `index.html`: 制御文字混入なし。
- `git status`: UNCワークスペース上で `fatal: not a git repository` となったため、Gitではなくファイル一覧と静的検証で確認した。

## 改善余地
- ルート直下に一時 `*.bak-*` を作る運用はやめ、最初から `backups/` 配下へ保存する。
- 系譜テーマの旧定義が残らないよう、テーマ追加・削除時は `lineageThemeOrder` と実定義を同時に監査する。
- `data/*.json` と `data/*.js` は同期検証で守れているため、今後も `scripts/verify-static.ps1` を最短検証として使う。
- 大量バックアップの長期保管期限を決める場合は、事故復旧要件に関わるため別途ユーザー承認を取る。

## 2026-07-14 追加整理
- 旧引継ぎ・事故記録 `CONTENT_JSON_HANDOFF.md`、`MODAL_REDESIGN_HANDOFF.md`、`IMAGE_WORKBENCH_SAVE_INCIDENT_20260708.md` は現行コード・現行設計から参照されていないため、ルートから `backups/cleanup-unused-20260714-175058/removed-root-docs/` へ退避した。
- `reports/unused-code-audit-20260714T1751.json` で関数参照を監査し、定義以外の参照がない `lineageEraName()`、`eventTextExcerpt()`、`jumpToLineageEvent()`、`renderPersonCard()`、`applyImageOperations()` を削除した。
- 人物一覧の正規描画経路は `renderPeople()` -> `renderPersonNameButton()`。画像作業サーバーの正規保存経路は `handleApply()` -> `validatePayload()` -> `materializeEmbeddedImages()` -> `assertAppliedImageOperations()` -> `backupCurrent()` -> `writeDataSet()` -> 保存後 `assertAppliedImageOperations()`。
- 削除・退避後は `ARCHITECTURE_MAP.md` も更新し、旧関数名を現行経路に置き換えた。
