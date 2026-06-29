@echo off
title ITSM System
chcp 65001 >nul

echo ========================================
echo   ITSM System - Start Services
echo ========================================
echo.

echo [1/3] Starting MariaDB...
sc query MySQL >nul 2>&1
if %errorlevel% equ 0 (
    sc start MySQL >nul 2>&1
    echo   [OK] MariaDB is running
) else (
    echo   [!] MariaDB service not found. Run: mysqld --console
)
echo.

echo [2/3] Starting GLPI backend (http://localhost:8080)...
start "GLPI Backend" cmd /c "cd /d D:\GLPI && php -S localhost:8080 -t .\public"
echo   [OK] GLPI backend at http://localhost:8080
echo.

echo [3/3] Starting Next.js frontend (http://localhost:3000)...
start "Next.js Frontend" cmd /c "cd /d D:\SOFT\NEW CRM && npm run dev"
echo   [OK] Frontend at http://localhost:3000
echo.

echo ========================================
echo   All services started:
echo     Frontend: http://localhost:3000
echo     GLPI:     http://localhost:8080
echo     MariaDB:  port 3306
echo ========================================
echo.
echo Login: admin / admin123
echo.
pause
