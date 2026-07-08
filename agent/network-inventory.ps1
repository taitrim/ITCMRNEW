<#
.SYNOPSIS
  Network Inventory Wrapper - using glpi-netdiscovery + glpi-netinventory
.DESCRIPTION
  Calls official GLPI Agent tools to scan network and collect inventory
  of network devices (switch, router, firewall, AP...).

  Auto-installs GLPI Agent if not found (Windows: winget/MSI)
  On Linux/macOS: run with native package manager before this script.

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
.PARAMETER AutoInstall
  Auto-install GLPI Agent without prompting (default: prompt)

.EXAMPLE
  .\network-inventory.ps1 -FirstIP 192.168.1.1 -LastIP 192.168.1.254 -Credentials "version:2c,community:public"

.EXAMPLE
  .\network-inventory.ps1 -FirstIP 10.0.0.1 -LastIP 10.0.0.254 -Credentials "version:2c,community:crmro" -CrmUrl "https://crm.company.com/api/agent-inventory/network-import?customerId=abc" -AutoInstall
#>

param(
  [Parameter(Mandatory = $true)]
  [string]$FirstIP,
  [Parameter(Mandatory = $true)]
  [string]$LastIP,
  [string]$Credentials = "version:2c,community:public",
  [string]$CrmUrl = "",
  [string]$OutputFile = "",
  [switch]$AutoInstall = $false
)

# ─── Helper: find command ────────────────────────────────────
function Find-Command {
  param([string]$Name)
  # Method 1: Get-Command (PATH check)
  $result = Get-Command $Name -ErrorAction SilentlyContinue
  if ($result) { return $result.Source }
  # Method 2: where.exe (Windows PATH check, more reliable)
  $where = where.exe $Name 2>$null
  if ($where) { return $where[0] }
  # Method 3: Search common install locations (no depth limit)
  $searchRoots = @(
    "$env:ProgramFiles",
    "${env:ProgramFiles(x86)}",
    "$env:LOCALAPPDATA",
    "$env:ProgramData",
    "$env:SystemRoot"
  )
  foreach ($root in $searchRoots) {
    $match = Get-ChildItem -Path $root -Filter "$Name*" -Recurse -ErrorAction SilentlyContinue |
      Where-Object { -not $_.PSIsContainer } |
      Select-Object -First 1
    if ($match) { return $match.FullName }
  }
  # Method 4: Search by partial name (*netdiscovery* / *netinventory*)
  $partialName = $Name -replace "glpi-", ""
  foreach ($root in $searchRoots) {
    $match = Get-ChildItem -Path $root -Filter "*$partialName*" -Recurse -ErrorAction SilentlyContinue |
      Where-Object { -not $_.PSIsContainer } |
      Select-Object -First 1
    if ($match) { return $match.FullName }
  }
  return $null
}

# ─── Refresh PATH from registry (reload after install) ──────
function Update-SessionPath {
  # Reload machine PATH from registry
  $machinePath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::Machine)
  $userPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::User)
  if ($machinePath) { $env:Path = "$machinePath;$env:Path" }
  if ($userPath) { $env:Path = "$userPath;$env:Path" }
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  CRM Network Inventory - GLPI Agent" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ─── GLPI Agent version ─────────────────────────────────────
$GLPI_VERSION = "1.18"

