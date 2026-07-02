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
  const linuxAppImageUrl = `https://github.com/glpi-project/glpi-agent/releases/download/${version}/glpi-agent-${version}-x86_64.AppImage`;
  const linuxInstallerUrl = `https://github.com/glpi-project/glpi-agent/releases/download/${version}/glpi-agent-${version}-linux-installer.pl`;
  const macPkgUrl = `https://github.com/glpi-project/glpi-agent/releases/download/${version}/GLPI-Agent-${version}_x86_64.pkg`;

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

:: Dung absolute path de tranh loi working directory
set "BASE_DIR=%~dp0"
set "OUTPUT_PARENT=%BASE_DIR%%TEMP_DIR%\\output"
if not exist "%OUTPUT_PARENT%" mkdir "%OUTPUT_PARENT%" >nul 2>&1

echo Dang chay GLPI Agent (co the mat ~1 phut)...
cd /d "%BASE_DIR%"
"!AGENT_EXE!" --local "%OUTPUT_PARENT%" --json --full --no-ssl-check --logfile agent-log.txt
set "EXIT_CODE=%ERRORLEVEL%"

:: Doi mot chut de agent ghi file xong
ping -n 3 127.0.0.1 >nul 2>&1

:: --full tao 1 file duy nhat (no extension) trong output parent dir
:: Tim file JSON/test cac kieu: *.json, hoac file khong co extension
set "JSON_FILE="
for /f "delims=" %%f in ('dir /b "%OUTPUT_PARENT%\\*.json" 2^>nul') do set "JSON_FILE=%OUTPUT_PARENT%\\%%f"
if not defined JSON_FILE (
    :: --full co the tao file khong co extension (ten giong dir name)
    for /f "delims=" %%f in ('dir /b /a-d "%OUTPUT_PARENT%" 2^>nul') do set "JSON_FILE=%OUTPUT_PARENT%\\%%f"
)

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
    echo.
    echo Danh sach thu muc output:
    dir /s "%OUTPUT_DIR%" 2>nul
)

if exist agent-log.txt del agent-log.txt >nul 2>&1
echo.
pause`;

  // Script Linux (sh) — dùng GLPI Agent AppImage nếu có, fallback tar.gz/installer, cuối cùng fallback manual
  const linuxShContent = `#!/bin/bash
echo "=== CRM - GLPI Agent Inventory (Linux) ==="
echo ""

CRM_URL="${agentUrl}"
AGENT_VERSION="${version}"
TEMP_DIR="/tmp/crm-agent-$$"
HOSTNAME_FQDN=$(hostname -f 2>/dev/null || hostname)
OUTPUT_DIR="$TEMP_DIR/output"

# === Buoc 1: Kiem tra / Tai GLPI Agent ===
echo "[1/3] Kiem tra GLPI Agent..."

# Tim glpi-agent da cai tren he thong
AGENT=$(which glpi-agent 2>/dev/null || which glpi-agent.pl 2>/dev/null || echo "")

if [ -z "$AGENT" ]; then
    # Tai GLPI Agent AppImage (portable, khong can cai dat — giong .zip Windows)
    ARCH=$(uname -m)
    if [ "$ARCH" = "x86_64" ]; then
        AGENT_URL="${linuxAppImageUrl}"
    else
        # ARM64 or other: dung installer Perl
        AGENT_URL="${linuxInstallerUrl}"
    fi

    echo "Dang tai GLPI Agent ${version}..."
    mkdir -p "$TEMP_DIR"

    if command -v curl &>/dev/null; then
        curl -fSL --progress-bar -o "$TEMP_DIR/agent-download" "$AGENT_URL"
    elif command -v wget &>/dev/null; then
        wget -q --show-progress -O "$TEMP_DIR/agent-download" "$AGENT_URL"
    fi

    if [ -f "$TEMP_DIR/agent-download" ]; then
        case "$AGENT_URL" in
            *.AppImage)
                mv "$TEMP_DIR/agent-download" "$TEMP_DIR/glpi-agent.AppImage"
                chmod +x "$TEMP_DIR/glpi-agent.AppImage"
                AGENT="$TEMP_DIR/glpi-agent.AppImage"
                ;;
            *linux-installer.pl)
                mv "$TEMP_DIR/agent-download" "$TEMP_DIR/linux-installer.pl"
                chmod +x "$TEMP_DIR/linux-installer.pl"
                # Installer: cai dat vao $TEMP_DIR
                perl "$TEMP_DIR/linux-installer.pl" --prefix "$TEMP_DIR/agent" 2>/dev/null
                AGENT=$(find "$TEMP_DIR" -name "glpi-agent" -type f 2>/dev/null | head -1)
                ;;
            *.tar.gz|*.tgz)
                tar xzf "$TEMP_DIR/agent-download" -C "$TEMP_DIR" 2>/dev/null
                AGENT=$(find "$TEMP_DIR" -name "glpi-agent" -type f -o -name "glpi-agent.pl" -type f 2>/dev/null | head -1)
                ;;
        esac
    fi
