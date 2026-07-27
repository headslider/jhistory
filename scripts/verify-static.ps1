$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$bundledNode = "C:\Users\tamak\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$node = if (Test-Path -LiteralPath $bundledNode) { $bundledNode } else { "node" }
& $node (Join-Path $PSScriptRoot "verify-static.js")
exit $LASTEXITCODE
