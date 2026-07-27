# Design Restore

このサイトの見た目を戻せるように、承認済みの `styles.css` を `design-baseline/styles.baseline.css` に保存しています。

作業前に必ず [DESIGN_GUARDRAILS.md](DESIGN_GUARDRAILS.md) を読んでください。特に、色コントラスト、重要箇所の変更許可、確認項目、基準版更新のルールは必ず守ります。

## デザインを復元する

```powershell
.\scripts\restore-design-baseline.ps1
```

実行すると、現在の `styles.css` を `design-baseline/restore-backups/` に退避してから、基準版へ戻します。

## 基準版を更新する

デザイン変更を確認して「これを今後の復元先にする」と決めたときだけ実行します。

ユーザーの承認前に基準版を更新してはいけません。

```powershell
.\scripts\save-design-baseline.ps1
```

実行すると、以前の基準版を `design-baseline/baseline-backups/` に退避してから、現在の `styles.css` を新しい基準版として保存します。

## 注意

復元対象はデザイン崩れを戻すための `styles.css` です。人物データや本文データが入っている `script.js` は復元対象に含めていません。

