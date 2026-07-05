import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const GLPI_AGENT_VERSION = "1.18";

/* ===== GLPI Agent Inventory Script =====
 *
 * Hỗ trợ 3 hệ điều hành: Windows (.bat), Linux (.sh), macOS (.sh).
 *
 * Mỗi script sẽ:
 *   1. Tải GLPI Agent portable (cache — không tải lại nếu đã có)
 *   2. Chạy GLPI Agent với --local output_dir --json --full → file JSON
 *   3. curl/PowerShell POST file JSON lên CRM API
 *
 * Fallback (mode=simple): PowerShell thuần, không cần GLPI Agent.
 */

/** Quick Windows script: PowerShell thuần, không cần tải GLPI Agent */
function createSimpleWindowsScript(agentUrl: string): string {
  const batchSafeUrl = agentUrl.replace(/&/g, "^&");
  const lines: string[] = [
    `@echo off`,
    `chcp 65001 >nul`,
    `title CRM Agent - Quick Inventory`,
    `cd /d "%~dp0"`,
    ``,
    `set "CRM_URL=${batchSafeUrl}"`,
    `set "PS_SCRIPT=%temp%\\crm-agent.ps1"`,
    ``,
    `echo ============================================`,
    `echo   CRM Agent - Quick Inventory`,
    `echo ============================================`,
    `echo.`,
    `echo Collecting system info...`,
    ``,
    `:: Generate PowerShell script line by line`,
    `echo # CRM Agent > "%PS_SCRIPT%"`,
    `echo $ErrorActionPreference = 'Stop' >> "%PS_SCRIPT%"`,
    `echo try { >> "%PS_SCRIPT%"`,
    `echo   $hostname = $env:COMPUTERNAME >> "%PS_SCRIPT%"`,
    `echo   $cpu = (Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue ^| Select-Object -First 1).Name >> "%PS_SCRIPT%"`,
    `echo   $ram = [math]::Round((Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue).TotalPhysicalMemory / 1MB, 0^) >> "%PS_SCRIPT%"`,
    `echo   $serial = (Get-CimInstance Win32_BIOS -ErrorAction SilentlyContinue).SerialNumber >> "%PS_SCRIPT%"`,
    `echo   $manufacturer = (Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue).Manufacturer >> "%PS_SCRIPT%"`,
    `echo   $model = (Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue).Model >> "%PS_SCRIPT%"`,
    `echo   $ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue ^| Where-Object { $_.InterfaceAlias -ne 'Loopback Pseudo-Interface 1' } ^| Select-Object -First 1^).IPAddress >> "%PS_SCRIPT%"`,
    `echo   $mac = (Get-NetAdapter -ErrorAction SilentlyContinue ^| Where-Object { $_.Status -eq 'Up' } ^| Select-Object -First 1^).MacAddress >> "%PS_SCRIPT%"`,
    `echo   $os = (Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue).Caption >> "%PS_SCRIPT%"`,
    `echo   $user = $env:USERNAME >> "%PS_SCRIPT%"`,
    `echo   $diskGB = [math]::Round(((Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' -ErrorAction SilentlyContinue ^| Measure-Object -Property Size -Sum^).Sum / 1GB^), 0^) >> "%PS_SCRIPT%"`,
    `echo   $chassis = 'Desktop' >> "%PS_SCRIPT%"`,
    `echo   $enc = Get-CimInstance Win32_SystemEnclosure -ErrorAction SilentlyContinue ^| Select-Object -First 1 >> "%PS_SCRIPT%"`,
    `echo   if ($enc -and $enc.ChassisTypes -contains 10 -or $enc.ChassisTypes -contains 11 -or $enc.ChassisTypes -contains 12 -or $enc.ChassisTypes -contains 14^) { $chassis = 'Laptop' } >> "%PS_SCRIPT%"`,
    `echo   $body = @{ >> "%PS_SCRIPT%"`,
    `echo     action = 'inventory' >> "%PS_SCRIPT%"`,
    `echo     deviceid = "$hostname-$serial" >> "%PS_SCRIPT%"`,
    `echo     content = @{ >> "%PS_SCRIPT%"`,
    `echo       hardware = @{ name = $hostname; chassis_type = $chassis; memory = $ram; uuid = $serial; lastloggeduser = $user } >> "%PS_SCRIPT%"`,
    `echo       bios = @{ smanufacturer = $manufacturer; smodel = $model; sserial = $serial } >> "%PS_SCRIPT%"`,
    `echo       operatingsystem = @{ name = 'Windows'; full_name = $os } >> "%PS_SCRIPT%"`,
    `echo       cpus = @(@{ name = $cpu }) >> "%PS_SCRIPT%"`,
    `echo       storages = @(@{ disksize = ($diskGB * 1024^) }) >> "%PS_SCRIPT%"`,
    `echo       networks = @(@{ ipaddress = $ip; macaddr = $mac }) >> "%PS_SCRIPT%"`,
    `echo       users = @(@{ LOGIN = $user }) >> "%PS_SCRIPT%"`,
    `echo     } >> "%PS_SCRIPT%"`,
    `echo   } >> "%PS_SCRIPT%"`,
    `echo   Write-Output "Hostname: $hostname" >> "%PS_SCRIPT%"`,
    `echo   Write-Output "CPU: $cpu" >> "%PS_SCRIPT%"`,
    `echo   Write-Output "RAM: $ram MB" >> "%PS_SCRIPT%"`,
    `echo   Write-Output "Serial: $serial" >> "%PS_SCRIPT%"`,
    `echo   Write-Output "" >> "%PS_SCRIPT%"`,
    `echo   Write-Output "Sending to CRM..." >> "%PS_SCRIPT%"`,
    `echo   $jsonBody = $body ^| ConvertTo-Json -Depth 10 -Compress >> "%PS_SCRIPT%"`,
    `echo   Invoke-RestMethod -Uri '%CRM_URL%' -Method POST -Body $jsonBody -ContentType 'application/json' -TimeoutSec 30 ^| Out-Null >> "%PS_SCRIPT%"`,
    `echo   Write-Output "Done!" >> "%PS_SCRIPT%"`,
    `echo } catch { >> "%PS_SCRIPT%"`,
    `echo   Write-Output "ERROR: $_" >> "%PS_SCRIPT%"`,
    `echo   exit 1 >> "%PS_SCRIPT%"`,
    `echo } >> "%PS_SCRIPT%"`,
    ``,
    `powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%"`,
    `del "%PS_SCRIPT%" >nul 2>&1`,
    `echo.`,
    `pause`,
  ];
  return lines.join("\r\n");
}

