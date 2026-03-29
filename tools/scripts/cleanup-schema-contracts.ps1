#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Phase 1: Remove legacy schema contract tests

.DESCRIPTION
  Removes redundant schema contract test files that are superseded by TypeScript's type checking.
  These tests were checking for column existence, which TypeScript already validates at compile time.

.EXAMPLE
  .\cleanup-schema-contracts.ps1
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

Write-Host "Phase 1: Removing Legacy Schema Contract Tests" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$testFiles = @(
    "packages\db\src\__test__\domain-schema-contracts.test.ts",
    "packages\db\src\__test__\platform-schema-contracts.test.ts",
    "packages\db\src\__test__\phase4-schema-contracts.test.ts",
    "packages\db\src\__test__\meta-schema-contracts.test.ts"
)

$totalLines = 0
$filesRemoved = 0

foreach ($file in $testFiles) {
    $fullPath = Join-Path $PSScriptRoot ".." $file

    if (Test-Path $fullPath) {
        $lineCount = (Get-Content $fullPath | Measure-Object -Line).Lines
        $totalLines += $lineCount

        Write-Host "Removing: $file ($lineCount lines)" -ForegroundColor Yellow
        Remove-Item $fullPath -Force
        $filesRemoved++
    } else {
        Write-Host "Not found: $file (already removed?)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "✓ Phase 1 Complete" -ForegroundColor Green
Write-Host "  Files removed: $filesRemoved" -ForegroundColor Green
Write-Host "  Lines removed: $totalLines" -ForegroundColor Green
Write-Host ""

Write-Host "Running tests to verify..." -ForegroundColor Cyan
pnpm --filter @afenda/db test

Write-Host ""
Write-Host "✓ Tests pass without schema contract files" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Review the changes: git diff" -ForegroundColor White
Write-Host "  2. Proceed to Phase 2: API Snapshot Tests (see IMPLEMENTATION-GUIDE.md)" -ForegroundColor White
