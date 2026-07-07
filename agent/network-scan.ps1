<#
.SYNOPSIS
  Network SNMP Scanner — GLPI-style network device discovery
.DESCRIPTION
  Quét mạng bằng SNMP, phát hiện switch/router/firewall/AP/UPS/camera IP.
  Xuất JSON theo format GLPI Network Inventory, gửi về CRM (tuỳ chọn).
.PARAMETER Subnet
  Subnet cần quét (VD: "192.168.1.0/24" hoặc range "192.168.1.1-192.168.1.254")
.PARAMETER Community
  SNMP community string (mặc định: "public")
.PARAMETER Ports
  SNMP port (mặc định: 161)
.PARAMETER SnmpVersion
  SNMP version: "2c" (mặc định) hoặc "1"
.PARAMETER Timeout
  Timeout mỗi host (giây, mặc định: 3)
.PARAMETER Threads
  Số luồng đồng thời (mặc định: 10)
.PARAMETER CrmUrl
  (Tuỳ chọn) URL CRM API: https://crm.domain.com/api/agent-inventory/network-import?customerId=XXX&key=YYY
  Nếu có → tự động POST kết quả sau khi scan.
.PARAMETER OutputFile
  (Tuỳ chọn) Ghi JSON ra file.
.PARAMETER SnmpwalkPath
  Đường dẫn đến snmpwalk.exe (mặc định: tự tìm trong PATH)
.EXAMPLE
  # Quét nhanh, xuất ra console
  .\network-scan.ps1 -Subnet "192.168.1.0/24" -Community "public"
.EXAMPLE
  # Quét + POST về CRM + ghi file
  .\network-scan.ps1 -Subnet "10.0.0.0/16" -Community "crmro" -CrmUrl "https://crm.company.com/api/agent-inventory/network-import?customerId=abc&key=xyz" -OutputFile "scan-result.json"
#>

param(
  [Parameter(Mandatory = $true)]
  [string]$Subnet,
  [string]$Community = "public",
  [int]$Port = 161,
  [ValidateSet("1", "2c")]
  [string]$SnmpVersion = "2c",
  [int]$Timeout = 3,
  [int]$Threads = 10,
  [string]$CrmUrl = "",
  [string]$OutputFile = "",
  [string]$SnmpwalkPath = ""
)

# ─── Header ─────────────────────────────────────────────────────
$host.UI.RawUI.WindowTitle = "CRM Network SNMP Scanner"
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  CRM Network SNMP Scanner" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ─── Kiểm tra snmpwalk ──────────────────────────────────────────
if (-not $SnmpwalkPath) {
  $SnmpwalkPath = Get-Command "snmpwalk.exe" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
}
if (-not $SnmpwalkPath) {
  # Try common locations
  $candidates = @(
    "$env:ProgramFiles\SNMPWalk\snmpwalk.exe",
    "${env:ProgramFiles(x86)}\SNMPWalk\snmpwalk.exe",
    "$env:SystemRoot\System32\snmpwalk.exe",
    "$env:LOCALAPPDATA\snmpwalk\snmpwalk.exe"
  )
  foreach ($c in $candidates) {
    if (Test-Path $c) { $SnmpwalkPath = $c; break }
  }
}
if (-not $SnmpwalkPath) {
  Write-Host "[!] snmpwalk.exe không tìm thấy." -ForegroundColor Yellow
  Write-Host "    Cài đặt:" -ForegroundColor Yellow
  Write-Host "      choco install snmpwalk" -ForegroundColor Yellow
  Write-Host "      winget install snmpwalk" -ForegroundColor Yellow
  Write-Host "      Hoặc tải: https://snmpsoft.com/snmp-walk-tool/" -ForegroundColor Yellow
  Write-Host "    Hoặc dùng WSL: sudo apt install snmp" -ForegroundColor Yellow
  exit 1
}
Write-Host "[OK] snmpwalk: $SnmpwalkPath" -ForegroundColor Green

