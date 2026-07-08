<#
.SYNOPSIS
  Network Inventory Wrapper — sử dụng glpi-netdiscovery + glpi-netinventory thật
.DESCRIPTION
  Gọi công cụ chính thức của GLPI Agent để quét mạng và thu thập inventory
  thiết bị mạng (switch, router, firewall, AP...).
  
  YÊU CẦU: GLPI Agent (Perl) đã cài đặt — chứa glpi-netdiscovery + glpi-netinventory
  
  Cài đặt GLPI Agent:
    Windows: choco install glpi-agent
             winget install glpi-agent
    Linux:   sudo apt install glpi-agent
    macOS:   brew install glpi-agent

.PARAMETER FirstIP
  Địa chỉ IP đầu tiên của dải cần quét (VD: "192.168.1.1")
.PARAMETER LastIP
  Địa chỉ IP cuối cùng của dải cần quét (VD: "192.168.1.254")
.PARAMETER Credentials
  SNMP credentials (VD: "version:2c,community:public")
.PARAMETER CrmUrl
  URL CRM API (VD: "https://crm.company.com/api/agent-inventory/network-import?customerId=XXX")
.PARAMETER OutputFile
  Ghi JSON ra file (tuỳ chọn)

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

# ─── Helper: kiểm tra lệnh ──────────────────────────────────
function Find-Command {
  param([string]$Name)
  $result = Get-Command $Name -ErrorAction SilentlyContinue
  if ($result) { return $result.Source }
  # Common paths
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
Write-Host "  CRM Network Inventory — GLPI Agent" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ─── Kiểm tra GLPI Agent ───────────────────────────────────
$netdiscovery = Find-Command "glpi-netdiscovery"
$netinventory = Find-Command "glpi-netinventory"

if (-not $netdiscovery -and -not $netinventory) {
  Write-Host "[!] GLPI Agent chưa được cài đặt." -ForegroundColor Yellow
  Write-Host "    Cài đặt:" -ForegroundColor Yellow
  Write-Host "      choco install glpi-agent" -ForegroundColor Yellow
  Write-Host "      winget install glpi-agent" -ForegroundColor Yellow
  Write-Host "      Hoặc tải: https://github.com/glpi-project/glpi-agent/releases" -ForegroundColor Yellow
  exit 1
}

if (-not $netdiscovery) {
  Write-Host "[!] glpi-netdiscovery không tìm thấy. Kiểm tra cài đặt GLPI Agent." -ForegroundColor Red
  exit 1
}
if (-not $netinventory) {
  Write-Host "[!] glpi-netinventory không tìm thấy. Kiểm tra cài đặt GLPI Agent." -ForegroundColor Red
  exit 1
}

Write-Host "[OK] glpi-netdiscovery: $netdiscovery" -ForegroundColor Green
Write-Host "[OK] glpi-netinventory: $netinventory" -ForegroundColor Green
Write-Host ""

# ─── Bước 1: Network Discovery ──────────────────────────────
Write-Host "[*] Bước 1: Network Discovery ($FirstIP → $LastIP)..." -ForegroundColor Gray
Write-Host "    Credentials: $Credentials" -ForegroundColor Gray

$discoveryOutput = "$env:TEMP\crm-netdiscovery-$(Get-Random).xml"
try {
  & $netdiscovery --first $FirstIP --last $LastIP --credentials $Credentials --output $discoveryOutput 2>&1
  if (-not (Test-Path $discoveryOutput)) {
    Write-Host "[!] Discovery không tìm thấy thiết bị nào." -ForegroundColor Yellow
    exit 0
  }
} catch {
  Write-Host "[!] Lỗi discovery: $_" -ForegroundColor Red
  exit 1
}

Write-Host "[OK] Discovery hoàn tất." -ForegroundColor Green

# ─── Đọc danh sách IP từ kết quả discovery ───────────────────
# GLPI netdiscovery output XML có dạng <DEVICE><IP>...</IP></DEVICE>
$discoveryContent = Get-Content $discoveryOutput -Raw
$discoveredIPs = @()
if ($discoveryContent -match '<IP>([^<]+)</IP>') {
  $discoveredIPs = [regex]::Matches($discoveryContent, '<IP>([^<]+)</IP>') | ForEach-Object { $_.Groups[1].Value }
}

if ($discoveredIPs.Count -eq 0) {
  Write-Host "[!] Không tìm thấy thiết bị SNMP nào trong dải." -ForegroundColor Yellow
  Remove-Item $discoveryOutput -Force -ErrorAction SilentlyContinue
  exit 0
}

Write-Host "[OK] Tìm thấy $($discoveredIPs.Count) thiết bị:" -ForegroundColor Green
$discoveredIPs | ForEach-Object { Write-Host "    $_" -ForegroundColor White }
Write-Host ""

# ─── Bước 2: Network Inventory từng thiết bị ────────────────
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
    Write-Host "    Lỗi: $_" -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "[OK] Inventory hoàn tất." -ForegroundColor Green

# ─── Bước 3: Tập hợp JSON và gửi về CRM ────────────────────
# Kết quả inventory dạng file XML/JSON, cần inject vào CRM.
# GLPI Agent xuất file riêng cho từng thiết bị.
# Dùng glpi-injector để gửi trực tiếp vào GLPI, hoặc gửi file qua CRM API.

Write-Host "[*] Kết quả discovery + inventory được lưu tại:" -ForegroundColor Gray
Write-Host "    Discovery: $discoveryOutput" -ForegroundColor White
Write-Host "    Các file .xml trong: $env:TEMP\crm-netinv-*" -ForegroundColor White

# Gửi file discovery lên CRM API (định dạng GLPI netinventory)
if ($CrmUrl) {
  Write-Host ""
  Write-Host "[*] Đang gửi kết quả về CRM..." -ForegroundColor Gray
  
  # Parse discovery XML → JSON và POST
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
    Write-Host "[OK] Đã gửi thành công!" -ForegroundColor Green
    if ($response.data) {
      Write-Host "    Submission ID: $($response.data.submissionId)" -ForegroundColor White
      Write-Host "    Thiết bị: $($response.data.deviceCount)" -ForegroundColor White
    }
  } catch {
    Write-Host "[!] Lỗi gửi về CRM: $_" -ForegroundColor Red
    Write-Host "    File XML vẫn được giữ lại. Có thể inject thủ công." -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "[*] Để inject trực tiếp vào GLPI server:" -ForegroundColor Gray
Write-Host "    glpi-injector -f `"$discoveryOutput`" --url https://glpi.company.com/front/inventory.php" -ForegroundColor White
Write-Host ""

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  HOÀN TẤT" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
