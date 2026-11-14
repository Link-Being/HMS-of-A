# Compliance check script for HMS-of-A project
# Verifies: no emojis, no parentheses in HTML or MD text, no en/em dashes

$repoRoot = Split-Path -Parent $PSScriptRoot
$files = Get-ChildItem -Path $repoRoot -Recurse -Include *.html, *.css, *.js, *.md, *.bat, *.py | Where-Object { $_.FullName -notmatch '\\\.git\\' -and $_.FullName -notmatch '\\__pycache__\\' }

$emojiRegex = "[\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u27BF]"
$longDashRegex = "[\u2013\u2014]"

$totalErrors = 0

Write-Host "Starting compliance checks..."

foreach ($file in $files) {
    $content = Get-Content -Raw $file.FullName
    $relPath = Resolve-Path -Relative $file.FullName

    if ($content -match $emojiRegex) {
        Write-Host "Error: Emoji detected in file: $relPath" -ForegroundColor Red
        $totalErrors++
    }

    if ($content -match $longDashRegex) {
        Write-Host "Error: Long dash detected in file: $relPath" -ForegroundColor Red
        $totalErrors++
    }

    # Check parentheses in HTML and MD files
    if ($file.Extension -in @('.html', '.md')) {
        if ($content -match "[\(\)]") {
            Write-Host "Error: Parenthesis detected in text file: $relPath" -ForegroundColor Red
            $totalErrors++
        }
    }
}

if ($totalErrors -eq 0) {
    Write-Host "All compliance checks passed. No emojis, no long dashes, and no disallowed characters found." -ForegroundColor Green
} else {
    Write-Host "Errors detected: $totalErrors" -ForegroundColor Red
}