# ─── Parse subnet ───────────────────────────────────────────────
Write-Host "[*] Phân tích subnet: $Subnet" -ForegroundColor Gray
$hosts = @()
if ($Subnet -match '^(\d+\.\d+\.\d+\.\d+)/(\d+)$') {
  $ipBase = $Matches[1]
  $cidr = [int]$Matches[2]
  $ipParts = $ipBase -split '\.' | ForEach-Object { [int]$_ }
  $maskBits = (-bnot [uint32]((1 -shl (32 - $cidr)) - 1))
  $ipInt = ($ipParts[0] -shl 24) + ($ipParts[1] -shl 16) + ($ipParts[2] -shl 8) + $ipParts[3]
  $networkInt = $ipInt -band $maskBits
  $broadcastInt = $networkInt -bor (-bnot $maskBits)
  $startInt = $networkInt + 1
  $endInt = $broadcastInt - 1
  for ($i = $startInt; $i -le $endInt; $i++) {
    $hosts += "$(($i -shr 24) -band 0xFF).$(($i -shr 16) -band 0xFF).$(($i -shr 8) -band 0xFF).$($i -band 0xFF)"
  }
} elseif ($Subnet -match '^(\d+\.\d+\.\d+\.\d+)-(\d+\.\d+\.\d+\.\d+)$') {
  $startParts = $Matches[1] -split '\.' | ForEach-Object { [int]$_ }
  $endParts = $Matches[2] -split '\.' | ForEach-Object { [int]$_ }
  $startInt = ($startParts[0] -shl 24) + ($startParts[1] -shl 16) + ($startParts[2] -shl 8) + $startParts[3]
  $endInt = ($endParts[0] -shl 24) + ($endParts[1] -shl 16) + ($endParts[2] -shl 8) + $endParts[3]
  for ($i = $startInt; $i -le $endInt; $i++) {
    $hosts += "$(($i -shr 24) -band 0xFF).$(($i -shr 16) -band 0xFF).$(($i -shr 8) -band 0xFF).$($i -band 0xFF)"
  }
} else {
  Write-Host "[!] Sai định dạng subnet. VD: 192.168.1.0/24 hoặc 192.168.1.1-192.168.1.254" -ForegroundColor Red
  exit 1
}
Write-Host "[*] Số IP cần quét: $($hosts.Count)" -ForegroundColor Gray

# ─── Ping sweep (fast) ──────────────────────────────────────────
Write-Host "[*] Đang ping sweep..." -ForegroundColor Gray
$aliveHosts = [System.Collections.Concurrent.ConcurrentBag[string]]::new()
$count = 0
$sync = [Hashtable]::Synchronized(@{ Count = 0 })

$pingJobs = foreach ($chunk in ($hosts | ForEach-Object { $_ } | Group-Object { [math]::Floor([math]::Max(0, [array]::IndexOf($hosts, $_)) / $Threads) })) {
  Start-Job -ScriptBlock {
    param($ips, $aliveBag, $sync, $total)
    foreach ($ip in $ips) {
      try {
        $ping = [System.Net.NetworkInformation.Ping]::new()
        $reply = $ping.Send($ip, 1500)  # 1.5s timeout
        if ($reply.Status -eq 'Success') {
          $aliveBag.Add($ip)
        }
      } catch {}
      [System.Threading.Interlocked]::Increment([ref]$sync.Count)
      $done = $sync.Count
      $pct = [math]::Round($done / $total * 100)
      Write-Progress -Activity "Ping sweep" -Status "$done/$total ($pct%)" -PercentComplete $pct
    }
  } -ArgumentList $chunk.Group, $aliveHosts, $sync, $hosts.Count
}

$pingJobs | Wait-Job -Timeout 120 | Out-Null
$pingJobs | Remove-Job -Force -ErrorAction SilentlyContinue
$aliveList = $aliveHosts.ToArray() | Sort-Object { [version]$_ }
Write-Host "[OK] Sống: $($aliveList.Count)/$($hosts.Count)" -ForegroundColor Green

if ($aliveList.Count -eq 0) {
  Write-Host "[!] Không có host nào phản hồi. Kiểm tra kết nối mạng." -ForegroundColor Yellow
  exit 0
}

