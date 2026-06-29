@echo off
title ITSM System - Frontend Only
chcp 65001 >nul

echo ========================================
echo   Starting Next.js frontend
echo ========================================
echo.
echo  Opening http://localhost:3000 ...
echo  Login: admin / admin123
echo.
start http://localhost:3000
npm run dev

pause
