param(
  [switch]$NoBackup
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$source = Join-Path $root "styles.css"
$baseline = Join-Path $root "design-baseline\styles.baseline.css"
$backupDir = Join-Path $root "design-baseline\baseline-backups"

if (-not (Test-Path -LiteralPath $source)) {
  throw "styles.css was not found: $source"
}

if ((Test-Path -LiteralPath $baseline) -and -not $NoBackup) {
  New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $backup = Join-Path $backupDir "styles.baseline.$timestamp.css"
  Copy-Item -LiteralPath $baseline -Destination $backup -Force
  Write-Host "Backed up previous baseline to $backup"
}

New-Item -ItemType Directory -Force -Path (Split-Path $baseline) | Out-Null
Copy-Item -LiteralPath $source -Destination $baseline -Force
Write-Host "Saved current styles.css as the design baseline."