# ─── SNMP query function ────────────────────────────────────────
function Invoke-Snmp([string]$Ip, [string]$Oid) {
  $arg = "-v$SnmpVersion -c $Community -Oqv -t $Timeout -r 1 $Ip $Oid"
  try {
    $result = & $SnmpwalkPath $arg 2>$null
    if ($LASTEXITCODE -eq 0 -and $result) { return $result } else { return $null }
  } catch { return $null }
}

function Invoke-SnmpTable([string]$Ip, [string]$Oid) {
  $arg = "-v$SnmpVersion -c $Community -OQn -t $Timeout -r 1 $Ip $Oid"
  try {
    $result = & $SnmpwalkPath $arg 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $result) { return @() }
    return $result | ForEach-Object {
      if ($_ -match '\.(\d+(?:\.\d+)*)\s+(.*)') {
        @{ Oid = $Matches[1]; Value = $Matches[2].Trim() }
      }
    } | Where-Object { $_ }
  } catch { return @() }
}

function Get-StringValue([string]$Ip, [string]$Oid) {
  $raw = Invoke-Snmp $Ip $Oid
  if (-not $raw) { return "" }
  $raw = $raw.Trim()
  # Remove leading/trailing quotes
  if ($raw.StartsWith('"') -and $raw.EndsWith('"')) { $raw = $raw.Substring(1, $raw.Length - 2) }
  # HEX string
  if ($raw -match '^[0-9A-Fa-f\s:]+$' -and $raw.Length -gt 10) { return $raw }
  return $raw
}

function Get-IntValue([string]$Ip, [string]$Oid) {
  $raw = Invoke-Snmp $Ip $Oid
  if (-not $raw) { return 0 }
  $raw = $raw.Trim()
  $v = 0; [int]::TryParse($raw, [ref]$v) | Out-Null
  return $v
}

# ─── Collect device info ────────────────────────────────────────
$devices = [System.Collections.Concurrent.ConcurrentBag[PSObject]]::new()
$scanCount = 0

