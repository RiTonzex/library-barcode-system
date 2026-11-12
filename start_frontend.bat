@echo off
echo ====================================================
echo Starting Library Statistics Frontend (Vite + React)
echo ====================================================
cd /d "%~dp0frontend"
set PATH=C:\Program Files\nodejs;%PATH%
call npm.cmd run dev
pause