fi

if [ -n "$AGENT" ]; then
    echo "GLPI Agent tim thay tai: $AGENT"
    echo ""
    echo "[2/3] Dang thu thap thong tin..."

    mkdir -p "$OUTPUT_DIR"
    # Chay --full giong Windows de lay day du du lieu (users, storages, networks, etc.)
    # AppImage: goi truc tiep
    # Perl agent: goi qua perl
    case "$AGENT" in
        *.AppImage)  "$AGENT" --local "$OUTPUT_DIR" --json --full --no-ssl-check 2>&1 ;;
        *)           perl "$AGENT" --local "$OUTPUT_DIR" --json --full --no-ssl-check 2>&1 ;;
    esac

    # Tim file JSON output (--full tao 1 file, co the khong co extension)
    JSON_FILE=$(find "$OUTPUT_DIR" -maxdepth 1 -type f \\( -name "*.json" -o ! -name "*.*" \\) 2>/dev/null | head -1)

    if [ -n "$JSON_FILE" ]; then
        echo "Da thu thap xong: $JSON_FILE"
        echo ""
        echo "[3/3] Dang gui du lieu len CRM..."
        curl -s -X POST -H "Content-Type: application/json" -d @"$JSON_FILE" "$CRM_URL" --max-time 60
        echo ""
        echo "Hoan thanh!"
    else
        echo "[LOI] Khong tim thay file JSON. Thu --server..."
        case "$AGENT" in
            *.AppImage)  "$AGENT" --server "$CRM_URL" --json --no-ssl-check 2>&1 ;;
            *)           perl "$AGENT" --server "$CRM_URL" --json --no-ssl-check 2>&1 ;;
        esac
    fi