Write-Host "[*] Đang thu thập thông tin SNMP..." -ForegroundColor Gray
$scanJobs = foreach ($chunk in ($aliveList | ForEach-Object { $_ } | Group-Object { [math]::Floor([math]::Max(0, [array]::IndexOf($aliveList, $_)) / $Threads) })) {
  Start-Job -ScriptBlock {
    param($ips, $community, $sVersion, $timeout, $port, $deviceBag, $syncCount, $total, $snmpWalk)
    foreach ($ip in $ips) {
      $device = @{ ip = $ip; type = "unknown"; manufacturer = ""; model = ""; serial = ""; firmware = ""; name = ""; mac = ""; sysDescr = ""; sysObjectID = ""; uptime = ""; portCount = 0; ports = @(); }
      $argBase = "-v$sVersion -c $community -t $timeout -r 1 $ip"

      # 1. sysDescr (.1.3.6.1.2.1.1.1.0)
      $sysDescr = try { & $snmpWalk $argBase .1.3.6.1.2.1.1.1.0 2>$null } catch { $null }
      if (-not $sysDescr -or $LASTEXITCODE -ne 0) { continue }  # No SNMP → skip
      $device.sysDescr = ($sysDescr -replace '^"|"$', '').Trim()

      # 2. sysObjectID (.1.3.6.1.2.1.1.2.0)
      $sysOID = try { & $snmpWalk $argBase .1.3.6.1.2.1.1.2.0 2>$null } catch { $null }
      if ($sysOID) { $device.sysObjectID = $sysOID.Trim() }

      # 3. sysName (.1.3.6.1.2.1.1.5.0)
      $sysName = try { & $snmpWalk $argBase .1.3.6.1.2.1.1.5.0 2>$null } catch { $null }
      if ($sysName) { $device.name = ($sysName -replace '^"|"$', '').Trim() }

      # 4. sysUptime (.1.3.6.1.2.1.1.3.0)
      $uptimeTicks = try { & $snmpWalk $argBase .1.3.6.1.2.1.1.3.0 2>$null } catch { $null }
      if ($uptimeTicks) {
        $ticks = [long]($uptimeTicks.Trim() -replace '.*: ', '')
        $secs = $ticks / 100
        $days = [math]::Floor($secs / 86400)
        $hours = [math]::Floor(($secs % 86400) / 3600)
        $mins = [math]::Floor(($secs % 3600) / 60)
        $device.uptime = "$days days, $hours:$mins"
      }

      # 5. ifTable — port info
      $portTable = try {
        $raw = & $snmpWalk "$argBase -OQn" .1.3.6.1.2.1.2.2.1 2>$null
        if ($LASTEXITCODE -eq 0 -and $raw) {
          $entries = @{}
          foreach ($line in $raw) {
            if ($line -match '\.1\.3\.6\.1\.2\.1\.2\.2\.1\.(\d+)\.(\d+)\s+(.*)') {
              $field = [int]$Matches[1]
              $idx = $Matches[2]
              $val = $Matches[3].Trim()
              if (-not $entries[$idx]) { $entries[$idx] = @{} }
              switch ($field) {
                1 { $entries[$idx].Index = $idx }
                2 { $entries[$idx].Name = ($val -replace '^"|"$', '') }
                3 { $entries[$idx].Type = $val }
                5 { $entries[$idx].Speed = [long]($val) }
                6 { $entries[$idx].PhysAddress = $val -replace '[\s:]' -replace '^0x' }
                7 { $entries[$idx].AdminStatus = $val }
                8 { $entries[$idx].OperStatus = switch ($val) { "1" { "up" } "2" { "down" } default { "disabled" } } }
              }
            }
          }
          $entries.Values | Where-Object { $_.OperStatus -eq "up" -or $_.AdminStatus -eq "1" }
        } else { @() }
      } catch { @() }

      $device.ports = $portTable | ForEach-Object {
        $mac = if ($_.PhysAddress -and $_.PhysAddress -ne '0' -and $_.PhysAddress.Length -ge 12) {
          ($_.PhysAddress -replace '(.{2})', '$1:').TrimEnd(':').ToUpper()
        } else { "" }
        @{
          name = $_.Name
          speed = [long]($_.Speed)
          status = $_.OperStatus
          mac = $mac
          type = switch ([int]($_.Type)) {
            6 { "ethernet" }
            7 { "802.3" }
            117 { "gigabit-ethernet" }
            135 { "10g-ethernet" }
            default { "other" }
          }
        }
      }
      $device.portCount = $device.ports.Count

      # 6. MAC address table (dot1dTpFdbTable)
      $macTable = try {
        & $snmpWalk "$argBase -OQn" .1.3.6.1.2.1.17.4.3.1.1 2>$null
      } catch { $null }
      if ($macTable -and $LASTEXITCODE -eq 0) {
        $macs = $macTable | ForEach-Object {
          if ($_ -match '\s+([0-9A-Fa-f\s]+)$') {
            $m = $Matches[1] -replace '\s+', ''
            if ($m.Length -ge 12) {
              ($m -replace '(.{2})', '$1:').TrimEnd(':').ToUpper()
            }
          }
        } | Where-Object { $_ -and $_ -ne '00:00:00:00:00:00' } | Select-Object -Unique
        $device.mac = $macs | Select-Object -First 1
      }

      # 7. LLDP neighbors (lldpRemSysName)
      $lldp = try {
        & $snmpWalk "$argBase -OQn" .1.0.8802.1.1.2.1.4.1.1.9 2>$null
      } catch { $null }
      if ($lldp -and $LASTEXITCODE -eq 0) {
        $device.ports = $device.ports | ForEach-Object {
          $p = $_;
          # Find neighbor by port name matching
          $neighborInfo = $lldp | ForEach-Object {
            if ($_ -match '\.(\d+)\s+"(.*)"') {
              @{ PortIdx = $Matches[1]; Name = $Matches[2] }
            }
          } | Where-Object { $_ }
          if ($neighborInfo) {
            $p.neighbor = ($neighborInfo | Select-Object -First 1).Name
          }
          $p
        }
      }

      # 8. Detect device type from sysDescr/sysObjectID
      $sd = $device.sysDescr.ToLower()
      $so = $device.sysObjectID
      if ($sd -match 'cisco ios|cisco catalyst|cisco nexus') { $device.type = "switch" }
      elseif ($sd -match 'cisco asa|cisco firepower|fortinet|fortigate|palo alto|checkpoint|sonicwall') { $device.type = "firewall" }
      elseif ($sd -match 'cisco isr|router|hub') { $device.type = "router" }
      elseif ($sd -match 'unifi|ap$|access point|wlan|wireless') { $device.type = "ap" }
      elseif ($sd -match 'ups|apc|smart-?ups|symmetra') { $device.type = "ups" }
      elseif ($sd -match 'camera|axis|hikvision|dahua|rtsp') { $device.type = "camera" }
      elseif ($sd -match 'switch|procurve|provision|aruba') { $device.type = "switch" }
      elseif ($sd -match 'load.?balancer|f5|big-?ip') { $device.type = "load-balancer" }
      elseif ($sd -match 'ont|onu|gpon|ftth') { $device.type = "ont" }
      else { $device.type = "switch" }  # default

      # 9. Manufacturer from sysDescr
      if ($sd -match 'cisco') { $device.manufacturer = "Cisco" }
      elseif ($sd -match 'hp|procurve|aruba') { $device.manufacturer = "HP Aruba" }
      elseif ($sd -match 'dell|force10|powerconnect') { $device.manufacturer = "Dell" }
      elseif ($sd -match 'juniper|junos|m&s|ex') { $device.manufacturer = "Juniper" }
      elseif ($sd -match 'fortinet|fortigate') { $device.manufacturer = "Fortinet" }
      elseif ($sd -match 'palo.?alto|pan-?os') { $device.manufacturer = "Palo Alto" }
      elseif ($sd -match 'ubiquiti|unifi') { $device.manufacturer = "Ubiquiti" }
      elseif ($sd -match 'mikrotik|routeros') { $device.manufacturer = "MikroTik" }
      elseif ($sd -match 'huawei') { $device.manufacturer = "Huawei" }
      elseif ($sd -match 'apc|schneider') { $device.manufacturer = "APC" }
      elseif ($sd -match 'axis') { $device.manufacturer = "Axis" }
      elseif ($sd -match 'hikvision') { $device.manufacturer = "Hikvision" }
      elseif ($sd -match 'dahua') { $device.manufacturer = "Dahua" }
      elseif ($sd -match 'brocade|foundry') { $device.manufacturer = "Brocade" }
      elseif ($sd -match 'extreme') { $device.manufacturer = "Extreme" }
      elseif ($sd -match 'alcatel|nokia') { $device.manufacturer = "Alcatel-Lucent" }
      else { $device.manufacturer = ($sysDescr -split '[\s,]' | Select-Object -First 2) -join ' ' }

      # 10. Model from sysDescr
      $modelMatch = $sd -match '(?:^|\s)([a-z]+[-\s]?\d[\w-]+(?:[-\s][\w]+){0,3})'
      if ($modelMatch) { $device.model = $Matches[1] }
      if (-not $device.model -and $device.name) { $device.model = $device.name }

      # 11. Serial via ENTITY-MIB (.1.3.6.1.2.1.47.1.1.1.1.11)
      $serial = try { & $snmpWalk "$argBase -Oqv" .1.3.6.1.2.1.47.1.1.1.1.11 2>$null } catch { $null }
      if ($serial -and $LASTEXITCODE -eq 0) {
        $s = $serial.Trim() -replace '^"|"$', ''
        if ($s.Length -gt 3 -and $s.Length -lt 40) { $device.serial = $s }
      }
      # Fallback: serial via entPhysicalSerialNum
      if (-not $device.serial) {
        $serial2 = try { & $snmpWalk "$argBase -Oqv" .1.3.6.1.2.1.47.1.1.1.1.11 2>$null } catch { $null }
        if ($serial2 -and $LASTEXITCODE -eq 0) {
          foreach ($s in $serial2) {
            $s = $s.Trim() -replace '^"|"$', ''
            if ($s.Length -gt 3 -and $s.Length -lt 40 -and $s -notmatch '^\d+$') { $device.serial = $s; break }
          }
        }
      }

      # 12. Firmware via entSoftwareRev (.1.3.6.1.2.1.47.1.1.1.1.10)
      if (-not $device.firmware) {
        $fw = try { & $snmpWalk "$argBase -Oqv" .1.3.6.1.2.1.47.1.1.1.1.10 2>$null } catch { $null }
        if ($fw -and $LASTEXITCODE -eq 0) { $device.firmware = ($fw[0] -replace '^"|"$', '').Trim() }
      }
      # Firmware fallback: từ sysDescr
      if (-not $device.firmware -and $sd -match 'version\s+([\d.()]+)') { $device.firmware = $Matches[1] }

      $deviceBag.Add([PSCustomObject]$device)
      [System.Threading.Interlocked]::Increment([ref]$syncCount.Value)
      $done = $syncCount.Value
      Write-Progress -Activity "Scanning SNMP" -Status "$ip — $($device.manufacturer) $($device.model)" -PercentComplete ($done / $total * 100)
    }
  } -ArgumentList $chunk.Group, $Community, $SnmpVersion, $Timeout, $Port, $devices, ([ref]$scanCount), $aliveList.Count, $SnmpwalkPath
}

