@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo ============================================================
echo 启动 Doocs 服务
echo ============================================================
echo.

node node_modules/@doocs/md-cli/index.js port=8800

pause