else
    echo "[CANH BAO] GLPI Agent khong the tai hoac chay."
    echo "Vui long cai GLPI Agent tu dong:"
    echo "  Debian/Ubuntu: apt install glpi-agent"
    echo "  RHEL/CentOS:   yum install glpi-agent"
    echo "  Hoac tai tai:  https://github.com/glpi-project/glpi-agent/releases"
    echo ""
    echo "Dang thu thap thong tin co ban (khong day du)..."

    # Fallback: thu thap manual tu /sys, /proc, dmidecode
    MANUFACTURER=$(cat /sys/class/dmi/id/sys_vendor 2>/dev/null || sudo dmidecode -s system-manufacturer 2>/dev/null || echo "")
    PRODUCT_NAME=$(cat /sys/class/dmi/id/product_name 2>/dev/null || sudo dmidecode -s system-product-name 2>/dev/null || echo "")
    SERIAL=$(cat /sys/class/dmi/id/product_serial 2>/dev/null || cat /sys/class/dmi/id/product_uuid 2>/dev/null || echo "")
    CHASSIS=$(cat /sys/class/dmi/id/chassis_type 2>/dev/null || echo "")
    TOTAL_MEM=$(free -m 2>/dev/null | awk '/^Mem:/{print $2}')
    CPU_NAME=$(grep 'model name' /proc/cpuinfo 2>/dev/null | head -1 | cut -d: -f2 | xargs || echo "")
    OS_NAME=$(cat /etc/os-release 2>/dev/null | grep '^PRETTY_NAME=' | cut -d'"' -f2 || uname -s)
    KERNEL=$(uname -r)

    # Logged-in users (GLPI Agent format)
    LAST_USER=$(last -w 2>/dev/null | grep -vE '^(reboot|shutdown|wtmp)' | head -1 | awk '{print $1}')
    LAST_DATE=$(last -w 2>/dev/null | grep -vE '^(reboot|shutdown|wtmp)' | head -1 | awk '{for(i=4;i<=NF-1;i++) printf $i" "; print ""}' | xargs)
    CURRENT_USERS=$(who 2>/dev/null | awk '{print $1}' | sort -u)

    # Network
    DEFAULT_GW=$(ip route 2>/dev/null | awk '/default/{print $3}' | head -1 || echo "")
    DNS_SERVERS=$(cat /etc/resolv.conf 2>/dev/null | grep '^nameserver' | awk '{print $2}' | paste -sd ',' || echo "")

    # Build flat JSON (GLPI Agent format)
    USERS_JSON=""
    for u in $CURRENT_USERS; do
        [ -n "$USERS_JSON" ] && USERS_JSON="$USERS_JSON,"
        USERS_JSON="$USERS_JSON{\\"LOGIN\\":\\"$u\\"}"
    done

    JSON_FILE="$TEMP_DIR/manual-inventory.json"
    cat > "$JSON_FILE" << ENDJSON
{
  "action": "inventory",
  "deviceid": "$HOSTNAME_FQDN-$(uname -r)",
  "content": {
    "hardware": {
      "name": "$HOSTNAME_FQDN",
      "chassis_type": "$CHASSIS",
      "memory": $TOTAL_MEM,
      "uuid": "$SERIAL",
      "defaultgateway": "$DEFAULT_GW",
      "dns": "$DNS_SERVERS",
      "lastloggeduser": "$LAST_USER",
      "datelastloggeduser": "$LAST_DATE",
      "workgroup": "",
      "vmsystem": "Physical"
    },
    "bios": {
      "smanufacturer": "$MANUFACTURER",
      "smodel": "$PRODUCT_NAME",
      "sserial": "$SERIAL"
    },
    "operatingsystem": {
      "name": "Linux",
      "kernel_name": "linux",
      "full_name": "$OS_NAME",
      "kernel_version": "$KERNEL",
      "arch": "$(uname -m)"
    },
    "cpus": [
      { "name": "$CPU_NAME" }
    ],
    "users": [$USERS_JSON]
  }
}
ENDJSON

    echo "[3/3] Dang gui du lieu len CRM..."
    curl -s -X POST -H "Content-Type: application/json" -d @"$JSON_FILE" "$CRM_URL" --max-time 60
    echo ""
    echo "Hoan thanh (co ban - khong day du nhu GLPI Agent --full)!"
fi

# Cleanup
rm -rf "$TEMP_DIR" 2>/dev/null
`;

  // Script macOS (sh) — dùng GLPI Agent --full nếu có, fallback system_profiler
  const macShContent = `#!/bin/bash
echo "=== CRM - GLPI Agent Inventory (macOS) ==="
echo ""

CRM_URL="${agentUrl}"
AGENT_VERSION="${version}"
AGENT_PKG_X86_64="${macPkgUrl}"
AGENT_PKG_ARM64="${macPkgUrl.replace(/x86_64/g, 'arm64')}"
TEMP_DIR="/tmp/crm-agent-$$"
HOSTNAME_FQDN=$(hostname)
OUTPUT_DIR="$TEMP_DIR/output"

# === Buoc 1: Kiem tra / Tai GLPI Agent ===
echo "[1/3] Kiem tra GLPI Agent..."

# Tim glpi-agent da cai (Homebrew, MacPorts, hoac manual)
AGENT=$(which glpi-agent 2>/dev/null || which glpi-agent.pl 2>/dev/null || echo "")

