import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const GLPI_AGENT_VERSION = "1.9";

/* ===== GLPI Agent Scripts =====
 *
 * Hỗ trợ 3 OS: Windows (.bat), Linux (.sh), macOS (.sh).
 * Mỗi script tải GLPI Agent portable → chạy --local --json --full → POST JSON lên CRM.
 *
 * Fallback mode=simple: PowerShell thuần, không cần GLPI Agent.
 */

/** Simple Windows: PowerShell thuần, không tải GLPI Agent */
function createSimpleWindowsScript(agentUrl: string): string {
  // URL với real & cho PowerShell (trong file .ps1 thì & là ký tự bình thường)
  const urlForPs = agentUrl;
  // URL với ^& cho echo trong batch (^& = literal & trong echo output)
  const batchSafeUrl = agentUrl.replace(/&/g, "^&");

  return `@echo off
chcp 65001 >nul
title CRM Agent - Quick Inventory
cd /d "%~dp0"

set "PS_SCRIPT=%temp%\\crm-agent-${Date.now()}.ps1"

echo ============================================
echo   CRM Agent - Thu thap nhanh (PowerShell)
echo ============================================
echo.

:: Tao PowerShell script
echo $ErrorActionPreference = 'Stop' > "%PS_SCRIPT%"
echo try { >> "%PS_SCRIPT%"
echo $h = $env:COMPUTERNAME >> "%PS_SCRIPT%"
echo   $cpu = (Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue ^| Select-Object -First 1).Name >> "%PS_SCRIPT%"
echo   $ram = [math]::Round((Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue).TotalPhysicalMemory / 1MB, 0^) >> "%PS_SCRIPT%"
echo   $serial = (Get-CimInstance Win32_BIOS -ErrorAction SilentlyContinue).SerialNumber >> "%PS_SCRIPT%"
echo   $mfr = (Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue).Manufacturer >> "%PS_SCRIPT%"
echo   $mdl = (Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue).Model >> "%PS_SCRIPT%"
echo   $ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue ^| Where-Object { $_.InterfaceAlias -ne 'Loopback Pseudo-Interface 1' } ^| Select-Object -First 1^).IPAddress >> "%PS_SCRIPT%"
echo   $mac = (Get-NetAdapter -ErrorAction SilentlyContinue ^| Where-Object { $_.Status -eq 'Up' } ^| Select-Object -First 1^).MacAddress >> "%PS_SCRIPT%"
echo   $os = (Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue).Caption >> "%PS_SCRIPT%"
echo   $user = $env:USERNAME >> "%PS_SCRIPT%"
echo   $disk = [math]::Round(((Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' -ErrorAction SilentlyContinue ^| Measure-Object -Property Size -Sum^).Sum / 1GB^), 0^) >> "%PS_SCRIPT%"
echo   $ch = 'Desktop' >> "%PS_SCRIPT%"
echo   $enc = Get-CimInstance Win32_SystemEnclosure -ErrorAction SilentlyContinue ^| Select-Object -First 1 >> "%PS_SCRIPT%"
echo   if ($enc -and ($enc.ChassisTypes -contains 10 -or $enc.ChassisTypes -contains 11 -or $enc.ChassisTypes -contains 12 -or $enc.ChassisTypes -contains 14^)) { $ch = 'Laptop' } >> "%PS_SCRIPT%"
echo   $body = @{ >> "%PS_SCRIPT%"
echo     action = 'inventory' >> "%PS_SCRIPT%"
echo     deviceid = "$h-$serial" >> "%PS_SCRIPT%"
echo     content = @{ >> "%PS_SCRIPT%"
echo       hardware = @{ name = $h; chassis_type = $ch; memory = $ram; uuid = $serial; lastloggeduser = $user } >> "%PS_SCRIPT%"
echo       bios = @{ smanufacturer = $mfr; smodel = $mdl; sserial = $serial } >> "%PS_SCRIPT%"
echo       operatingsystem = @{ name = 'Windows'; full_name = $os } >> "%PS_SCRIPT%"
echo       cpus = @(@{ name = $cpu }) >> "%PS_SCRIPT%"
echo       storages = @(@{ disksize = ($disk * 1024^) }) >> "%PS_SCRIPT%"
echo       networks = @(@{ ipaddress = $ip; macaddr = $mac }) >> "%PS_SCRIPT%"
echo       users = @(@{ LOGIN = $user }) >> "%PS_SCRIPT%"
echo     } >> "%PS_SCRIPT%"
echo   } >> "%PS_SCRIPT%"
echo   $json = $body ^| ConvertTo-Json -Depth 10 -Compress >> "%PS_SCRIPT%"
echo   Write-Output "" >> "%PS_SCRIPT%"
echo   Write-Output "May: $h" >> "%PS_SCRIPT%"
echo   Write-Output "CPU: $cpu" >> "%PS_SCRIPT%"
echo   Write-Output "RAM: $ram MB" >> "%PS_SCRIPT%"
echo   Write-Output "Serial: $serial" >> "%PS_SCRIPT%"
echo   Write-Output "" >> "%PS_SCRIPT%"
echo   Write-Output "Dang gui len CRM..." >> "%PS_SCRIPT%"
echo   $jsonBody = $body ^| ConvertTo-Json -Depth 10 -Compress >> "%PS_SCRIPT%"
echo   Invoke-RestMethod -Uri '${batchSafeUrl}' -Method POST -Body $jsonBody -ContentType 'application/json' -TimeoutSec 30 ^| Out-Null >> "%PS_SCRIPT%"
echo   Write-Output "Hoan tat!" >> "%PS_SCRIPT%"
echo } catch { >> "%PS_SCRIPT%"
echo   Write-Output "LOI: $_" >> "%PS_SCRIPT%"
echo   exit 1 >> "%PS_SCRIPT%"
echo } >> "%PS_SCRIPT%"

echo Dang thu thap thong tin...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%"
del "%PS_SCRIPT%" >nul 2>&1

if %errorlevel% neq 0 echo Co loi xay ra!
echo.
pause
`;
}

