# Skrypt testujacy zgodnosc z wymogami projektu HMS-of-A
# Weryfikacja: brak emotek, brak nawiasow w tekstach uzytkownika, brak dlugich myslnikow

$files = Get-ChildItem -Path . -Recurse -Include *.html, *.css, *.js, *.md, *.bat, *.py -Exclude .git

$emojiRegex = "[\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u27BF]"
$longDashRegex = "[\u2013\u2014]"

$totalErrors = 0

Write-Host "Rozpoczecie testow zgodnosci..."

foreach ($file in $files) {
    $content = Get-Content -Raw $file.FullName
    $relPath = Resolve-Path -Relative $file.FullName

    if ($content -match $emojiRegex) {
        Write-Host "Blad: Wykryto emotke w pliku: $relPath" -ForegroundColor Red
        $totalErrors++
    }

    if ($content -match $longDashRegex) {
        Write-Host "Blad: Wykryto dlugi myslnik w pliku: $relPath" -ForegroundColor Red
        $totalErrors++
    }

    # Weryfikacja nawiasow w plikach HTML i MD
    if ($file.Extension -in @('.html', '.md')) {
        if ($content -match "[\(\)]") {
            Write-Host "Blad: Wykryto nawias w pliku tekstowym: $relPath" -ForegroundColor Red
            $totalErrors++
        }
    }
}

if ($totalErrors -eq 0) {
    Write-Host "Wszystkie testy zakonczone sukcesem. Brak emotek, brak dlugich myslnikow i brak niedozwolonych znakow." -ForegroundColor Green
} else {
    Write-Host "Liczba wykrytych bledow: $totalErrors" -ForegroundColor Red
}
