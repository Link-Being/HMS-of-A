@echo off
chcp 65001 >nul
title HMS-of-A : Python Telemetry Server

echo ========================================================
echo     HMS-of-A : Health Monitoring System of Astronauts
echo ========================================================
echo.

echo Checking whether telemetry server is already running on port 5000...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:5000/api/state' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo HMS-of-A server is already active on port 5000.
    echo Opening application in browser...
    start "" "http://localhost:5000/"
    echo Ready. Application is running in background.
    pause
    exit /b 0
)

echo Clearing any locked process on port 5000...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo Opening application in web browser...
start "" "http://localhost:5000/"

echo Starting Python telemetry server...
echo URL: http://localhost:5000/
echo Press Ctrl+C to stop the server.
echo.

python "%~dp0app.py"
if %ERRORLEVEL% NEQ 0 (
    echo Attempting launch via py launcher...
    py "%~dp0app.py"
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Error: Failed to launch Python environment.
    echo Ensure Python 3 is installed and added to PATH.
    echo.
    pause
)
