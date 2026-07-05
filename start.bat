@echo off
title ITSM System
chcp 65001 >nul

echo ========================================
echo   ITSM System - Start Services
echo ========================================
echo.

echo [1/2] Killing old Next.js on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
    timeout /t 2 /nobreak >nul
)
echo   [OK] Port 3000 is free
echo.

echo [2/2] Starting Next.js frontend (http://localhost:3000)...
start "Next.js Frontend" cmd /c "cd /d D:\SOFT\NEW CRM && npm run dev"
echo   [OK] Frontend at http://localhost:3000
echo.

echo ========================================
echo   Service started:
echo     Frontend: http://localhost:3000
echo     Database: SQLite (prisma/dev.db)
echo ========================================
echo.
echo Login: admin / admin123
echo.
pause