$scanJobs | Wait-Job -Timeout 600 | Out-Null
$scanJobs | Remove-Job -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "[OK] Scan hoàn tất! Tìm thấy $($devices.Count) thiết bị mạng." -ForegroundColor Green

# ─── Build output JSON ──────────────────────────────────────────
$output = @{
  action = "network_inventory"
  deviceid = "SNMP-SCAN-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
  content = ($devices.ToArray() | Sort-Object { $_.type, $_.ip }) | ForEach-Object {
    $d = $_
    # Clean ports: bỏ port không tên, sort
    $cleanPorts = $d.ports | Where-Object { $_.name -and $_.name -ne '' } | Sort-Object { [int]($_.name -replace '\D', '0') }
    @{
      type = $d.type
      manufacturer = $d.manufacturer
      model = $d.model
      serial = $d.serial
      name = $d.name
      ip = $d.ip
      mac = $d.mac
      firmware = $d.firmware
      sysDescr = $d.sysDescr
      sysObjectID = $d.sysObjectID
      uptime = $d.uptime
      portCount = $d.portCount
      ports = $cleanPorts
    }
  }
}

$json = $output | ConvertTo-Json -Depth 10

# ─── Output ─────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  KẾT QUẢ" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Summary table
$devices.ToArray() | Sort-Object type, ip | ForEach-Object {
  Write-Host ("  {0,-16} {1,-12} {2,-20} {3}" -f $_.ip, $_.type, $_.manufacturer, $_.model) -ForegroundColor White
}

