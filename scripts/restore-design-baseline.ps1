param(
  [switch]$NoBackup
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$baseline = Join-Path $root "design-baseline\styles.baseline.css"
$target = Join-Path $root "styles.css"
$backupDir = Join-Path $root "design-baseline\restore-backups"

if (-not (Test-Path -LiteralPath $baseline)) {
  throw "Baseline CSS was not found: $baseline"
}

if ((Test-Path -LiteralPath $target) -and -not $NoBackup) {
  New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $backup = Join-Path $backupDir "styles.before-restore.$timestamp.css"
  Copy-Item -LiteralPath $target -Destination $backup -Force
  Write-Host "Backed up current CSS to $backup"
}

Copy-Item -LiteralPath $baseline -Destination $target -Force
Write-Host "Restored styles.css from $baseline"
