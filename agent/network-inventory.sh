#!/usr/bin/env bash
# ============================================
#  Network Inventory Wrapper — GLPI Agent
#  Dùng glpi-netdiscovery + glpi-netinventory thật
# ============================================
# YÊU CẦU: GLPI Agent (Perl) đã cài
#   apt install glpi-agent
#   brew install glpi-agent
# ============================================
set -euo pipefail

usage() {
  cat <<EOF
Usage: $0 [OPTIONS]

Wrapper cho GLPI Agent — quét mạng SNMP và gửi inventory về CRM.

YÊU CẦU: glpi-netdiscovery + glpi-netinventory (trong gói glpi-agent)

OPTIONS:
  --first       IP đầu tiên (bắt buộc)
  --last        IP cuối cùng   (bắt buộc)
  --community   SNMP community (mặc định: public)
  --version     SNMP version   (mặc định: 2c)
  --crm-url     URL CRM API để POST kết quả (tuỳ chọn)
  --output      Ghi JSON ra file (tuỳ chọn)

VÍ DỤ:
  $0 --first 192.168.1.1 --last 192.168.1.254
  $0 --first 10.0.0.1 --last 10.0.0.254 --crm-url "https://crm.example.com/api/agent-inventory/network-import?customerId=abc"
EOF
  exit 1
}

# ─── Parse args ──────────────────────────────────────────────
FIRST=""
LAST=""
COMMUNITY="public"
VERSION="2c"
CRM_URL=""
OUTPUT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --first)    FIRST="$2";    shift 2 ;;
    --last)     LAST="$2";     shift 2 ;;
    --community) COMMUNITY="$2"; shift 2 ;;
    --version)  VERSION="$2";  shift 2 ;;
    --crm-url)  CRM_URL="$2";  shift 2 ;;
    --output)   OUTPUT="$2";   shift 2 ;;
    -h|--help)  usage ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

if [[ -z "$FIRST" || -z "$LAST" ]]; then
  echo "[!] --first và --last là bắt buộc"
  usage
fi

CREDENTIALS="version:${VERSION},community:${COMMUNITY}"

# ─── Kiểm tra GLPI Agent ────────────────────────────────────
NETDISCOVERY=""
NETINVENTORY=""

if command -v glpi-netdiscovery &>/dev/null; then
  NETDISCOVERY=$(command -v glpi-netdiscovery)
elif [ -f "/usr/bin/glpi-netdiscovery" ]; then
  NETDISCOVERY="/usr/bin/glpi-netdiscovery"
elif [ -f "/usr/local/bin/glpi-netdiscovery" ]; then
  NETDISCOVERY="/usr/local/bin/glpi-netdiscovery"
fi

if command -v glpi-netinventory &>/dev/null; then
  NETINVENTORY=$(command -v glpi-netinventory)
elif [ -f "/usr/bin/glpi-netinventory" ]; then
  NETINVENTORY="/usr/bin/glpi-netinventory"
elif [ -f "/usr/local/bin/glpi-netinventory" ]; then
  NETINVENTORY="/usr/local/bin/glpi-netinventory"
fi

if [[ -z "$NETDISCOVERY" || -z "$NETINVENTORY" ]]; then
  echo "[!] GLPI Agent chưa được cài đặt."
  echo "    Cài đặt: sudo apt install glpi-agent"
  echo "            brew install glpi-agent"
  exit 1
fi

echo "============================================"
echo "  CRM Network Inventory — GLPI Agent"
echo "============================================"
echo ""
echo "[OK] glpi-netdiscovery: $NETDISCOVERY"
echo "[OK] glpi-netinventory: $NETINVENTORY"
echo ""

# ─── Bước 1: Network Discovery ──────────────────────────────
echo "[*] Bước 1: Network Discovery ($FIRST → $LAST)..."
echo "    Credentials: $CREDENTIALS"

DISCOVERY_OUTPUT=$(mktemp /tmp/crm-netdiscovery-XXXXXX.xml)

if ! "$NETDISCOVERY" --first "$FIRST" --last "$LAST" \
       --credentials "$CREDENTIALS" \
       --output "$DISCOVERY_OUTPUT" 2>&1; then
  echo "[!] Lỗi discovery."
  rm -f "$DISCOVERY_OUTPUT"
  exit 1
fi

if [[ ! -s "$DISCOVERY_OUTPUT" ]]; then
  echo "[!] Discovery không tìm thấy thiết bị nào."
  rm -f "$DISCOVERY_OUTPUT"
  exit 0
