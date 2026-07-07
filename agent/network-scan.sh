#!/bin/bash
# ============================================
#   CRM Network SNMP Scanner (Linux/macOS)
#   Quét mạng bằng SNMP, xuất JSON → CRM
# ============================================
#
# Yêu cầu: snmpwalk (apt install snmp / brew install net-snmp)
#
# Cách dùng:
#   ./network-scan.sh -s 192.168.1.0/24 -c public -u "https://crm.url/api/..."
#

CRM_URL=""
SUBNET=""
COMMUNITY="public"
SNMP_VER="2c"
TIMEOUT=3
THREADS=10
OUTPUT_FILE=""
SNMPWALK=$(which snmpwalk 2>/dev/null)

usage() {
  echo "CRM Network SNMP Scanner"
  echo ""
  echo "Usage: $0 -s SUBNET [-c COMMUNITY] [-u CRM_URL] [-o FILE]"
  echo ""
  echo "  -s SUBNET      Subnet (VD: 192.168.1.0/24 hoặc 10.0.0.1-10.0.0.254)"
  echo "  -c COMMUNITY   SNMP community (mặc định: public)"
  echo "  -u CRM_URL     URL CRM để POST kết quả"
  echo "  -o FILE        Ghi JSON ra file"
  echo "  -t TIMEOUT     SNMP timeout (giây, mặc định: 3)"
  echo "  -n THREADS     Số luồng (mặc định: 10)"
  echo "  -h             Help"
  exit 0
}

while getopts "s:c:u:o:t:n:h" opt; do
  case $opt in
    s) SUBNET="$OPTARG" ;;
    c) COMMUNITY="$OPTARG" ;;
    u) CRM_URL="$OPTARG" ;;
    o) OUTPUT_FILE="$OPTARG" ;;
    t) TIMEOUT="$OPTARG" ;;
    n) THREADS="$OPTARG" ;;
    h) usage ;;
    *) usage ;;
  esac
done

# ─── Header ─────────────────────────────────────────────────────
echo ""
echo "============================================"
echo "  CRM Network SNMP Scanner"
echo "============================================"
echo ""

# ─── Kiểm tra snmpwalk ───────────────────────────────────────
if [ -z "$SNMPWALK" ]; then
  echo "[!] snmpwalk không tìm thấy."
  echo "    Cài đặt:"
  echo "      Ubuntu/Debian: sudo apt install snmp"
  echo "      macOS: brew install net-snmp"
  echo "      RHEL/CentOS: sudo yum install net-snmp-utils"
  exit 1
fi
echo "[OK] snmpwalk: $SNMPWALK"

# ─── Parse subnet ─────────────────────────────────────────────
if [ -z "$SUBNET" ]; then
  echo "[!] Thiếu subnet. Dùng -s 192.168.1.0/24"
  exit 1
fi

echo "[*] Subnet: $SUBNET"
echo "[*] Community: $COMMUNITY"
echo ""

# ─── Ping sweep ────────────────────────────────────────────────
echo "[*] Ping sweep..."
TMPFILE=$(mktemp)
nmap -sn -n "$SUBNET" -oG "$TMPFILE" 2>/dev/null | tail -1
if [ $? -ne 0 ]; then
  # Fallback: tự ping
  echo "[!] nmap không có, dùng ping fallback..."
fi

ALIVE_HOSTS=$(grep "Status: Up" "$TMPFILE" 2>/dev/null | awk '{print $2}')
if [ -z "$ALIVE_HOSTS" ]; then
  # Manual ping scan
  ALIVE_HOSTS=""
  IFS='.' read -r a b c d <<< "$(echo $SUBNET | cut -d'/' -f1 | cut -d'-' -f1)"
  MASK=$(echo $SUBNET | grep -oP '\d+$' || echo "24")
  if [[ "$SUBNET" == *"/"* ]]; then
    SIZE=$(( 1 << (32 - MASK) ))
    START=1
    END=$((SIZE - 2))
    for i in $(seq $START $END); do
      IP="$a.$b.$c.$i"
      ping -c 1 -W 1 $IP >/dev/null 2>&1 && ALIVE_HOSTS="$ALIVE_HOSTS $IP" &
    done
    wait
  elif [[ "$SUBNET" == *"-"* ]]; then
    echo "[!] Range scan dùng ping fallback..."
  fi
fi

rm -f "$TMPFILE"

HOST_COUNT=$(echo "$ALIVE_HOSTS" | wc -w)
echo "[OK] Sống: $HOST_COUNT"

