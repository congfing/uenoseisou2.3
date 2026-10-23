@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 上野清掃2.3を起動しています...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows_server.ps1"

if errorlevel 1 (
  echo.
  echo 起動できませんでした。管理者へ連絡してください。
  pause
)
