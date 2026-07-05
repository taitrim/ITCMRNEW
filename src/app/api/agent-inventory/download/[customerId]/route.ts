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

:: === Buoc 2: Chay GLPI Agent (co timeout tranh bi treo) ===
:run_agent
echo.
echo ============================================
echo   [2/3] THU THAP THIET BI
echo ============================================
echo. >> "%LOG_FILE%"
echo ============================================ >> "%LOG_FILE%"
echo   [2/3] THU THAP THIET BI >> "%LOG_FILE%"
echo ============================================ >> "%LOG_FILE%"

set "BASE_DIR=%~dp0"
set "OUTPUT_DIR=%BASE_DIR%%TEMP_DIR%\\output"

:: Xoa output cu
if exist "%OUTPUT_DIR%" rmdir /s /q "%OUTPUT_DIR%" >nul 2>&1
mkdir "%OUTPUT_DIR%" >nul 2>&1

cd /d "%BASE_DIR%"
echo Dang chay GLPI Agent (toi da 120 giay)...
echo [2/3] Running: !AGENT_EXE! >> "%LOG_FILE%"

:: Chay agent trong cua so rieng (de kill neu bi treo boi RemoteInventory)
start "GLPI-Agent-CRM" /MIN cmd /c ""!AGENT_EXE!" --local "%OUTPUT_DIR%" --json --full --logfile "%CD%\\agent-log.txt"" >nul 2>"%CD%\\agent-err.log"

:: Doi file ket qua xuat hien (toi da 120 giay)
set "TIMEOUT_SEC=120"
set /a "ELAPSED=0"
set "JSON_FILE="

:wait_loop
if !ELAPSED! geq %TIMEOUT_SEC% goto :agent_timeout
ping -n 2 127.0.0.1 >nul
set /a "ELAPSED+=1"
for /f "delims=" %%f in ('dir /b "%OUTPUT_DIR%" 2^>nul') do (
    if not defined JSON_FILE set "JSON_FILE=%OUTPUT_DIR%\\%%f"
)
if not defined JSON_FILE goto :wait_loop

:: === File tim thay, kill agent ===
taskkill /f /fi "WINDOWTITLE eq GLPI-Agent-CRM" >nul 2>&1
ping -n 2 127.0.0.1 >nul
echo GLPI Agent da tao file: !JSON_FILE!
echo File: !JSON_FILE! >> "%LOG_FILE%"
goto :agent_done

:agent_timeout
echo.
echo [LOI] GLPI Agent khong tao file trong %TIMEOUT_SEC% giay.
echo [LOI] Timeout %TIMEOUT_SEC%s >> "%LOG_FILE%"
taskkill /f /fi "WINDOWTITLE eq GLPI-Agent-CRM" >nul 2>&1
taskkill /f /im perl.exe >nul 2>&1
:: Kiem tra lai file sau kill
for /f "delims=" %%f in ('dir /b "%OUTPUT_DIR%" 2^>nul') do (
    if not defined JSON_FILE set "JSON_FILE=%OUTPUT_DIR%\\%%f"
)
if defined JSON_FILE (
    echo File tim thay sau kill: !JSON_FILE!
    echo File (after kill): !JSON_FILE! >> "%LOG_FILE%"
    goto :agent_done
)
if exist agent-log.txt (
    echo Agent log:
    type agent-log.txt
    type agent-log.txt >> "%LOG_FILE%"
)
echo Cac file trong output:
dir /s "%OUTPUT_DIR%" 2>nul
dir /s "%OUTPUT_DIR%" >> "%LOG_FILE%" 2>&1
goto :end

:agent_done
echo.
echo ============================================
echo   [3/3] GUI DU LIEU LEN CRM
echo ============================================
echo. >> "%LOG_FILE%"
echo ============================================ >> "%LOG_FILE%"
echo   [3/3] Gui len CRM >> "%LOG_FILE%"
echo ============================================ >> "%LOG_FILE%"

echo Dang doc file va gui...
echo [3/3] Reading file !JSON_FILE! >> "%LOG_FILE%"

:: GLPI Agent output co wrapper: { action, deviceid, content: { hardware, bios, ... }, itemtype }
:: Lay $p.content la data that, $p.deviceid la deviceid tu Agent
:: Khong wrap lai action/deviceid nua -> POST { action='inventory', deviceid, content }
powershell -Command "$c = Get-Content -Raw '!JSON_FILE!' -ErrorAction Stop; $p = $c | ConvertFrom-Json; $inv = if ($p.content) { $p.content } else { $p }; $did = if ($p.deviceid) { $p.deviceid } else { ($p.hardware.name)+'-'+($p.bios.sserial) }; Write-Output 'Thiet bi: ' $did; $body = @{ action='inventory'; deviceid=$did; content=$inv } | ConvertTo-Json -Depth 15 -Compress; Write-Output 'Dang gui...'; try { $r = Invoke-WebRequest -Uri '%CRM_URL%' -Method POST -ContentType 'application/json' -Body $body -UseBasicParsing -TimeoutSec 30; if ($r.StatusCode -eq 200 -or $r.StatusCode -eq 201) { Write-Output 'CRM: ' $r.StatusCode; Write-Output 'GUI THANH CONG!' } else { Write-Output 'CRM: ' $r.StatusCode } } catch { Write-Output 'LOI GUI: ' $_.Exception.Message }" 2>>"%LOG_FILE%"

echo POST done >> "%LOG_FILE%"
echo.
echo ============================================
echo   HOAN TAT
echo   Log: %CD%\%LOG_FILE%
echo ============================================
echo.
echo Nhan phim bat ky de thoat...
pause >nul
goto :eof

:end
echo.
echo ============================================
echo   THAT BAI - %DATE% %TIME%
echo   Log: %CD%\%LOG_FILE%
echo ============================================
echo.
echo Nhan phim bat ky de thoat...
pause >nul`;
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

  // ^& cho echo (simple .ps1), real & cho powershell -Command "..." (GLPI bat)
  // vì batch coi & la literal ben trong double quote
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
    // GLPI bat: URL dung trong powershell -Command "...", & la literal trong double quote
    script = createGlpiBat(agentUrl, winZipUrl);
  }

  return new Response(script, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