if [ "$HOST_COUNT" -eq 0 ]; then
  echo "[!] Không có host nào phản hồi."
  exit 0
fi

# ─── SNMP scan function ─────────────────────────────────────────
scan_device() {
  local IP=$1
  local OUT=$(mktemp)

  # sysDescr
  local SD
  SD=$($SNMPWALK -v$SNMP_VER -c "$COMMUNITY" -t $TIMEOUT -r 1 -Oqv "$IP" .1.3.6.1.2.1.1.1.0 2>/dev/null)
  if [ $? -ne 0 ] || [ -z "$SD" ]; then
    rm -f "$OUT"
    return
  fi
  SD=$(echo "$SD" | sed 's/^"//;s/"$//')

  # sysName
  local NAME
  NAME=$($SNMPWALK -v$SNMP_VER -c "$COMMUNITY" -t $TIMEOUT -r 1 -Oqv "$IP" .1.3.6.1.2.1.1.5.0 2>/dev/null | sed 's/^"//;s/"$//')

  # sysObjectID
  local SOID
  SOID=$($SNMPWALK -v$SNMP_VER -c "$COMMUNITY" -t $TIMEOUT -r 1 "$IP" .1.3.6.1.2.1.1.2.0 2>/dev/null | awk '{print $NF}')

  # sysUptime
  local UPT
  UPT=$($SNMPWALK -v$SNMP_VER -c "$COMMUNITY" -t $TIMEOUT -r 1 -Oqv "$IP" .1.3.6.1.2.1.1.3.0 2>/dev/null)
  local UPTIME_STR=""
  if [ -n "$UPT" ]; then
    local TICKS=$((UPT / 100))
    local DAYS=$((TICKS / 86400))
    local HOURS=$(((TICKS % 86400) / 3600))
    local MINS=$(((TICKS % 3600) / 60))
    UPTIME_STR="${DAYS} days, ${HOURS}:${MINS}"
  fi

  # ifTable
  local PORTS=$($SNMPWALK -v$SNMP_VER -c "$COMMUNITY" -t $TIMEOUT -r 1 -OQn "$IP" .1.3.6.1.2.1.2.2.1 2>/dev/null | awk '
    /\.1\.3\.6\.1\.2\.1\.2\.2\.1\.2\./ { name[$NF]=$0; gsub(/^[^ ]+ /,"",name[$NF]); gsub(/^"|"$/,"",name[$NF]) }
    /\.1\.3\.6\.1\.2\.1\.2\.2\.1\.5\./ { speed[$NF]=$NF }
    /\.1\.3\.6\.1\.2\.1\.2\.2\.1\.8\./ { oper[$NF]=$NF }
    END { for (i in name) print i, name[i], speed[i], oper[i] }
  ' | head -100)

  # Detect type
  local SD_LC=$(echo "$SD" | tr '[:upper:]' '[:lower:]')
  local TYPE="switch"
  if echo "$SD_LC" | grep -qE 'cisco asa|firepower|fortinet|fortigate|palo alto|checkpoint|sonicwall|security'; then TYPE="firewall"
  elif echo "$SD_LC" | grep -qE 'cisco isr|router|hub|vrouter'; then TYPE="router"
  elif echo "$SD_LC" | grep -qE 'unifi|access point|wlan|wireless|ap$'; then TYPE="ap"
  elif echo "$SD_LC" | grep -qE 'ups|apc|smart.?ups|symmetra|battery'; then TYPE="ups"
  elif echo "$SD_LC" | grep -qE 'camera|axis|hikvision|dahua'; then TYPE="camera"
  elif echo "$SD_LC" | grep -qE 'load.?balancer|f5|big.?ip'; then TYPE="load-balancer"
  elif echo "$SD_LC" | grep -qE 'ont|onu|gpon|ftth'; then TYPE="ont"
  fi

  # Manufacturer
  local MFG="Unknown"
  if echo "$SD_LC" | grep -q "cisco"; then MFG="Cisco"
  elif echo "$SD_LC" | grep -qE "hp |procurve|aruba"; then MFG="HP Aruba"
  elif echo "$SD_LC" | grep -qE "dell|force10|powerconnect"; then MFG="Dell"
  elif echo "$SD_LC" | grep -qE "juniper|junos"; then MFG="Juniper"
  elif echo "$SD_LC" | grep -qE "fortinet|fortigate"; then MFG="Fortinet"
  elif echo "$SD_LC" | grep -qE "palo.?alto|pan.?os"; then MFG="Palo Alto"
  elif echo "$SD_LC" | grep -qE "ubiquiti|unifi"; then MFG="Ubiquiti"
  elif echo "$SD_LC" | grep -qE "mikrotik|routeros"; then MFG="MikroTik"
  elif echo "$SD_LC" | grep -qE "huawei"; then MFG="Huawei"
  elif echo "$SD_LC" | grep -qE "apc|schneider"; then MFG="APC"
  elif echo "$SD_LC" | grep -qE "axis"; then MFG="Axis"
  elif echo "$SD_LC" | grep -qE "hikvision"; then MFG="Hikvision"
  fi

  # Serial (ENTITY-MIB)
  local SERIAL=""
  SERIAL=$($SNMPWALK -v$SNMP_VER -c "$COMMUNITY" -t $TIMEOUT -r 1 -Oqv "$IP" .1.3.6.1.2.1.47.1.1.1.1.11 2>/dev/null | head -1 | sed 's/^"//;s/"$//')

  # Firmware
  local FW=""
  FW=$($SNMPWALK -v$SNMP_VER -c "$COMMUNITY" -t $TIMEOUT -r 1 -Oqv "$IP" .1.3.6.1.2.1.47.1.1.1.1.10 2>/dev/null | head -1 | sed 's/^"//;s/"$//')
  if [ -z "$FW" ] && echo "$SD_LC" | grep -qP 'version\s+[\d.()]+'; then
    FW=$(echo "$SD_LC" | grep -oP 'version\s+\K[\d.()]+')
  fi

  # Output JSON line
  jq -n -c \
    --arg type "$TYPE" \
    --arg mfg "$MFG" \
    --arg model "$(echo "$SD" | head -c 80)" \
    --arg serial "$SERIAL" \
    --arg name "$NAME" \
    --arg ip "$IP" \
    --arg fw "$FW" \
    --arg desc "$SD" \
    --arg up "$UPTIME_STR" \
    '{
      type: $type, manufacturer: $mfg, model: $model, serial: $serial,
      name: $name, ip: $ip, firmware: $fw, sysDescr: $desc, uptime: $up,
      portCount: 0, ports: []
    }'

  rm -f "$OUT"
}

