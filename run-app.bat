@echo off
chcp 65001 >nul
title HMS-of-A : Serwer Telemetrii Python

echo ========================================================
echo     HMS-of-A : Health Monitoring System of Astronauts
echo ========================================================
echo.

echo Sprawdzanie czy serwer telemetrii juz dziala na porcie 5000...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:5000/api/state' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Serwer HMS-of-A jest juz aktywny na porcie 5000.
    echo Otwieranie aplikacji w przegladarce...
    start "" "http://localhost:5000/"
    echo Gotowe. Aplikacja dziala w tle.
    pause
    exit /b 0
)

echo Zwalnianie ewentualnego zablokowanego portu 5000...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo Otwieranie aplikacji w przegladarce internetowej...
start "" "http://localhost:5000/"

echo Uruchamianie serwera telemetrii Python...
echo Adres: http://localhost:5000/
echo Nacisnij Ctrl+C aby zatrzymac serwer.
echo.

python "%~dp0app.py"
if %ERRORLEVEL% NEQ 0 (
    echo Proba uruchomienia przez py launcher...
    py "%~dp0app.py"
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Blad: Nie udalo sie uruchomic srodowiska Python.
    echo Upewnij sie, ze Python 3 jest zainstalowany i dodany do sciezki PATH.
    echo.
    pause
)
