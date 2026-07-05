import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const VERSION = "1.18";

/** Simple Windows: PowerShell thuần, không cần tải GLPI Agent */
// agentUrl da duoc escape & -> ^& (batch-safe) truoc khi goi ham nay
function createSimpleScript(agentUrl: string): string {
  const lines: string[] = [
    `@echo off`,
    `chcp 65001 >nul`,
    `title CRM Agent - Quick Inventory`,
    `cd /d "%~dp0"`,
    ``,
    `set "CRM_URL=${agentUrl}"`,
    `set "PS_SCRIPT=%temp%\\crm-agent.ps1"`,
    ``,
    `echo ============================================`,
    `echo   CRM Agent - Quick Inventory`,
    `echo ============================================`,
    `echo.`,
    `echo Collecting system info...`,
    ``,
    `echo $ErrorActionPreference = 'Stop' > "%PS_SCRIPT%"`,
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
    `echo   $json = $body ^| ConvertTo-Json -Depth 10 -Compress >> "%PS_SCRIPT%"`,
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

/** Windows .bat: tải GLPI Agent → --local --json --full → POST */
function createGlpiBat(agentUrl: string, winZipUrl: string): string {
  return `@echo off
chcp 65001 >nul
title CRM Agent (GLPI Agent)
setlocal enabledelayedexpansion
cd /d "%~dp0"

set "CRM_URL=${agentUrl}"
set "AGENT_VERSION=${VERSION}"
set "AGENT_ZIP_URL=${winZipUrl}"
set "TEMP_DIR=glpi-agent-temp"
set "AGENT_EXE="
set "LOG_FILE=crm-agent-%COMPUTERNAME%.log"

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

:: Check system-wide installation truoc (GLPI Agent da duoc cai dat)
echo Checking system installation...
where glpi-agent.bat 2>nul
if %errorlevel% equ 0 (
    for /f "delims=" %%f in ('where glpi-agent.bat 2^>nul') do set "AGENT_EXE=%%f"
)
if not defined AGENT_EXE (
    if exist "C:\Program Files\GLPI-Agent\glpi-agent.bat" set "AGENT_EXE=C:\Program Files\GLPI-Agent\glpi-agent.bat"
)
if not defined AGENT_EXE (
    if exist "C:\Program Files (x86)\GLPI-Agent\glpi-agent.bat" set "AGENT_EXE=C:\Program Files (x86)\GLPI-Agent\glpi-agent.bat"
)
if not defined AGENT_EXE (
    if exist "%ProgramFiles%\GLPI-Agent\glpi-agent.bat" set "AGENT_EXE=%ProgramFiles%\GLPI-Agent\glpi-agent.bat"
)
if defined AGENT_EXE (
    echo Found installed: !AGENT_EXE!
    echo Found installed: !AGENT_EXE! >> "%LOG_FILE%"
    goto :run_agent
)

:: Check cache (GLPI Agent portable da duoc tai truoc do)
for /f "delims=" %%f in ('dir /s /b "%TEMP_DIR%\\glpi-agent.bat" 2^>nul') do set "AGENT_EXE=%%f"
if not defined AGENT_EXE (
  for /f "delims=" %%f in ('dir /s /b "%TEMP_DIR%\\glpi-agent.pl" 2^>nul') do set "AGENT_EXE=%%f"
)
if defined AGENT_EXE (
    echo Found cached: !AGENT_EXE!
    echo Found cached: !AGENT_EXE! >> "%LOG_FILE%"
    goto :run_agent
)

if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"

echo Downloading GLPI Agent %AGENT_VERSION% (31MB) - please wait...
echo Downloading %AGENT_ZIP_URL% >> "%LOG_FILE%"

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

ping -n 4 127.0.0.1 >nul 2>&1

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

powershell -Command "$c = Get-Content -Raw '!JSON_FILE!'; try { Invoke-WebRequest -Uri '%CRM_URL%' -Method POST -ContentType 'application/json' -Body $c -UseBasicParsing | ForEach-Object { $_.StatusCode } } catch { Write-Output 'FAIL:' $_.Exception.Message }" 2>>"%LOG_FILE%"
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

/** Linux .sh */
function createLinuxScript(agentUrl: string, appImageUrl: string): string {
  return `#!/bin/bash
echo "=== CRM - GLPI Agent Inventory (Linux) ==="
echo ""

CRM_URL="${agentUrl}"
AGENT_VERSION="${VERSION}"
APPIMAGE_URL="${appImageUrl}"
CACHE_DIR="\\$HOME/.cache/crm-agent"
AGENT_DIR="\\$CACHE_DIR/agent"
OUTPUT_DIR="\\$CACHE_DIR/output-\\$(date +%Y%m%d-%H%M%S)"
HOSTNAME_FQDN=$(hostname -f 2>/dev/null || hostname)

echo "[1/3] Kiem tra GLPI Agent..."
mkdir -p "\\$AGENT_DIR" "\\$OUTPUT_DIR"

AGENT=$(which glpi-agent 2>/dev/null || which glpi-agent.pl 2>/dev/null || echo "")
if [ -z "\\$AGENT" ] && [ -f "\\$AGENT_DIR/glpi-agent.AppImage" ]; then
    AGENT="\\$AGENT_DIR/glpi-agent.AppImage"
    chmod +x "\\$AGENT" 2>/dev/null
fi

if [ -z "\\$AGENT" ]; then
    echo "Dang tai GLPI Agent \\$AGENT_VERSION..."
    (command -v curl >/dev/null && curl -fSL -o "\\$AGENT_DIR/agent-download" "\\$APPIMAGE_URL") || \
    (command -v wget >/dev/null && wget -O "\\$AGENT_DIR/agent-download" "\\$APPIMAGE_URL")
    if [ -f "\\$AGENT_DIR/agent-download" ]; then
        mv "\\$AGENT_DIR/agent-download" "\\$AGENT_DIR/glpi-agent.AppImage"
        chmod +x "\\$AGENT_DIR/glpi-agent.AppImage"
        AGENT="\\$AGENT_DIR/glpi-agent.AppImage"
    fi
fi

if [ -z "\\$AGENT" ]; then
    echo "LOI: Khong the tai GLPI Agent."
    exit 1
fi

echo ""
echo "[2/3] Dang thu thap..."
"\\$AGENT" --local "\\$OUTPUT_DIR" --json --full --no-ssl-check 2>&1

JSON_FILE=$(find "\\$OUTPUT_DIR" -maxdepth 1 -type f \\\\( -name "*.json" -o ! -name "*.*" \\\\) 2>/dev/null | head -1)
if [ -n "\\$JSON_FILE" ]; then
    echo ""
    echo "[3/3] Dang gui len CRM..."
    curl -s -X POST -H "Content-Type: application/json" -d @"\\$JSON_FILE" "\\$CRM_URL" --max-time 60
    echo ""
    echo "Hoan tat!"
    rm -f "\\$JSON_FILE" 2>/dev/null
else
    echo "LOI: Khong tim thay file ket qua."
fi
echo "";
`;
}

/** macOS .sh */
function createMacScript(agentUrl: string, pkgUrl: string): string {
  return `#!/bin/bash
echo "=== CRM - GLPI Agent Inventory (macOS) ==="
echo ""

CRM_URL="${agentUrl}"
AGENT_VERSION="${VERSION}"
PKG_URL="${pkgUrl}"
CACHE_DIR="\\$HOME/.cache/crm-agent"
AGENT_DIR="\\$CACHE_DIR/agent"
OUTPUT_DIR="\\$CACHE_DIR/output-\\$(date +%Y%m%d-%H%M%S)"

echo "[1/3] Kiem tra GLPI Agent..."
mkdir -p "\\$AGENT_DIR" "\\$OUTPUT_DIR"

AGENT=$(which glpi-agent 2>/dev/null || which glpi-agent.pl 2>/dev/null || echo "")
if [ -z "\\$AGENT" ] && [ -f "\\$AGENT_DIR/glpi-agent" ]; then
    AGENT="\\$AGENT_DIR/glpi-agent"
fi

if [ -z "\\$AGENT" ]; then
    echo "Dang tai GLPI Agent \\$AGENT_VERSION..."
    (command -v curl >/dev/null && curl -fSL -o "\\$AGENT_DIR/agent.pkg" "\\$PKG_URL") || \
    (command -v wget >/dev/null && wget -O "\\$AGENT_DIR/agent.pkg" "\\$PKG_URL")
    if [ -f "\\$AGENT_DIR/agent.pkg" ]; then
        sudo installer -pkg "\\$AGENT_DIR/agent.pkg" -target /
        AGENT=$(which glpi-agent 2>/dev/null || which glpi-agent.pl 2>/dev/null || echo "")
    fi
fi

if [ -z "\\$AGENT" ]; then
    echo "LOI: Khong the cai dat GLPI Agent."
    exit 1
fi

echo ""
echo "[2/3] Dang thu thap..."
"\\$AGENT" --local "\\$OUTPUT_DIR" --json --full 2>&1

JSON_FILE=$(find "\\$OUTPUT_DIR" -maxdepth 1 -type f \\\\( -name "*.json" -o ! -name "*.*" \\\\) 2>/dev/null | head -1)
if [ -n "\\$JSON_FILE" ]; then
    echo ""
    echo "[3/3] Dang gui len CRM..."
    curl -s -X POST -H "Content-Type: application/json" -d @"\\$JSON_FILE" "\\$CRM_URL" --max-time 60
    echo ""
    echo "Hoan tat!"
    rm -f "\\$JSON_FILE" 2>/dev/null
else
    echo "LOI: Khong tim thay file ket qua."
fi
echo "";
`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const { customerId } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, agentKey: true, agentEnabled: true },
  });

  if (!customer) return new Response("Customer not found", { status: 404 });
  if (!customer.agentEnabled) return new Response("Agent disabled", { status: 403 });

  const reqUrl = new URL(req.url);
  const mode = reqUrl.searchParams.get("mode") || "glpi";
  let osParam = reqUrl.searchParams.get("os") || "";

  const host = req.headers.get("host") || reqUrl.host;
  const proto = req.headers.get("x-forwarded-proto") || reqUrl.protocol.replace(":", "");
  const baseUrl = `${proto}://${host}`;
  const agentUrl = `${baseUrl}/api/agent-inventory/submit?customerId=${customerId}&key=${customer.agentKey}`;

  // OS detection
  if (!osParam) {
    const ua = (req.headers.get("user-agent") || "").toLowerCase();
    if (ua.includes("linux")) osParam = "linux";
    else if (ua.includes("mac") || ua.includes("darwin")) osParam = "mac";
    else osParam = "windows";
  }

  const winZipUrl = `https://github.com/glpi-project/glpi-agent/releases/download/${VERSION}/GLPI-Agent-${VERSION}-x64.zip`;

  let script: string;
  const ext = osParam === "windows" ? "bat" : "sh";
  const filename = `agent_${customerId}.${ext}`;

  // batchSafe: ^& d? batch kh?ng c?t URL ? & khi set CRM_URL
  const batchSafeUrl = agentUrl.replace(/&/g, "^&");

  if (mode === "simple") {
    script = createSimpleScript(batchSafeUrl);
  } else if (osParam === "linux") {
    const appImageUrl = `https://github.com/glpi-project/glpi-agent/releases/download/${VERSION}/glpi-agent-${VERSION}-x86_64.AppImage`;
    script = createLinuxScript(agentUrl, appImageUrl);
  } else if (osParam === "mac") {
    const pkgUrl = `https://github.com/glpi-project/glpi-agent/releases/download/${VERSION}/GLPI-Agent-${VERSION}_x86_64.pkg`;
    script = createMacScript(agentUrl, pkgUrl);
  } else {
    script = createGlpiBat(batchSafeUrl, winZipUrl);
  }

  return new Response(script, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