/** Windows .bat: tải GLPI Agent → chạy --local --json --full → POST */
function createGlpiWindowsScript(agentUrl: string): string {
  const batchSafeUrl = agentUrl.replace(/&/g, "^&");
  const urlForPs = agentUrl.replace(/'/g, "''"); // escape single quote for PS
  const winZipUrl = `https://github.com/glpi-project/glpi-agent/releases/download/${GLPI_AGENT_VERSION}/GLPI-Agent-${GLPI_AGENT_VERSION}-x64.zip`;

  return `@echo off
chcp 65001 >nul
title CRM Agent - GLPI Agent Inventory
cd /d "%~dp0"

set "CRM_URL=${batchSafeUrl}"
set "AGENT_ZIP_URL=${winZipUrl}"
set "AGENT_DIR=%~dp0glpi-agent"
set "LOG_FILE=agent-log-%COMPUTERNAME%.txt"

echo ============================================
echo   CRM Agent - GLPI Agent Inventory
echo ============================================
echo.
echo Log file: %LOG_FILE%
echo.
echo Step 1/3: Kiem tra GLPI Agent...

:: Check if already installed
if exist "%AGENT_DIR%\\glpi-agent.bat" set "AGENT_EXE=%AGENT_DIR%\\glpi-agent.bat"
if exist "%AGENT_DIR%\\glpi-agent.pl" set "AGENT_EXE=%AGENT_DIR%\\glpi-agent.pl"

if defined AGENT_EXE (
    echo Found: %AGENT_EXE%
    goto :run_agent
)

:: Download
echo Dang tai GLPI Agent v${GLPI_AGENT_VERSION}...
if not exist "%AGENT_DIR%" mkdir "%AGENT_DIR%"

curl -fSL --progress-bar -o "%AGENT_DIR%\\agent.zip" "%AGENT_ZIP_URL%"
if %errorlevel% neq 0 (
    echo curl khong co, dung PowerShell...
    powershell -Command "Invoke-WebRequest -Uri '%AGENT_ZIP_URL%' -OutFile '%AGENT_DIR%\\agent.zip'"
)

if not exist "%AGENT_DIR%\\agent.zip" (
    echo.
    echo === KET THUC - LOI ===
    echo Khong the tai GLPI Agent.
    echo Kiem tra ket noi internet hoac tai thu cong:
    echo %AGENT_ZIP_URL%
    echo.
    pause
    exit /b 1
)

:: Extract
echo Giai nen...
powershell -Command "Expand-Archive -Path '%AGENT_DIR%\\agent.zip' -DestinationPath '%AGENT_DIR%' -Force"
del "%AGENT_DIR%\\agent.zip" >nul 2>&1

:: Find agent executable
if exist "%AGENT_DIR%\\glpi-agent.bat" set "AGENT_EXE=%AGENT_DIR%\\glpi-agent.bat"
if exist "%AGENT_DIR%\\glpi-agent.pl" set "AGENT_EXE=%AGENT_DIR%\\glpi-agent.pl"
if exist "%AGENT_DIR%\\bin\\glpi-agent.bat" set "AGENT_EXE=%AGENT_DIR%\\bin\\glpi-agent.bat"
if exist "%AGENT_DIR%\\bin\\glpi-agent.pl" set "AGENT_EXE=%AGENT_DIR%\\bin\\glpi-agent.pl"

if not defined AGENT_EXE (
    echo.
    echo === KET THUC - LOI ===
    echo Khong tim thay GLPI Agent sau khi giai nen.
    echo.
    dir /s "%AGENT_DIR%"
    echo.
    pause
    exit /b 1
)
echo Agent: %AGENT_EXE%

:: === Step 2: Run GLPI Agent ===
:run_agent
echo.
echo Step 2/3: Dang thu thap (co the mat ~1 phut)...

set "OUTPUT_DIR=%AGENT_DIR%\\output"
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

"%AGENT_EXE%" --local "%OUTPUT_DIR%" --json --full --logfile "%LOG_FILE%"
set "EXIT_CODE=%ERRORLEVEL%"
echo Agent thoat: %EXIT_CODE%

:: Wait for file flush
ping -n 3 127.0.0.1 >nul 2>&1

:: Find JSON output
set "JSON_FILE="
for %%f in ("%OUTPUT_DIR%\\*.json") do set "JSON_FILE=%%f"

if not defined JSON_FILE (
    echo.
    echo === KET THUC - LOI ===
    echo Khong tim thay file ket qua tu GLPI Agent.
    echo.
    if exist "%LOG_FILE%" type "%LOG_FILE%"
    dir /s "%OUTPUT_DIR%"
    echo.
    pause
    exit /b 1
)
echo Ket qua: %JSON_FILE%

:: === Step 3: Send to CRM ===
echo.
echo Step 3/3: Dang gui len CRM...

:: Read JSON file and POST using PowerShell
powershell -ExecutionPolicy Bypass -Command "
    $json = Get-Content -Raw '%AGENT_DIR%\\output\\*' -ErrorAction Stop;
    Write-Output 'Sending...';
    Invoke-RestMethod -Uri '${urlForPs}' -Method POST -ContentType 'application/json' -Body $json -TimeoutSec 60 | Out-Null;
    Write-Output 'CRM OK'
"
if %errorlevel% equ 0 (echo Gui thanh cong!) else (echo Gui that bai, xem log)

:: Cleanup
del "%JSON_FILE%" >nul 2>&1

echo.
echo ============================================
echo   HOAN TAT - %DATE% %TIME%
echo   Log: %CD%\%LOG_FILE%
echo ============================================
echo.
pause
`;
}

/** Linux .sh script */
function createLinuxScript(agentUrl: string): string {
  const appImageUrl = `https://github.com/glpi-project/glpi-agent/releases/download/${GLPI_AGENT_VERSION}/glpi-agent-${GLPI_AGENT_VERSION}-x86_64.AppImage`;

  return `#!/bin/bash
echo "=== CRM Agent - GLPI Agent (Linux) ==="
echo ""

CRM_URL="${agentUrl}"
APPIMAGE_URL="${appImageUrl}"
CACHE_DIR="$HOME/.cache/crm-agent"
AGENT_DIR="$CACHE_DIR/agent"
OUTPUT_DIR="$CACHE_DIR/output-$(date +%Y%m%d-%H%M%S)"

echo "[1/3] Kiem tra GLPI Agent..."
mkdir -p "$AGENT_DIR" "$OUTPUT_DIR"

AGENT=$(which glpi-agent 2>/dev/null || which glpi-agent.pl 2>/dev/null || echo "")
if [ -z "$AGENT" ] && [ -f "$AGENT_DIR/glpi-agent.AppImage" ]; then
    AGENT="$AGENT_DIR/glpi-agent.AppImage"
    chmod +x "$AGENT" 2>/dev/null
fi

if [ -z "$AGENT" ]; then
    echo "Dang tai GLPI Agent..."
    (command -v curl >/dev/null && curl -fSL -o "$AGENT_DIR/glpi-agent.AppImage" "$APPIMAGE_URL") || \
    (command -v wget >/dev/null && wget -O "$AGENT_DIR/glpi-agent.AppImage" "$APPIMAGE_URL")
    if [ -f "$AGENT_DIR/glpi-agent.AppImage" ]; then
        chmod +x "$AGENT_DIR/glpi-agent.AppImage"
        AGENT="$AGENT_DIR/glpi-agent.AppImage"
    fi
fi

if [ -z "$AGENT" ]; then
    echo "LOI: Khong the tai GLPI Agent."
    exit 1
fi
echo "Agent: $AGENT"

echo ""
echo "[2/3] Dang thu thap..."
"$AGENT" --local "$OUTPUT_DIR" --json --full --logfile agent-log.txt 2>&1
sleep 2

echo ""
echo "[3/3] Dang gui len CRM..."
JSON_FILE=$(find "$OUTPUT_DIR" -name "*.json" -type f 2>/dev/null | head -1)
if [ -z "$JSON_FILE" ]; then
    echo "LOI: Khong co file ket qua."
    [ -f agent-log.txt ] && cat agent-log.txt
    exit 1
fi
echo "File: $JSON_FILE"

if command -v curl >/dev/null; then
    curl -s -X POST "$CRM_URL" -H "Content-Type: application/json" -d @"$JSON_FILE"
elif command -v wget >/dev/null; then
    wget -q -O- --post-file="$JSON_FILE" --header="Content-Type: application/json" "$CRM_URL"
fi
echo ""
echo "Hoan tat!"
rm -f "$JSON_FILE" agent-log.txt 2>/dev/null
echo "";
`;
}

/** macOS .sh script */
function createMacScript(agentUrl: string): string {
  const pkgUrl = `https://github.com/glpi-project/glpi-agent/releases/download/${GLPI_AGENT_VERSION}/GLPI-Agent-${GLPI_AGENT_VERSION}_x86_64.pkg`;

  return `#!/bin/bash
echo "=== CRM Agent - GLPI Agent (macOS) ==="
echo ""

CRM_URL="${agentUrl}"
PKG_URL="${pkgUrl}"
CACHE_DIR="$HOME/.cache/crm-agent"
AGENT_DIR="$CACHE_DIR/agent"
OUTPUT_DIR="$CACHE_DIR/output-$(date +%Y%m%d-%H%M%S)"

echo "[1/3] Kiem tra GLPI Agent..."
mkdir -p "$AGENT_DIR" "$OUTPUT_DIR"

AGENT=$(which glpi-agent 2>/dev/null || which glpi-agent.pl 2>/dev/null || echo "")

if [ -z "$AGENT" ]; then
    echo "Dang tai va cai dat GLPI Agent..."
    (command -v curl >/dev/null && curl -fSL -o "$AGENT_DIR/agent.pkg" "$PKG_URL") || \
    (command -v wget >/dev/null && wget -O "$AGENT_DIR/agent.pkg" "$PKG_URL")
    if [ -f "$AGENT_DIR/agent.pkg" ]; then
        echo "Dang cai dat (can quyen admin)..."
        sudo installer -pkg "$AGENT_DIR/agent.pkg" -target / 2>/dev/null
        AGENT=$(which glpi-agent 2>/dev/null || which glpi-agent.pl 2>/dev/null || echo "")
    fi
fi

if [ -z "$AGENT" ]; then
    echo "LOI: Khong the cai dat GLPI Agent."
    exit 1
fi
echo "Agent: $AGENT"

echo ""
echo "[2/3] Dang thu thap..."
"$AGENT" --local "$OUTPUT_DIR" --json --full --logfile agent-log.txt 2>&1
sleep 2

echo ""
echo "[3/3] Dang gui len CRM..."
JSON_FILE=$(find "$OUTPUT_DIR" -name "*.json" -type f 2>/dev/null | head -1)
if [ -z "$JSON_FILE" ]; then
    echo "LOI: Khong co file ket qua."
    [ -f agent-log.txt ] && cat agent-log.txt
    exit 1
fi

if command -v curl >/dev/null; then
    curl -s -X POST "$CRM_URL" -H "Content-Type: application/json" -d @"$JSON_FILE"
elif command -v wget >/dev/null; then
    wget -q -O- --post-file="$JSON_FILE" --header="Content-Type: application/json" "$CRM_URL"
fi
echo ""
echo "Hoan tat!"
rm -f "$JSON_FILE" agent-log.txt 2>/dev/null
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

  const reqUrl = new URL(req.url);
  const modeParam = reqUrl.searchParams.get("mode") || "glpi";
  let osParam = reqUrl.searchParams.get("os") || "";

  // Build URL cho agent POST: customerId + agentKey làm query params
  const host = req.headers.get("host") || reqUrl.host;
  const proto = req.headers.get("x-forwarded-proto") || reqUrl.protocol.replace(":", "");
  const baseUrl = `${proto}://${host}`;
  const agentUrl = `${baseUrl}/api/agent-inventory/submit?customerId=${customerId}&key=${customer.agentKey}`;

  // Detect OS từ user-agent nếu không có query param
  if (!osParam) {
    const ua = (req.headers.get("user-agent") || "").toLowerCase();
    if (ua.includes("linux")) osParam = "linux";
    else if (ua.includes("mac") || ua.includes("darwin")) osParam = "mac";
    else osParam = "windows";
  }

  const os = osParam;

  // Tạo script
  let script: string;
  const ext = os === "windows" ? "bat" : "sh";
  const filename = `agent_${customerId}.${ext}`;

  if (modeParam === "simple") {
    script = createSimpleWindowsScript(agentUrl);
  } else if (os === "linux") {
    script = createLinuxScript(agentUrl);
  } else if (os === "mac") {
    script = createMacScript(agentUrl);
  } else {
    script = createGlpiWindowsScript(agentUrl);
  }

  return new Response(script, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