Write-Host ""
Write-Host "Tổng cộng: $($devices.Count) thiết bị" -ForegroundColor Cyan

# Ghi file
if ($OutputFile) {
  $json | Out-File -FilePath $OutputFile -Encoding utf8
  Write-Host "[OK] Đã ghi file: $OutputFile" -ForegroundColor Green
}

# POST về CRM
if ($CrmUrl) {
  Write-Host ""
  Write-Host "[*] Đang gửi về CRM..." -ForegroundColor Gray
  try {
    $response = Invoke-RestMethod -Uri $CrmUrl -Method Post -Body $json -ContentType "application/json" -TimeoutSec 60
    Write-Host "[OK] Đã gửi thành công!" -ForegroundColor Green
    if ($response.data) {
      Write-Host "    Submission ID: $($response.data.submissionId)" -ForegroundColor White
      Write-Host "    Thiết bị mới: $($response.data.newCount) (chờ duyệt)" -ForegroundColor White
      Write-Host "    Đã match: $($response.data.matchedCount)" -ForegroundColor White
    }
  } catch {
    Write-Host "[!] Lỗi gửi về CRM: $_" -ForegroundColor Red
    Write-Host "    JSON vẫn được giữ lại. Có thể import thủ công." -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  HOÀN TẤT" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