# ─── Run scan ──────────────────────────────────────────────────
echo "[*] Đang quét SNMP..."
echo ""

DEVICES_JSON=""
FIRST=true
for IP in $ALIVE_HOSTS; do
  RESULT=$(scan_device "$IP")
  if [ -n "$RESULT" ]; then
    if [ "$FIRST" = true ]; then
      DEVICES_JSON="$RESULT"
      FIRST=false
    else
      DEVICES_JSON="$DEVICES_JSON,$RESULT"
    fi
    IP_PAD=$(printf "%-16s" "$IP")
    TYPE=$(echo "$RESULT" | jq -r '.type // "?"')
    MFG=$(echo "$RESULT" | jq -r '.manufacturer // "?"')
    echo "  $IP_PAD $TYPE $MFG"
  fi
done

# ─── Build final JSON ───────────────────────────────────────────
FULL_JSON=$(jq -n \
  --arg action "network_inventory" \
  --arg did "SNMP-SCAN-$(date +%Y%m%d-%H%M%S)" \
  --argjson devices "[$DEVICES_JSON]" \
  '{action: $action, deviceid: $did, content: $devices}')

DEVICE_COUNT=$(echo "$DEVICES_JSON" | grep -c '"ip"' || echo 0)

echo ""
echo "============================================"
echo "  KẾT QUẢ: $DEVICE_COUNT thiết bị"
echo "============================================"

# Ghi file
if [ -n "$OUTPUT_FILE" ]; then
  echo "$FULL_JSON" > "$OUTPUT_FILE"
  echo "[OK] File: $OUTPUT_FILE"
fi

# POST về CRM
if [ -n "$CRM_URL" ]; then
  echo ""
  echo "[*] Đang gửi về CRM..."
  RESP=$(curl -s -X POST -H "Content-Type: application/json" -d "$FULL_JSON" "$CRM_URL" --max-time 60)
  if [ $? -eq 0 ]; then
    echo "[OK] Gửi thành công!"
    echo "$RESP" | jq '.data // .' 2>/dev/null || echo "$RESP"
  else
    echo "[!] Lỗi gửi về CRM"
    echo "    JSON được giữ lại. Import thủ công."
  fi
fi

echo ""
echo "============================================"
echo "  HOÀN TẤT"
echo "============================================"
