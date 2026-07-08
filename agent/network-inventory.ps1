<#
.SYNOPSIS
  Network Inventory Wrapper — using glpi-netdiscovery + glpi-netinventory
.DESCRIPTION
  Calls official GLPI Agent tools to scan network and collect inventory
  of network devices (switch, router, firewall, AP...).

  REQUIRES: GLPI Agent (Perl) installed — contains glpi-netdiscovery + glpi-netinventory

  Install GLPI Agent:
    Windows: choco install glpi-agent
             winget install glpi-agent
    Linux:   sudo apt install glpi-agent
    macOS:   brew install glpi-agent

.PARAMETER FirstIP
  First IP of subnet to scan (e.g. "192.168.1.1")
.PARAMETER LastIP
  Last IP of subnet to scan (e.g. "192.168.1.254")
.PARAMETER Credentials
  SNMP credentials (e.g. "version:2c,community:public")
.PARAMETER CrmUrl
  CRM API URL (e.g. "https://crm.company.com/api/agent-inventory/network-import?customerId=XXX")
.PARAMETER OutputFile
  Save JSON to file (optional)

.EXAMPLE
  .\network-inventory.ps1 -FirstIP 192.168.1.1 -LastIP 192.168.1.254 -Credentials "version:2c,community:public"

.EXAMPLE
  .\network-inventory.ps1 -FirstIP 10.0.0.1 -LastIP 10.0.0.254 -Credentials "version:2c,community:crmro" -CrmUrl "https://crm.company.com/api/agent-inventory/network-import?customerId=abc"
#>

param(
  [Parameter(Mandatory = $true)]
  [string]$FirstIP,
  [Parameter(Mandatory = $true)]
  [string]$LastIP,
  [string]$Credentials = "version:2c,community:public",
  [string]$CrmUrl = "",
  [string]$OutputFile = ""
)