# ─── Check / Install GLPI Agent ─────────────────────────────
function Install-GLPI-Agent {
  Write-Host "[*] GLPI Agent not found. Attempting auto-install..." -ForegroundColor Yellow

  # After any method, refresh PATH and search for binaries
  function Test-InstallSuccess {
    Update-SessionPath
    $foundDiscovery = Find-Command "glpi-netdiscovery"
    $foundInventory = Find-Command "glpi-netinventory"
    if ($foundDiscovery -and $foundInventory) {
      $script:netdiscovery = $foundDiscovery
      $script:netinventory = $foundInventory
      return $true
    }
    return $false
  }

  # Method 1: winget
  $winget = Get-Command "winget" -ErrorAction SilentlyContinue
  if ($winget) {
    Write-Host "    Checking winget for GLPI Agent..." -ForegroundColor Gray
    $null = & winget install "glpi-agent" --accept-package-agreements --silent 2>&1
    $exitCode = $LASTEXITCODE
    # winget returns non-zero if already installed with no upgrade available
    # That's OK - it means the package IS installed
    if (Test-InstallSuccess) {
      Write-Host "[OK] GLPI Agent found (via winget)." -ForegroundColor Green
      return $true
    }
    Write-Host "    winget done (code: $exitCode). Binaries not found yet. Trying next..." -ForegroundColor DarkYellow
  }

  # Method 2: Download MSI and install silently (needs admin)
  $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if ($isAdmin) {
    $msiUrl = "https://github.com/glpi-project/glpi-agent/releases/download/v$GLPI_VERSION/GLPI-Agent-$GLPI_VERSION-x64.msi"
    $msiPath = "$env:TEMP\GLPI-Agent-$GLPI_VERSION-x64.msi"
    Write-Host "    Downloading GLPI Agent MSI..." -ForegroundColor Gray
    try {
      Invoke-WebRequest -Uri $msiUrl -OutFile $msiPath -TimeoutSec 60 -ErrorAction Stop
      Write-Host "    Installing MSI silently..." -ForegroundColor Gray
      Start-Process msiexec.exe -ArgumentList "/i `"$msiPath`" /quiet /norestart" -Wait -NoNewWindow
      Remove-Item $msiPath -Force -ErrorAction SilentlyContinue
      if (Test-InstallSuccess) {
        Write-Host "[OK] Installed via MSI." -ForegroundColor Green
        return $true
      }
    } catch {
      Write-Host "    MSI failed: $_" -ForegroundColor DarkYellow
    }
  } else {
    Write-Host "    MSI install requires Administrator privileges." -ForegroundColor DarkYellow
  }

  # Method 3: Download portable ZIP, extract to temp, use directly
  Write-Host "    Trying portable ZIP..." -ForegroundColor Gray
  $zipUrl = "https://github.com/glpi-project/glpi-agent/releases/download/v$GLPI_VERSION/GLPI-Agent-$GLPI_VERSION-x64.zip"
  $zipPath = "$env:TEMP\glpi-agent.zip"
  $extractPath = "$env:TEMP\glpi-agent-portable"
  try {
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -TimeoutSec 60 -ErrorAction Stop
    Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force -ErrorAction Stop
    Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
    # Add bin dirs to PATH for this session
    $binPaths = @(
      "$extractPath\GLPI-Agent\bin",
      "$extractPath\GLPI-Agent\perl\bin",
      "$extractPath\GLPI-Agent\perl\site\bin"
    )
    foreach ($bp in $binPaths) {
      if (Test-Path $bp) {
        $env:Path = "$bp;$env:Path"
      }
    }
    if (Test-InstallSuccess) {
      Write-Host "[OK] Extracted portable GLPI Agent." -ForegroundColor Green
      return $true
    }
  } catch {
    Write-Host "    Portable ZIP failed: $_" -ForegroundColor DarkYellow
  }

  return $false
}

# Check and auto-install
$netdiscovery = Find-Command "glpi-netdiscovery"
$netinventory = Find-Command "glpi-netinventory"

if (-not $netdiscovery -or -not $netinventory) {
  $shouldInstall = $AutoInstall
  if (-not $shouldInstall) {
    Write-Host "[?] GLPI Agent not found. Install automatically? (Y/N)" -ForegroundColor Yellow
    $response = Read-Host "    "
    $shouldInstall = ($response -eq "Y" -or $response -eq "y" -or $response -eq "yes")
  }

  if ($shouldInstall) {
    $installed = Install-GLPI-Agent
    if ($installed) {
      # Re-check after install
      $netdiscovery = Find-Command "glpi-netdiscovery"
      $netinventory = Find-Command "glpi-netinventory"
    }
  }

  if (-not $netdiscovery -or -not $netinventory) {
    Write-Host "[!] GLPI Agent still not available." -ForegroundColor Red
    Write-Host "    Install manually:" -ForegroundColor Yellow
    Write-Host "      winget install glpi-agent" -ForegroundColor Yellow
    Write-Host "      choco install glpi-agent" -ForegroundColor Yellow
    Write-Host "      https://github.com/glpi-project/glpi-agent/releases" -ForegroundColor Yellow
    exit 1
  }
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