fi

echo "[OK] Discovery hoàn tất."

# ─── Đọc danh sách IP từ XML ────────────────────────────────
DISCOVERED_IPS=()
while IFS= read -r line; do
  ip=$(echo "$line" | sed -n 's/.*<IP>\([^<]*\)<\/IP>.*/\1/p')
  if [[ -n "$ip" ]]; then
    DISCOVERED_IPS+=("$ip")
  fi
done < <(grep -o '<IP>[^<]*</IP>' "$DISCOVERY_OUTPUT" || true)

if [[ ${#DISCOVERED_IPS[@]} -eq 0 ]]; then
  echo "[!] Không tìm thấy thiết bị SNMP nào."
  rm -f "$DISCOVERY_OUTPUT"
  exit 0
fi

echo "[OK] Tìm thấy ${#DISCOVERED_IPS[@]} thiết bị:"
for ip in "${DISCOVERED_IPS[@]}"; do
  echo "    $ip"
done
echo ""

# ─── Bước 2: Network Inventory từng thiết bị ────────────────
COUNT=0
TOTAL=${#DISCOVERED_IPS[@]}
INVENTORY_FILES=()

for ip in "${DISCOVERED_IPS[@]}"; do
  COUNT=$((COUNT + 1))
  echo "[$COUNT/$TOTAL] Inventory $ip..."

  INV_OUTPUT=$(mktemp /tmp/crm-netinv-"$ip"-XXXXXX.xml)

  if "$NETINVENTORY" --host "$ip" \
       --credentials "$CREDENTIALS" \
       --output "$INV_OUTPUT" 2>&1; then
    echo "    OK"
    INVENTORY_FILES+=("$INV_OUTPUT")
  else
    echo "    Lỗi — bỏ qua"
    rm -f "$INV_OUTPUT"
  fi
done

echo ""
echo "[OK] Inventory hoàn tất."

# ─── Bước 3: Gửi về CRM ─────────────────────────────────────
if [[ -n "$CRM_URL" ]]; then
  echo "[*] Đang gửi kết quả về CRM..."

  # Build IP list JSON
  IP_LIST="["
  FIRST_IP=true
  for ip in "${DISCOVERED_IPS[@]}"; do
    if [ "$FIRST_IP" = true ]; then
      IP_LIST+="\"$ip\""
      FIRST_IP=false
    else
      IP_LIST+=",\"$ip\""
    fi
  done
  IP_LIST+="]"

  TIMESTAMP=$(date '+%Y%m%d-%H%M%S')

  PAYLOAD=$(cat <<EOF
{
  "action": "netinventory",
  "deviceid": "GLPI-AGENT-SCAN-${TIMESTAMP}",
  "content": {
    "versionclient": "1.0",
    "network_device": {
      "name": "GLPI-Agent-Scan-Run",
      "manufacturer": "GLPI Agent",
      "model": "Network Discovery",
      "serial": "SCAN-RUN-$(date '+%Y%m%d')",
      "type": "Networking",
      "ips": $IP_LIST
    }
  }
}
EOF
)

  # Gửi POST
  HTTP_CODE=$(curl -s -o /tmp/crm-response.json -w "%{http_code}" \
    -X POST "$CRM_URL" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    --max-time 120)

  if [[ "$HTTP_CODE" == 2* ]]; then
    echo "[OK] Đã gửi thành công! (HTTP $HTTP_CODE)"
    cat /tmp/crm-response.json | python3 -m json.tool 2>/dev/null || cat /tmp/crm-response.json
  else
    echo "[!] Lỗi gửi về CRM (HTTP $HTTP_CODE)"
    cat /tmp/crm-response.json 2>/dev/null || true
  fi
fi

echo ""
echo "[*] Kết quả XML lưu tại:"
echo "    Discovery: $DISCOVERY_OUTPUT"
for f in "${INVENTORY_FILES[@]}"; do
  echo "    $f"
done

# Ghi ra output file nếu được yêu cầu
if [[ -n "$OUTPUT" ]]; then
  echo "$PAYLOAD" > "$OUTPUT"
  echo "[OK] Đã ghi JSON ra: $OUTPUT"
fi

echo ""
echo "============================================"
echo "  HOÀN TẤT"
echo "============================================"

echo ""
echo "[*] Để inject trực tiếp vào GLPI server:"
echo "    glpi-injector -f \"$DISCOVERY_OUTPUT\" --url https://glpi.company.com/front/inventory.php"
echo ""