# ─── Helper: find command ────────────────────────────────────
function Find-Command {
  param([string]$Name)
  $result = Get-Command $Name -ErrorAction SilentlyContinue
  if ($result) { return $result.Source }
  $paths = @(
    "$env:ProgramFiles\GLPI-Agent\bin\$Name",
    "${env:ProgramFiles(x86)}\GLPI-Agent\bin\$Name",
    "$env:LOCALAPPDATA\GLPI-Agent\bin\$Name"
  )
  foreach ($p in $paths) {
    if (Test-Path $p) { return $p }
    if (Test-Path "$p.exe") { return "$p.exe" }
    if (Test-Path "$p.bat") { return "$p.bat" }
  }
  return $null
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  CRM Network Inventory - GLPI Agent" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ─── Check GLPI Agent ───────────────────────────────────────
$netdiscovery = Find-Command "glpi-netdiscovery"
$netinventory = Find-Command "glpi-netinventory"

if (-not $netdiscovery -and -not $netinventory) {
  Write-Host "[!] GLPI Agent not installed." -ForegroundColor Yellow
  Write-Host "    Install:" -ForegroundColor Yellow
  Write-Host "      choco install glpi-agent" -ForegroundColor Yellow
  Write-Host "      winget install glpi-agent" -ForegroundColor Yellow
  Write-Host "      Download: https://github.com/glpi-project/glpi-agent/releases" -ForegroundColor Yellow
  exit 1
}

if (-not $netdiscovery) {
  Write-Host "[!] glpi-netdiscovery not found. Check GLPI Agent install." -ForegroundColor Red
  exit 1
}
if (-not $netinventory) {
  Write-Host "[!] glpi-netinventory not found. Check GLPI Agent install." -ForegroundColor Red
  exit 1
}

Write-Host "[OK] glpi-netdiscovery: $netdiscovery" -ForegroundColor Green
Write-Host "[OK] glpi-netinventory: $netinventory" -ForegroundColor Green
Write-Host ""

# ─── Step 1: Network Discovery ───────────────────────────────
Write-Host "[*] Step 1: Network Discovery ($FirstIP -> $LastIP)..." -ForegroundColor Gray
Write-Host "    Credentials: $Credentials" -ForegroundColor Gray

$discoveryOutput = "$env:TEMP\crm-netdiscovery-$(Get-Random).xml"
try {
  & $netdiscovery --first $FirstIP --last $LastIP --credentials $Credentials --output $discoveryOutput 2>&1
  if (-not (Test-Path $discoveryOutput)) {
    Write-Host "[!] Discovery found no devices." -ForegroundColor Yellow
    exit 0
  }
} catch {
  Write-Host "[!] Discovery error: $_" -ForegroundColor Red
  exit 1
}

Write-Host "[OK] Discovery complete." -ForegroundColor Green

# ─── Read IP list from discovery output ──────────────────────
$discoveryContent = Get-Content $discoveryOutput -Raw
$discoveredIPs = @()
if ($discoveryContent -match '<IP>([^<]+)</IP>') {
  $discoveredIPs = [regex]::Matches($discoveryContent, '<IP>([^<]+)</IP>') | ForEach-Object { $_.Groups[1].Value }
}

if ($discoveredIPs.Count -eq 0) {
  Write-Host "[!] No SNMP devices found in range." -ForegroundColor Yellow
  Remove-Item $discoveryOutput -Force -ErrorAction SilentlyContinue
  exit 0
}

Write-Host "[OK] Found $($discoveredIPs.Count) devices:" -ForegroundColor Green
$discoveredIPs | ForEach-Object { Write-Host "    $_" -ForegroundColor White }
Write-Host ""

# ─── Step 2: Network Inventory each device ──────────────────
$allDevices = @()
$count = 0
$total = $discoveredIPs.Count

foreach ($ip in $discoveredIPs) {
  $count++
  Write-Host "[$count/$total] Inventory $ip..." -ForegroundColor Gray

  $invOutput = "$env:TEMP\crm-netinv-$ip-$(Get-Random).xml"
  try {
    & $netinventory --host $ip --credentials $Credentials --output $invOutput 2>&1
    if (Test-Path $invOutput) {
      $content = Get-Content $invOutput -Raw
      if ($content.Trim().Length -gt 0) {
        Write-Host "    OK" -ForegroundColor Green
      }
    }
  } catch {
    Write-Host "    Error: $_" -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "[OK] Inventory complete." -ForegroundColor Green

# ─── Step 3: Build JSON and send to CRM ─────────────────────
# Results are XML files from GLPI Agent.
# Use glpi-injector to send to GLPI server, or submit via CRM API.

Write-Host "[*] Results saved at:" -ForegroundColor Gray
Write-Host "    Discovery: $discoveryOutput" -ForegroundColor White
Write-Host "    XML files in: $env:TEMP\crm-netinv-*" -ForegroundColor White

# Send discovery result to CRM API (GLPI netinventory format)
if ($CrmUrl) {
  Write-Host ""
  Write-Host "[*] Sending results to CRM..." -ForegroundColor Gray

  $payload = @{
    action = "netinventory"
    deviceid = "GLPI-AGENT-SCAN-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    content = @{
      versionclient = "1.0"
      network_device = @{
        name = "GLPI-Agent-Scan-Run"
        manufacturer = "GLPI Agent"
        model = "Network Discovery"
        serial = "SCAN-RUN-$(Get-Date -Format 'yyyyMMdd')"
        type = "Networking"
        ips = $discoveredIPs
      }
    }
  }

  try {
    $jsonBody = $payload | ConvertTo-Json -Depth 5
    $response = Invoke-RestMethod -Uri $CrmUrl -Method Post -Body $jsonBody -ContentType "application/json" -TimeoutSec 120
    Write-Host "[OK] Sent successfully!" -ForegroundColor Green
    if ($response.data) {
      Write-Host "    Submission ID: $($response.data.submissionId)" -ForegroundColor White
      Write-Host "    Devices: $($response.data.deviceCount)" -ForegroundColor White
    }
  } catch {
    Write-Host "[!] Error sending to CRM: $_" -ForegroundColor Red
    Write-Host "    XML files preserved. Can inject manually." -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "[*] To inject directly into GLPI server:" -ForegroundColor Gray
Write-Host "    glpi-injector -f `"$discoveryOutput`" --url https://glpi.company.com/front/inventory.php" -ForegroundColor White
Write-Host ""

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  DONE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
