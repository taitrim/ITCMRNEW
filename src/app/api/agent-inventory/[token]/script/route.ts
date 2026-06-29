import { prisma } from "@/lib/db";

/* ===== GLPI Agent Inventory Script =====
 *
 * Script .bat sẽ:
 *   1. Tải GLPI Agent portable (có cache — không tải lại nếu đã có)
 *   2. Chạy GLPI Agent với --local output_dir --json (inventory → file JSON)
 *   3. curl POST file JSON lên CRM API
 *
 * Ưu điểm GLPI Agent:
 *   - Phát hiện chính xác PC/Laptop/AIO (chassis type)
 *   - Đầy đủ RAM sticks + total slots (PhysicalMemoryArray)
 *   - Disk drives vật lý (Win32_DiskDrive) thay vì logical volumes
 *   - Network, GPU, software, BIOS, monitors chi tiết
 *   - Định dạng chuẩn FusionInventory
 */

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const session = await prisma.collectionSession.findUnique({
    where: { token },
    select: { id: true, token: true, status: true },
  });

  if (!session) {
    return new Response("Invalid token", { status: 404 });
  }

  if (session.status !== "pending" && session.status !== "active") {
    return new Response("Session not available", { status: 410 });
  }

  const baseUrl = new URL(req.url).origin;
  const agentUrl = `${baseUrl}/api/agent-inventory/${token}`;
  const version = "1.18";
  const winZipUrl = `https://github.com/glpi-project/glpi-agent/releases/download/${version}/GLPI-Agent-${version}-x64.zip`;

  // Script .bat: tải GLPI Agent portable → tìm glpi-agent.bat → chạy --server
  const batContent = `@echo off
chcp 65001 >nul
title CRM - Thu thap thong tin (GLPI Agent)
setlocal enabledelayedexpansion
cd /d "%~dp0"

set "CRM_URL=${agentUrl}"
set "AGENT_VERSION=${version}"
set "AGENT_ZIP_URL=${winZipUrl}"
set "TEMP_DIR=glpi-agent-temp"
set "AGENT_EXE="

echo ============================================
echo   CRM Agent - GLPI Agent Inventory
echo   Token: %USERNAME%@%COMPUTERNAME%
echo ============================================
echo.

:: === Buoc 1: Tim / Tai GLPI Agent ===
echo [1/3] Kiem tra GLPI Agent...

:: Tim glpi-agent.bat trong thu muc cache
for /f "delims=" %%f in ('dir /s /b "%TEMP_DIR%\\glpi-agent.bat" 2^>nul') do set "AGENT_EXE=%%f"
if defined AGENT_EXE (
    echo Da co GLPI Agent tai: !AGENT_EXE!
    goto :run_agent
)

if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"

echo Dang tai GLPI Agent %AGENT_VERSION% (31MB)...
curl -L --progress-bar -o "%TEMP_DIR%\\agent.zip" "%AGENT_ZIP_URL%" 2>nul
if %errorlevel% neq 0 (
    powershell -Command "Invoke-WebRequest -Uri '%AGENT_ZIP_URL%' -OutFile '%TEMP_DIR%\\agent.zip'" >nul 2>&1
)

if not exist "%TEMP_DIR%\\agent.zip%" (
    echo [LOI] Khong the tai GLPI Agent. Vui long kiem tra internet.
    echo.
    echo Ban co the tai thu cong: %AGENT_ZIP_URL%
    pause
    exit /b 1
)

echo Giai nen ...
powershell -Command "Expand-Archive -Path '%TEMP_DIR%\\agent.zip' -DestinationPath '%TEMP_DIR%' -Force" >nul 2>&1
del "%TEMP_DIR%\\agent.zip" >nul 2>&1

:: Tim lai glpi-agent.bat sau khi giai nen
for /f "delims=" %%f in ('dir /s /b "%TEMP_DIR%\\glpi-agent.bat" 2^>nul') do set "AGENT_EXE=%%f"

if not defined AGENT_EXE (
    echo [LOI] Khong tim thay glpi-agent.bat sau khi giai nen.
    pause
    exit /b 1
)
echo OK.

:: === Buoc 2: Chay GLPI Agent (local → JSON) ===
:run_agent
echo.
echo [2/3] Dang thu thap thong tin...

set "OUTPUT_DIR=%TEMP_DIR%\\output"
if exist "%OUTPUT_DIR%" rmdir /s /q "%OUTPUT_DIR%" >nul 2>&1
mkdir "%OUTPUT_DIR%" >nul 2>&1

echo Dang chay GLPI Agent...
cd /d "%~dp0"
"!AGENT_EXE!" --local "%OUTPUT_DIR%" --json --no-ssl-check --logfile agent-log.txt
set "EXIT_CODE=%ERRORLEVEL%"

:: Tim file JSON output
set "JSON_FILE="
for /f "delims=" %%f in ('dir /s /b "%OUTPUT_DIR%\\*.json" 2^>nul') do set "JSON_FILE=%%f"

if defined JSON_FILE (
    echo Da thu thap xong: !JSON_FILE!
    echo.
    echo [3/3] Dang gui du lieu len CRM...
    curl -X POST -H "Content-Type: application/json" -d @"!JSON_FILE!" "%CRM_URL%"
    echo.
    echo Hoan thanh!
) else (
    echo [LOI] Khong tim thay file JSON tu GLPI Agent.
    echo Kiem tra log:
    if exist agent-log.txt type agent-log.txt
)

if exist agent-log.txt del agent-log.txt >nul 2>&1
echo.
pause`;

  // Script Linux (sh) — dùng GLPI Agent nếu có, fallback manual
  const shContent = `#!/bin/bash
echo "=== CRM - GLPI Agent Inventory ==="
echo ""

CRM_URL="${agentUrl}"
INVENTORY_FILE="/tmp/crm-inventory.json"

# Kiem tra GLPI Agent
AGENT=$(which glpi-agent 2>/dev/null || which glpi-agent.pl 2>/dev/null || echo "")

if [ -n "$AGENT" ]; then
    echo "GLPI Agent tim thay tai: $AGENT"
    echo "Dang thu thap va gui thong tin len CRM..."
    $AGENT --server "$CRM_URL" --json --no-ssl-check 2>&1
    echo ""
    echo "Hoan thanh!"
    exit 0
fi

# Fallback: manual inventory
echo "GLPI Agent khong co. Gui thong tin co ban..."
HOSTNAME=$(hostname)
curl -s -X POST "$CRM_URL" \\
  -H "Content-Type: application/json" \\
  -d "{
    \\"action\\": \\"inventory\\",
    \\"deviceid\\": \\"$HOSTNAME-$(uname -r)\\" ,
    \\"content\\": {
      \\"computers\\": [{
        \\"name\\": \\"$HOSTNAME\\",
        \\"hardware\\": {
          \\"manufacturer\\": \\"$(cat /sys/class/dmi/id/sys_vendor 2>/dev/null || echo '')\\",
          \\"model\\": \\"$(cat /sys/class/dmi/id/product_name 2>/dev/null || echo '')\\",
          \\"serial_number\\": \\"$(cat /sys/class/dmi/id/product_serial 2>/dev/null || echo '')\\"
        },
        \\"operatingsystem\\": { \\"full_name\\": \\"$(uname -o) $(uname -r)\\" },
        \\"memory\\": { \\"physical_memory\\": $(free -m | awk '/^Mem:/{print $2}') },
        \\"processors\\": [{ \\"name\\": \\"$(grep 'model name' /proc/cpuinfo | head -1 | cut -d: -f2 | xargs)\\" }]
      }]
    }
  }" \\
  --max-time 30

echo ""
echo "Hoan thanh!"`;

  // Detect OS from user-agent
  const ua = req.headers.get("user-agent") || "";
  const isWindows = ua.includes("Windows") || ua.includes("wow64");

  let filename: string, content: string, mime: string;
  if (isWindows) {
    filename = "thu-thap.bat";
    content = batContent.replace(/\n/g, "\r\n"); // CRLF for cmd.exe
    mime = "application/bat";
  } else {
    filename = "thu-thap.sh";
    content = shContent;
    mime = "text/x-shellscript";
  }

  return new Response(content, {
    headers: {
      "Content-Type": `${mime}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