/** Windows .bat script: tải GLPI Agent portable → chạy --local --json --full → POST */
function createGlpiWindowsScript(agentUrl: string): string {
  const batchSafeUrl = agentUrl.replace(/&/g, "^&");
  const winZipUrl = `https://github.com/glpi-project/glpi-agent/releases/download/${GLPI_AGENT_VERSION}/GLPI-Agent-${GLPI_AGENT_VERSION}-x64.zip`;

  return `@echo off
chcp 65001 >nul
title CRM Agent - GLPI Agent Inventory
setlocal enabledelayedexpansion
cd /d "%~dp0"

set "CRM_URL=${batchSafeUrl}"
set "AGENT_VERSION=${GLPI_AGENT_VERSION}"
set "AGENT_ZIP_URL=${winZipUrl}"
set "TEMP_DIR=glpi-agent-temp"
set "AGENT_EXE="
set "LOG_FILE=crm-agent-%COMPUTERNAME%.log"

:: Ghi tat ca output vao log file
echo ============================================ > "%LOG_FILE%"
echo   CRM Agent - GLPI Agent Inventory >> "%LOG_FILE%"
echo   Started: %DATE% %TIME% >> "%LOG_FILE%"
echo ============================================ >> "%LOG_FILE%"

echo ============================================
echo   CRM Agent - GLPI Agent Inventory
echo ============================================
echo.

:: === Buoc 1: Tim / Tai GLPI Agent ===
echo Step 1/3: Checking for GLPI Agent...
echo [1/3] Checking for GLPI Agent... >> "%LOG_FILE%"

:: Search cache for glpi-agent.bat or glpi-agent.pl
for /f "delims=" %%f in ('dir /s /b "%TEMP_DIR%\\glpi-agent.bat" 2^>nul') do set "AGENT_EXE=%%f"
if not defined AGENT_EXE (
  for /f "delims=" %%f in ('dir /s /b "%TEMP_DIR%\\glpi-agent.pl" 2^>nul') do set "AGENT_EXE=%%f"
)
if defined AGENT_EXE (
    echo Found cached: !AGENT_EXE!
    echo Found cached: !AGENT_EXE! >> "%LOG_FILE%"
    goto :run_agent
)

:: Not cached — download
if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"

echo Downloading GLPI Agent %AGENT_VERSION% (31MB) — please wait...
echo Downloading %AGENT_ZIP_URL% >> "%LOG_FILE%"

:: Thu curl truoc
curl -fSL --progress-bar -o "%TEMP_DIR%\\agent.zip" "%AGENT_ZIP_URL%" 2>>"%LOG_FILE%"
if %errorlevel% neq 0 (
    echo curl failed, retrying with PowerShell...
    echo curl failed, retrying with PowerShell... >> "%LOG_FILE%"
    powershell -Command "Invoke-WebRequest -Uri '%AGENT_ZIP_URL%' -OutFile '%TEMP_DIR%\\agent.zip'" >>"%LOG_FILE%" 2>&1
)

if not exist "%TEMP_DIR%\\agent.zip" (
    echo.
    echo [ERROR] Cannot download GLPI Agent. Check internet connection.
    echo [ERROR] Cannot download GLPI Agent >> "%LOG_FILE%"
    echo.
    echo Manual download: %AGENT_ZIP_URL%
    echo.
    goto :end
)

echo Extracting...
echo Extracting... >> "%LOG_FILE%"
powershell -Command "Expand-Archive -Path '%TEMP_DIR%\\agent.zip' -DestinationPath '%TEMP_DIR%' -Force" >>"%LOG_FILE%" 2>&1
del "%TEMP_DIR%\\agent.zip" >nul 2>&1

:: Find glpi-agent.bat or .pl
for /f "delims=" %%f in ('dir /s /b "%TEMP_DIR%\\glpi-agent.bat" 2^>nul') do set "AGENT_EXE=%%f"
if not defined AGENT_EXE (
  for /f "delims=" %%f in ('dir /s /b "%TEMP_DIR%\\glpi-agent.pl" 2^>nul') do set "AGENT_EXE=%%f"
)

if not defined AGENT_EXE (
    echo.
    echo [ERROR] Cannot find glpi-agent after extraction.
    echo [ERROR] Cannot find glpi-agent >> "%LOG_FILE%"
    echo.
    echo Contents:
    dir /s "%TEMP_DIR%"
    dir /s "%TEMP_DIR%" >> "%LOG_FILE%"
    echo.
    goto :end
)
echo Found: !AGENT_EXE!
echo Found: !AGENT_EXE! >> "%LOG_FILE%"

:: === Buoc 2: Chay GLPI Agent ===
:run_agent
echo.
echo Step 2/3: Collecting inventory (takes ~1 min)...
echo [2/3] Running GLPI Agent... >> "%LOG_FILE%"

set "BASE_DIR=%~dp0"
set "OUTPUT_DIR=%BASE_DIR%%TEMP_DIR%\\output"
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%" >nul 2>&1

cd /d "%BASE_DIR%"
echo Running: !AGENT_EXE! --local "%OUTPUT_DIR%" --json --full
echo CMD: !AGENT_EXE! --local "%OUTPUT_DIR%" --json --full >> "%LOG_FILE%"
"!AGENT_EXE!" --local "%OUTPUT_DIR%" --json --full --logfile agent-log.txt 2>>"%LOG_FILE%"
set "EXIT_CODE=%ERRORLEVEL%"
echo Agent exit code: %EXIT_CODE%
echo Agent exit code: %EXIT_CODE% >> "%LOG_FILE%"

:: Wait for file to be written
ping -n 4 127.0.0.1 >nul 2>&1

:: Find output JSON file
set "JSON_FILE="
for /f "delims=" %%f in ('dir /b "%OUTPUT_DIR%" 2^>nul') do (
    if not defined JSON_FILE set "JSON_FILE=%OUTPUT_DIR%\\%%f"
)

echo Files found in output dir: >> "%LOG_FILE%"
dir /b "%OUTPUT_DIR%" >> "%LOG_FILE%" 2>&1

if not defined JSON_FILE (
    echo.
    echo [ERROR] No output file found from GLPI Agent.
    echo [ERROR] No output file >> "%LOG_FILE%"
    if exist agent-log.txt (
        echo.
        echo Agent log:
        type agent-log.txt
        echo --- agent-log.txt --- >> "%LOG_FILE%"
        type agent-log.txt >> "%LOG_FILE%"
    )
    echo.
    echo Output directory contents:
    dir /s "%OUTPUT_DIR%" 2>nul
    dir /s "%OUTPUT_DIR%" >> "%LOG_FILE%" 2>&1
    echo.
    goto :end
)

echo Collected: !JSON_FILE!
echo Collected: !JSON_FILE! >> "%LOG_FILE%"
echo.
echo Step 3/3: Sending to CRM...
echo [3/3] Sending to CRM >> "%LOG_FILE%"

:: Doc file bang PowerShell de tranh loi path co spaces
powershell -Command "$c = Get-Content -Raw '!JSON_FILE!'; try { Invoke-RestMethod -Uri '%CRM_URL%' -Method POST -ContentType 'application/json' -Body $c -TimeoutSec 60 ^| Out-Null; Write-Output 'OK' } catch { Write-Output 'FAIL: ' + $_.Exception.Message }" 2>>"%LOG_FILE%"

echo.
echo Done!
echo Done! >> "%LOG_FILE%"
del "!JSON_FILE!" >nul 2>&1
if exist agent-log.txt del agent-log.txt >nul 2>&1
echo.
echo ============================================
echo Completed: %DATE% %TIME%
echo Log saved to: %CD%\%LOG_FILE%
echo ============================================
echo.
pause
goto :eof

:end
echo.
echo ============================================
echo FAILED: %DATE% %TIME%
echo Check log: %CD%\%LOG_FILE%
echo ============================================
echo.
pause`;
}

