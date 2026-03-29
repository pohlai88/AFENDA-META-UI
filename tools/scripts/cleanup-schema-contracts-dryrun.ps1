#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Phase 1: Remove legacy schema contract tests (DRY RUN)

.DESCRIPTION
  DRY RUN: Shows what files would be removed without actually deleting them.
  These tests are checking for column existence, which TypeScript already validates at compile time.

.EXAMPLE
  .\cleanup-schema-contracts-dryrun.ps1
#>

[CmdletBinding()]
param(
    [switch]$Execute = $false
)

$ErrorActionPreference = "Stop"

Write-Host "Phase 1: Schema Contract Test Cleanup" -ForegroundColor Cyan
if (-not $Execute) {
    Write-Host "DRY RUN MODE - No files will be deleted" -ForegroundColor Yellow
} else {
    Write-Host "EXECUTION MODE - Files will be deleted" -ForegroundColor Red
}
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Define test files to remove
$testFiles = @(
    "packages\db\src\__test__\domain-schema-contracts.test.ts",
    "packages\db\src\__test__\platform-schema-contracts.test.ts",
    "packages\db\src\__test__\phase4-schema-contracts.test.ts",
    "packages\db\src\__test__\meta-schema-contracts.test.ts"
)

$totalLines = 0
$totalTests = 0
$filesFound = 0
$filesMissing = 0

Write-Host "Analyzing files..." -ForegroundColor Cyan
Write-Host ""

foreach ($file in $testFiles) {
    # Resolve full path (handles both relative from script and from workspace root)
    $fullPath = if (Test-Path (Join-Path $PSScriptRoot ".." ".." $file)) {
        Join-Path $PSScriptRoot ".." ".." $file
    } elseif (Test-Path $file) {
        $file
    } else {
        $null
    }

    if ($fullPath -and (Test-Path $fullPath)) {
        $filesFound++
        $lineCount = (Get-Content $fullPath | Measure-Object -Line).Lines
        # Count both test() and it() patterns
        $testCount = (Select-String -Path $fullPath -Pattern "\b(test|it)\(" -AllMatches).Matches.Count
        $totalLines += $lineCount
        $totalTests += $testCount

        $fileName = Split-Path $fullPath -Leaf
        Write-Host "[✓] Found: $fileName" -ForegroundColor Green
        Write-Host "    Path: $file" -ForegroundColor Gray
        Write-Host "    Lines: $lineCount | Tests: $testCount" -ForegroundColor Gray

        if ($Execute) {
            Write-Host "    Action: DELETING..." -ForegroundColor Red
            Remove-Item $fullPath -Force
            Write-Host "    Status: Deleted" -ForegroundColor Red
        } else {
            Write-Host "    Action: Would delete (dry run)" -ForegroundColor Yellow
        }
        Write-Host ""
    } else {
        $filesMissing++
        Write-Host "[✗] Not found: $file" -ForegroundColor DarkGray
        Write-Host "    Status: Already removed or path incorrect" -ForegroundColor DarkGray
        Write-Host ""
    }
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Files found:    $filesFound" -ForegroundColor $(if ($filesFound -gt 0) { "Green" } else { "Gray" })
Write-Host "Files missing:  $filesMissing" -ForegroundColor $(if ($filesMissing -gt 0) { "Yellow" } else { "Gray" })
Write-Host "Total lines:    $totalLines" -ForegroundColor Cyan
Write-Host "Total tests:    $totalTests (redundant with TypeScript)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Why remove these tests?" -ForegroundColor Yellow
Write-Host "  These tests check if columns exist on database schemas." -ForegroundColor Gray
Write-Host "  TypeScript already validates this at compile time." -ForegroundColor Gray
Write-Host "  Example redundant test:" -ForegroundColor Gray
Write-Host "    expect(getTableColumns(partners).name).toBeDefined() ✗" -ForegroundColor DarkGray
Write-Host "  TypeScript already ensures:" -ForegroundColor Gray
Write-Host "    partners.name.name // Compile error if 'name' missing ✓" -ForegroundColor DarkGray
Write-Host ""

if ($Execute) {
    Write-Host "✓ Phase 1 Complete - Files Deleted" -ForegroundColor Green
    Write-Host ""
    Write-Host "Running tests to verify integrity..." -ForegroundColor Cyan
    try {
        pnpm --filter @afenda/db test
        Write-Host ""
        Write-Host "✓ Tests pass without schema contract files" -ForegroundColor Green
    } catch {
        Write-Host ""
        Write-Host "✗ Tests failed - you may need to investigate" -ForegroundColor Red
        throw
    }
} else {
    Write-Host "DRY RUN COMPLETE - No files were deleted" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To execute the cleanup, run:" -ForegroundColor Cyan
    Write-Host "  .\cleanup-schema-contracts-dryrun.ps1 -Execute" -ForegroundColor White
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Review the changes: git status / git diff" -ForegroundColor White
Write-Host "  2. Proceed to Phase 2: API Snapshot Tests (see IMPLEMENTATION-GUIDE.md)" -ForegroundColor White
Write-Host "  3. Follow QUICKSTART.md for full implementation" -ForegroundColor White