if [ -z "$AGENT" ]; then
    # macOS: chon PKG dung cho architecture
    ARCH=$(uname -m)
    if [ "$ARCH" = "x86_64" ]; then
        AGENT_URL="\${AGENT_PKG_X86_64}"
    elif [ "$ARCH" = "arm64" ]; then
        AGENT_URL="\${AGENT_PKG_ARM64}"
    else
        AGENT_URL="\${AGENT_PKG_X86_64}"
    fi

    echo "Dang tai GLPI Agent \${AGENT_VERSION} cho macOS ($ARCH)..."
    mkdir -p "$TEMP_DIR"

    if command -v curl &>/dev/null; then
        curl -fSL --progress-bar -o "$TEMP_DIR/agent.pkg" "$AGENT_URL"
    fi

    if [ -f "$TEMP_DIR/agent.pkg" ]; then
        # PKG can be extracted with pkgutil (no sudo needed for expansion)
        echo "Mo rong PKG..."
        pkgutil --expand "$TEMP_DIR/agent.pkg" "$TEMP_DIR/pkg-contents" 2>/dev/null
        AGENT=$(find "$TEMP_DIR/pkg-contents" -name "glpi-agent" -type f -o -name "glpi-agent.pl" -type f 2>/dev/null | head -1)
        if [ -z "$AGENT" ]; then
            # Fallback: thu xem co phai tar.gz khong (release cu)
            tar xzf "$TEMP_DIR/agent.pkg" -C "$TEMP_DIR" 2>/dev/null
            AGENT=$(find "$TEMP_DIR" -name "glpi-agent" -type f -o -name "glpi-agent.pl" -type f 2>/dev/null | head -1)
        fi
        [ -n "$AGENT" ] && chmod +x "$AGENT" 2>/dev/null
    fi
fi

if [ -n "$AGENT" ]; then
    echo "GLPI Agent tim thay tai: $AGENT"
    echo ""
    echo "[2/3] Dang thu thap thong tin..."

    mkdir -p "$OUTPUT_DIR"
    # Chay --full giong Windows/Linux de lay day du du lieu
    perl "$AGENT" --local "$OUTPUT_DIR" --json --full --no-ssl-check 2>&1

    # Tim file JSON output (--full tao 1 file, co the khong co extension)
    JSON_FILE=$(find "$OUTPUT_DIR" -maxdepth 1 -type f \\( -name "*.json" -o ! -name "*.*" \\) 2>/dev/null | head -1)

    if [ -n "$JSON_FILE" ]; then
        echo "Da thu thap xong: $JSON_FILE"
        echo ""
        echo "[3/3] Dang gui du lieu len CRM..."
        curl -s -X POST -H "Content-Type: application/json" -d @"$JSON_FILE" "$CRM_URL" --max-time 60
        echo ""
        echo "Hoan thanh!"
    else
        echo "[LOI] Khong tim thay file JSON tu GLPI Agent."
        echo "Thu lai voi --server..."
        perl "$AGENT" --server "$CRM_URL" --json --no-ssl-check 2>&1
    fi
