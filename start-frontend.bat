@echo off
title ITSM System - Frontend Only
chcp 65001 >nul

echo ========================================
echo   Starting Next.js frontend
echo ========================================
echo.

echo [1/2] Killing old Next.js on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
    timeout /t 2 /nobreak >nul
)
echo   [OK] Port 3000 is free
echo.

echo [2/2] Starting Next.js (http://localhost:3000)...
start http://localhost:3000
npm run dev

pause
