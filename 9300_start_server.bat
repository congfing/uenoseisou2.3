@echo off
setlocal
cd /d "%~dp0"

py -3 --version >nul 2>&1
if not errorlevel 1 (
    set "SERVER_PYTHON=py -3"
    goto start_server
)
python --version >nul 2>&1
if not errorlevel 1 (
    set "SERVER_PYTHON=python"
    goto start_server
)
echo Python 3 was not found. Please install Python 3 and try again.
pause
exit /b 1

:start_server
echo Starting Ueno Seisou 2.3: http://localhost:9300/
echo Press Ctrl+C or close this window to stop the server.
start "" "http://localhost:9300/"
%SERVER_PYTHON% -m http.server 9300 --bind 127.0.0.1
if errorlevel 1 (
    echo Server could not start. Check whether port 9300 is already in use.
    pause
    exit /b 1
)
endlocal