/** Linux .sh script: dùng GLPI Agent AppImage */  
function createLinuxScript(agentUrl: string): string {
  const appImageUrl = `https://github.com/glpi-project/glpi-agent/releases/download/${GLPI_AGENT_VERSION}/glpi-agent-${GLPI_AGENT_VERSION}-x86_64.AppImage`;

  return `#!/bin/bash
echo "=== CRM Agent - GLPI Agent Inventory (Linux) ==="
echo ""

CRM_URL="${agentUrl}"
AGENT_VERSION="${GLPI_AGENT_VERSION}"
APPIMAGE_URL="${appImageUrl}"
CACHE_DIR="\\$HOME/.cache/crm-agent"
AGENT_DIR="\\$CACHE_DIR/agent"
OUTPUT_DIR="\\$CACHE_DIR/output-\\$(date +%Y%m%d-%H%M%S)"

# === Buoc 1: Kiem tra / Tai GLPI Agent ===
echo "[1/3] Kiem tra GLPI Agent..."
mkdir -p "\\$AGENT_DIR" "\\$OUTPUT_DIR"

AGENT=$(which glpi-agent 2>/dev/null || which glpi-agent.pl 2>/dev/null || echo "")
if [ -z "\\$AGENT" ] && [ -f "\\$AGENT_DIR/glpi-agent.AppImage" ]; then
    AGENT="\\$AGENT_DIR/glpi-agent.AppImage"
    chmod +x "\\$AGENT" 2>/dev/null
fi

if [ -z "\\$AGENT" ]; then
    echo "Downloading GLPI Agent \\$AGENT_VERSION..."
    if command -v curl &>/dev/null; then
        curl -fSL -o "\\$AGENT_DIR/glpi-agent.AppImage" "\\$APPIMAGE_URL"
    elif command -v wget &>/dev/null; then
        wget -O "\\$AGENT_DIR/glpi-agent.AppImage" "\\$APPIMAGE_URL"
    fi
    if [ -f "\\$AGENT_DIR/glpi-agent.AppImage" ]; then
        chmod +x "\\$AGENT_DIR/glpi-agent.AppImage"
        AGENT="\\$AGENT_DIR/glpi-agent.AppImage"
    fi
fi

if [ -z "\\$AGENT" ]; then
    echo ""
    echo "[ERROR] Cannot download GLPI Agent."
    echo "Manual: \\$APPIMAGE_URL"
    echo ""
    exit 1
fi
echo "GLPI Agent: \\$AGENT"

# === Buoc 2: Chay GLPI Agent ===
echo ""
echo "[2/3] Collecting inventory (takes ~1 min)..."
"\\$AGENT" --local "\\$OUTPUT_DIR" --json --full --logfile agent-log.txt 2>&1
sleep 3

# === Buoc 3: Tim file JSON va gui len CRM ===
echo ""
echo "[3/3] Sending to CRM..."
JSON_FILE=$(find "\\$OUTPUT_DIR" -name "*.json" -type f 2>/dev/null | head -1)
if [ -z "\\$JSON_FILE" ]; then
    echo "[ERROR] No output file from GLPI Agent."
    [ -f agent-log.txt ] && cat agent-log.txt
    exit 1
fi

if command -v curl &>/dev/null; then
    curl -s -X POST "\\$CRM_URL" -H "Content-Type: application/json" -d @"\\$JSON_FILE"
elif command -v wget &>/dev/null; then
    wget -q -O- --post-file="\\$JSON_FILE" --header="Content-Type: application/json" "\\$CRM_URL"
fi
echo ""
echo "Done!"
rm -f "\\$JSON_FILE" agent-log.txt
echo "";
`;
}

