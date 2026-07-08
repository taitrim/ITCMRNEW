#!/usr/bin/env bash
# ============================================
#  Network Inventory Wrapper - GLPI Agent
#  Uses glpi-netdiscovery + glpi-netinventory
# ============================================
# REQUIRES: GLPI Agent (Perl) installed
#   apt install glpi-agent
#   brew install glpi-agent
# ============================================
set -euo pipefail

usage() {
  cat <<EOF
Usage: $0 [OPTIONS]

Wrapper for GLPI Agent - scan network SNMP and send inventory to CRM.

REQUIRES: glpi-netdiscovery + glpi-netinventory (in glpi-agent package)

OPTIONS:
  --first       First IP of subnet (required)
  --last        Last IP of subnet  (required)
  --community   SNMP community     (default: public)
  --version     SNMP version       (default: 2c)
  --crm-url     CRM API URL to POST results (optional)
  --output      Save JSON to file  (optional)

EXAMPLES:
  $0 --first 192.168.1.1 --last 192.168.1.254
  $0 --first 10.0.0.1 --last 10.0.0.254 --crm-url "https://crm.example.com/api/agent-inventory/network-import?customerId=abc"
EOF
  exit 1
}

# --- Parse args -------------------------------------------------
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
  echo "[!] --first and --last are required"
  usage
fi

CREDENTIALS="version:${VERSION},community:${COMMUNITY}"

# --- Check GLPI Agent -------------------------------------------
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
  echo "[!] GLPI Agent not installed."
  echo "    Install: sudo apt install glpi-agent"
  echo "            brew install glpi-agent"
  exit 1
fi

echo "============================================"
echo "  CRM Network Inventory - GLPI Agent"
echo "============================================"
echo ""
echo "[OK] glpi-netdiscovery: $NETDISCOVERY"
echo "[OK] glpi-netinventory: $NETINVENTORY"
echo ""

# --- Step 1: Network Discovery ----------------------------------
echo "[*] Step 1: Network Discovery ($FIRST -> $LAST)..."
echo "    Credentials: $CREDENTIALS"

DISCOVERY_OUTPUT=$(mktemp /tmp/crm-netdiscovery-XXXXXX.xml)

if ! "$NETDISCOVERY" --first "$FIRST" --last "$LAST" \
       --credentials "$CREDENTIALS" \
       --output "$DISCOVERY_OUTPUT" 2>&1; then
  echo "[!] Discovery error."
  rm -f "$DISCOVERY_OUTPUT"
  exit 1
fi

if [[ ! -s "$DISCOVERY_OUTPUT" ]]; then
  echo "[!] Discovery found no devices."
  rm -f "$DISCOVERY_OUTPUT"
  exit 0
fi

echo "[OK] Discovery complete."

# --- Read IP list from XML --------------------------------------
DISCOVERED_IPS=()
while IFS= read -r line; do
  ip=$(echo "$line" | sed -n 's/.*<IP>\([^<]*\)<\/IP>.*/\1/p')
  if [[ -n "$ip" ]]; then
    DISCOVERED_IPS+=("$ip")
  fi
done < <(grep -o '<IP>[^<]*</IP>' "$DISCOVERY_OUTPUT" || true)

if [[ ${#DISCOVERED_IPS[@]} -eq 0 ]]; then
  echo "[!] No SNMP devices found in range."
  rm -f "$DISCOVERY_OUTPUT"
  exit 0
fi

echo "[OK] Found ${#DISCOVERED_IPS[@]} devices:"
for ip in "${DISCOVERED_IPS[@]}"; do
  echo "    $ip"
done
echo ""

# --- Step 2: Network Inventory each device ----------------------
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
    echo "    Error - skipping"
    rm -f "$INV_OUTPUT"
  fi
done

echo ""
echo "[OK] Inventory complete."

# --- Step 3: Send to CRM ----------------------------------------
if [[ -n "$CRM_URL" ]]; then
  echo "[*] Sending results to CRM..."

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

  # Send POST
  HTTP_CODE=$(curl -s -o /tmp/crm-response.json -w "%{http_code}" \
    -X POST "$CRM_URL" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    --max-time 120)

  if [[ "$HTTP_CODE" == 2* ]]; then
    echo "[OK] Sent successfully! (HTTP $HTTP_CODE)"
    cat /tmp/crm-response.json | python3 -m json.tool 2>/dev/null || cat /tmp/crm-response.json
  else
    echo "[!] Error sending to CRM (HTTP $HTTP_CODE)"
    cat /tmp/crm-response.json 2>/dev/null || true
  fi
fi

echo ""
echo "[*] Results saved at:"
echo "    Discovery: $DISCOVERY_OUTPUT"
for f in "${INVENTORY_FILES[@]}"; do
  echo "    $f"
done

# Save output file if requested
if [[ -n "$OUTPUT" ]]; then
  echo "$PAYLOAD" > "$OUTPUT"
  echo "[OK] Saved JSON to: $OUTPUT"
fi

echo ""
echo "============================================"
echo "  DONE"
echo "============================================"

echo ""
echo "[*] To inject directly into GLPI server:"
echo "    glpi-injector -f \"$DISCOVERY_OUTPUT\" --url https://glpi.company.com/front/inventory.php"
echo ""