else
    echo "[CANH BAO] GLPI Agent khong the tai hoac chay."
    echo "Vui long cai GLPI Agent thu cong:"
    echo "  Homebrew: brew install glpi-agent"
    echo "  Tai truc tiep: https://github.com/glpi-project/glpi-agent/releases"
    echo ""
    echo "Dang thu thap thong tin co ban tu system_profiler..."

    # Fallback: Dung system_profiler va lenh macOS
    SP_HARDWARE=$(system_profiler SPHardwareDataType 2>/dev/null)
    MANUFACTURER="Apple"
    MODEL_NAME=$(echo "$SP_HARDWARE" | awk '/Model Name:|^  Model Name:/' | head -1 | cut -d: -f2 | xargs || echo "Mac")
    SERIAL=$(echo "$SP_HARDWARE" | awk '/Serial Number/{print $NF}' | head -1 || echo "")
    TOTAL_MEM_MB=$(echo "$SP_HARDWARE" | awk '/Memory:/{print $2}' | head -1 || sysctl -n hw.memsize 2>/dev/null | awk '{print int($1/1024/1024)}')
    CPU_NAME=$(echo "$SP_HARDWARE" | awk '/Chip:/{sub(/Chip: /,""); print}' | head -1 | xargs || sysctl -n machdep.cpu.brand_string 2>/dev/null || echo "")
    OS_FULL_NAME=$(sw_vers -productName 2>/dev/null; sw_vers -productVersion 2>/dev/null | xargs || echo "macOS")
    KERNEL=$(uname -r)

    # Logged-in users (GLPI Agent format)
    LAST_USER=$(last 2>/dev/null | grep -vE '^(reboot|shutdown|wtmp)' | head -1 | awk '{print $1}')
    LAST_DATE=$(last 2>/dev/null | grep -vE '^(reboot|shutdown|wtmp)' | head -1 | awk '{for(i=4;i<=NF-1;i++) printf $i" "; print ""}' | xargs)
    CURRENT_USERS=$(who 2>/dev/null | awk '{print $1}' | sort -u)

    # Network
    DEFAULT_GW=$(route -n get default 2>/dev/null | awk '/gateway:/{print $2}' | head -1 || echo "")
    DNS_SERVERS=$(scutil --dns 2>/dev/null | awk '/nameservers/{getline; print $3}' | head -3 | paste -sd ',' || echo "")

    # Detect chassis type from model name
    if echo "$MODEL_NAME" | grep -qi "book"; then
        CHASSIS="Laptop"
    elif echo "$MODEL_NAME" | grep -qi "mini\|mac\|imac\|studio\|pro"; then
        CHASSIS="Desktop"
    else
        CHASSIS="Laptop"
    fi

    # Build flat JSON (GLPI Agent format)
    USERS_JSON=""
    for u in $CURRENT_USERS; do
        [ -n "$USERS_JSON" ] && USERS_JSON="$USERS_JSON,"
        USERS_JSON="$USERS_JSON{\\"LOGIN\\":\\"$u\\"}"
    done

    JSON_FILE="$TEMP_DIR/manual-inventory.json"
    cat > "$JSON_FILE" << 'ENDJSON'
{
  "action": "inventory",
  "deviceid": "'"$HOSTNAME_FQDN-$(uname -r)"'",
  "content": {
    "hardware": {
      "name": "'"$HOSTNAME_FQDN"'",
      "chassis_type": "'"$CHASSIS"'",
      "memory": '"$TOTAL_MEM_MB"',
      "uuid": "'"$SERIAL"'",
      "defaultgateway": "'"$DEFAULT_GW"'",
      "dns": "'"$DNS_SERVERS"'",
      "lastloggeduser": "'"$LAST_USER"'",
      "datelastloggeduser": "'"$LAST_DATE"'",
      "workgroup": "",
      "vmsystem": "Physical"
    },
    "bios": {
      "smanufacturer": "'"$MANUFACTURER"'",
      "smodel": "'"$MODEL_NAME"'",
      "sserial": "'"$SERIAL"'"
    },
    "operatingsystem": {
      "name": "macOS",
      "kernel_name": "darwin",
      "full_name": "'"$OS_FULL_NAME"'",
      "kernel_version": "'"$KERNEL"'",
      "arch": "'"$(uname -m)"'"
    },
    "cpus": [
      { "name": "'"$CPU_NAME"'" }
    ],
    "users": ['"$USERS_JSON"']
  }
}
ENDJSON

    echo "[3/3] Dang gui du lieu len CRM..."
    curl -s -X POST -H "Content-Type: application/json" -d @"$JSON_FILE" "$CRM_URL" --max-time 60
    echo ""
    echo "Hoan thanh (co ban - khong day du nhu GLPI Agent --full)!"
fi

# Cleanup
rm -rf "$TEMP_DIR" 2>/dev/null
`;

  // Detect OS from user-agent
  const ua = req.headers.get("user-agent") || "";
  const isWindows = ua.includes("Windows") || ua.includes("wow64");
  const isMac = ua.includes("Mac OS") || ua.includes("Darwin") || ua.includes("macOS");

  let filename: string, content: string, mime: string;
  if (isWindows) {
    filename = "thu-thap.bat";
    content = batContent.replace(/\n/g, "\r\n"); // CRLF for cmd.exe
    mime = "application/bat";
  } else if (isMac) {
    filename = "thu-thap-macos.sh";
    content = macShContent;
    mime = "text/x-shellscript";
  } else {
    filename = "thu-thap-linux.sh";
    content = linuxShContent;
    mime = "text/x-shellscript";
  }

  return new Response(content, {
    headers: {
      "Content-Type": `${mime}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