/** macOS .sh script: dùng GLPI Agent .pkg */
function createMacScript(agentUrl: string): string {
  const pkgUrl = `https://github.com/glpi-project/glpi-agent/releases/download/${GLPI_AGENT_VERSION}/GLPI-Agent-${GLPI_AGENT_VERSION}_x86_64.pkg`;

  return `#!/bin/bash
echo "=== CRM Agent - GLPI Agent Inventory (macOS) ==="
echo ""

CRM_URL="${agentUrl}"
AGENT_VERSION="${GLPI_AGENT_VERSION}"
PKG_URL="${pkgUrl}"
CACHE_DIR="\\$HOME/.cache/crm-agent"
AGENT_DIR="\\$CACHE_DIR/agent"
OUTPUT_DIR="\\$CACHE_DIR/output-\\$(date +%Y%m%d-%H%M%S)"

# === Buoc 1: Kiem tra / Tai / Cai dat GLPI Agent ===
echo "[1/3] Kiem tra GLPI Agent..."
mkdir -p "\\$AGENT_DIR" "\\$OUTPUT_DIR"

AGENT=$(which glpi-agent 2>/dev/null || which glpi-agent.pl 2>/dev/null || echo "")

if [ -z "\\$AGENT" ] && [ -f "\\$AGENT_DIR/glpi-agent" ]; then
    AGENT="\\$AGENT_DIR/glpi-agent"
fi

if [ -z "\\$AGENT" ]; then
    echo "Downloading GLPI Agent \\$AGENT_VERSION..."
    if command -v curl &>/dev/null; then
        curl -fSL -o "\\$AGENT_DIR/agent.pkg" "\\$PKG_URL"
    elif command -v wget &>/dev/null; then
        wget -O "\\$AGENT_DIR/agent.pkg" "\\$PKG_URL"
    fi
    if [ -f "\\$AGENT_DIR/agent.pkg" ]; then
        echo "Installing GLPI Agent (may ask for password)..."
        sudo installer -pkg "\\$AGENT_DIR/agent.pkg" -target / 2>/dev/null
        AGENT=$(which glpi-agent 2>/dev/null || which glpi-agent.pl 2>/dev/null || echo "")
        if [ -z "\\$AGENT" ]; then
            cp "\\$AGENT_DIR/agent.pkg" /tmp/crm-agent.pkg
            echo "Please install manually: open /tmp/crm-agent.pkg"
        fi
    fi
fi

if [ -z "\\$AGENT" ]; then
    echo ""
    echo "[ERROR] Cannot install GLPI Agent."
    echo "Manual: \\$PKG_URL"
    echo ""
    exit 1
fi
echo "GLPI Agent: \\$AGENT"

# === Buoc 2: Chay GLPI Agent ===
echo ""
echo "[2/3] Collecting inventory..."
"\\$AGENT" --local "\\$OUTPUT_DIR" --json --full --logfile agent-log.txt 2>&1
sleep 3

# === Buoc 3: Gui len CRM ===
echo ""
echo "[3/3] Sending to CRM..."
JSON_FILE=$(find "\\$OUTPUT_DIR" -name "*.json" -type f 2>/dev/null | head -1)
if [ -z "\\$JSON_FILE" ]; then
    echo "[ERROR] No output from GLPI Agent."
    [ -f agent-log.txt ] && cat agent-log.txt
    exit 1
fi

if command -v curl &>/dev/null; then
    curl -s -X POST "\\$CRM_URL" -H "Content-Type: application/json" -d @"\\$JSON_FILE"
elif command -v wget &>/dev/null; then
    wget -q -O- --post-file="\\$JSON_FILE" --header="Content-Type: application/json" "\\$CRM_URL"  
fi
echo ""
echo "Done!"
rm -f "\\$JSON_FILE" agent-log.txt
echo "";
`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  // Yêu cầu đăng nhập — chỉ CRM staff mới tải được script
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const { customerId } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, agentKey: true, agentEnabled: true, name: true },
  });

  if (!customer) {
    return new Response("Customer not found", { status: 404 });
  }
  if (!customer.agentEnabled) {
    return new Response("Agent disabled for this customer", { status: 403 });
  }

  // Detect OS + mode
  const reqUrl = new URL(req.url);
  const osParam = reqUrl.searchParams.get("os") || "";
  const modeParam = reqUrl.searchParams.get("mode") || "glpi";

  // Build URL cho agent POST: customerId + agentKey làm query params
  const host = req.headers.get("host") || reqUrl.host;
  const proto = req.headers.get("x-forwarded-proto") || reqUrl.protocol.replace(":", "");
  const baseUrl = `${proto}://${host}`;
  // KHÔNG escape & ở đây — mỗi script tự xử lý batch-safe riêng
  const agentUrl = `${baseUrl}/api/agent-inventory/submit?customerId=${customerId}&key=${customer.agentKey}`;

  // Detect OS từ user-agent nếu không có query param
  let os = osParam.toLowerCase();
  if (!os) {
    const ua = (req.headers.get("user-agent") || "").toLowerCase();
    if (ua.includes("linux")) os = "linux";
    else if (ua.includes("mac") || ua.includes("darwin")) os = "mac";
    else os = "windows";
  }

  // Tạo script
  let script: string;
  let filename: string;
  const safeName = customer.name?.replace(/[^a-zA-Z0-9]/g, "_") || "inventory";

  if (modeParam === "simple") {
    // PowerShell nhanh, không cần GLPI Agent
    script = createSimpleWindowsScript(agentUrl);
    filename = `crm-agent-${safeName}.bat`;
  } else if (os === "linux") {
    script = createLinuxScript(agentUrl);
    filename = `crm-agent-${safeName}.sh`;
  } else if (os === "mac") {
    script = createMacScript(agentUrl);
    filename = `crm-agent-${safeName}.sh`;
  } else {
    // Windows + GLPI Agent (mặc định)
    script = createGlpiWindowsScript(agentUrl);
    filename = `crm-agent-${safeName}.bat`;
  }

  return new Response(script, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
