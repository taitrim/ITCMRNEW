<#
.SYNOPSIS
  Network Inventory Wrapper - using glpi-netdiscovery + glpi-netinventory
.DESCRIPTION
  Calls official GLPI Agent tools to scan network and collect inventory
  of network devices (switch, router, firewall, AP...).

  Auto-installs GLPI Agent if not found (Windows: winget/MSI/portable ZIP).
  Auto-downloads missing Perl modules (NetDiscovery/NetInventory/SNMP) from
  the GLPI Agent GitHub repo if the Windows package lacks them.

  On Linux/macOS: install glpi-agent via package manager before running
  the companion .sh wrapper.

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

# ─── Find GLPI Agent installation directory ─────────────────
function Find-GLPIDir {
  # Where is glpi-agent.exe?
  $agentPath = (Get-Command "glpi-agent.exe" -ErrorAction SilentlyContinue).Source
  if (-not $agentPath) {
    $agentPath = (Get-Command "glpi-agent" -ErrorAction SilentlyContinue).Source
  }
  if (-not $agentPath) {
    $where = where.exe "glpi-agent" 2>$null
    if ($where) { $agentPath = $where[0] }
  }
  if ($agentPath) {
    # glpi-agent.bat wrapper -> up one level
    if ($agentPath -match 'glpi-agent\.bat$') {
      return (Get-Item $agentPath).DirectoryName
    }
    return (Get-Item $agentPath).DirectoryName
  }
  # Search common install locations
  $searches = @(
    "$env:ProgramFiles\GLPI-Agent",
    "${env:ProgramFiles(x86)}\GLPI-Agent",
    "$env:LOCALAPPDATA\GLPI-Agent",
    "$env:ProgramData\GLPI-Agent"
  )
  foreach ($dir in $searches) {
    if (Test-Path $dir) { return $dir }
  }
  return $null
}

# ─── Helper: find command ────────────────────────────────────
function Find-Command {
  param([string]$Name)
  # Method 1: Get-Command (PATH check)
  $result = Get-Command $Name -ErrorAction SilentlyContinue
  if ($result) { return $result.Source }
  # Method 2: where.exe (Windows PATH check)
  $where = where.exe $Name 2>$null
  if ($where) { return $where[0] }
  # Method 3: Search in GLPI Agent install directory
  $glpiDir = Find-GLPIDir
  if ($glpiDir) {
    # Search for exact name (no extension assumed for Perl scripts)
    $found = Get-ChildItem -Path $glpiDir -Recurse -ErrorAction SilentlyContinue |
      Where-Object { -not $_.PSIsContainer -and $_.Name -eq $Name }
    if ($found) { return $found[0].FullName }
    # Wildcard search
    $found = Get-ChildItem -Path $glpiDir -Filter "$Name*" -Recurse -ErrorAction SilentlyContinue |
      Where-Object { -not $_.PSIsContainer } |
      Select-Object -First 1
    if ($found) { return $found.FullName }
  }
  return $null
}

# ─── Force-reload PATH from registry ─────────────────────────
function Update-SessionPath {
  $machinePath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::Machine)
  $userPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::User)
  if ($machinePath) { $env:Path = "$machinePath;$env:Path" }
  if ($userPath) { $env:Path = "$userPath;$env:Path" }
}

# ─── Download missing GLPI Agent modules from GitHub ─────────
function Install-MissingNetworkModules {
  param([string]$GlpiDir)
  Write-Host ""
  Write-Host "[*] GLPI Agent found at: $GlpiDir" -ForegroundColor Cyan
  Write-Host "[*] Downloading missing network modules (NetDiscovery/NetInventory/SNMP)..." -ForegroundColor Yellow

  $repoUrl = "https://github.com/glpi-project/glpi-agent/archive/develop.zip"
  $zipPath = "$env:TEMP\glpi-agent-src-$(Get-Random).zip"
  $extractPath = "$env:TEMP\glpi-agent-src-$(Get-Random)"

  try {
    Write-Host "    Downloading source from GitHub (develop branch)..." -ForegroundColor Gray
    Invoke-WebRequest -Uri $repoUrl -OutFile $zipPath -TimeoutSec 120 -ErrorAction Stop
    Write-Host "    Extracting..." -ForegroundColor Gray
    Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force -ErrorAction Stop
    Remove-Item $zipPath -Force -ErrorAction SilentlyContinue

    $srcRoot = Get-ChildItem -Path $extractPath -Directory | Select-Object -First 1
    if (-not $srcRoot) {
      Write-Host "    [!] Unexpected ZIP structure." -ForegroundColor Red
      return $false
    }
    $srcRoot = $srcRoot.FullName

    # Files to install: source path -> destination (relative to GLPI Agent)
    $fileMap = @(
      # Bin scripts -> perl\bin
      @{src="bin\glpi-netdiscovery";       dst="perl\bin\glpi-netdiscovery"}
      @{src="bin\glpi-netinventory";       dst="perl\bin\glpi-netinventory"}

      # Task modules -> perl\agent
      @{src="lib\GLPI\Agent\Task\NetDiscovery.pm";              dst="perl\agent\GLPI\Agent\Task\NetDiscovery.pm"}
      @{src="lib\GLPI\Agent\Task\NetDiscovery\Job.pm";          dst="perl\agent\GLPI\Agent\Task\NetDiscovery\Job.pm"}
      @{src="lib\GLPI\Agent\Task\NetDiscovery\Version.pm";      dst="perl\agent\GLPI\Agent\Task\NetDiscovery\Version.pm"}
      @{src="lib\GLPI\Agent\Task\NetInventory.pm";              dst="perl\agent\GLPI\Agent\Task\NetInventory.pm"}
      @{src="lib\GLPI\Agent\Task\NetInventory\Job.pm";          dst="perl\agent\GLPI\Agent\Task\NetInventory\Job.pm"}
      @{src="lib\GLPI\Agent\Task\NetInventory\Version.pm";      dst="perl\agent\GLPI\Agent\Task\NetInventory\Version.pm"}

      # Tool modules -> perl\agent
      @{src="lib\GLPI\Agent\Tools\SNMP.pm";                     dst="perl\agent\GLPI\Agent\Tools\SNMP.pm"}
      @{src="lib\GLPI\Agent\Tools\Expiration.pm";               dst="perl\agent\GLPI\Agent\Tools\Expiration.pm"}

      # SNMP base modules -> perl\agent
      @{src="lib\GLPI\Agent\SNMP.pm";                          dst="perl\agent\GLPI\Agent\SNMP.pm"}
      @{src="lib\GLPI\Agent\SNMP\Device.pm";                   dst="perl\agent\GLPI\Agent\SNMP\Device.pm"}
      @{src="lib\GLPI\Agent\SNMP\Device\Components.pm";        dst="perl\agent\GLPI\Agent\SNMP\Device\Components.pm"}
      @{src="lib\GLPI\Agent\SNMP\Hardware.pm";                 dst="perl\agent\GLPI\Agent\SNMP\Hardware.pm"}
      @{src="lib\GLPI\Agent\SNMP\Hardware\Brocade.pm";         dst="perl\agent\GLPI\Agent\SNMP\Hardware\Brocade.pm"}
      @{src="lib\GLPI\Agent\SNMP\Hardware\Qlogic.pm";          dst="perl\agent\GLPI\Agent\SNMP\Hardware\Qlogic.pm"}
      @{src="lib\GLPI\Agent\SNMP\Live.pm";                     dst="perl\agent\GLPI\Agent\SNMP\Live.pm"}
      @{src="lib\GLPI\Agent\SNMP\Mock.pm";                     dst="perl\agent\GLPI\Agent\SNMP\Mock.pm"}
      @{src="lib\GLPI\Agent\SNMP\MibSupport.pm";               dst="perl\agent\GLPI\Agent\SNMP\MibSupport.pm"}
      @{src="lib\GLPI\Agent\SNMP\Security\USM.pm";             dst="perl\agent\GLPI\Agent\SNMP\Security\USM.pm"}
    )

    # MIB Support vendor files - collect all
    $mibFiles = Get-ChildItem -Path "$srcRoot\lib\GLPI\Agent\SNMP\MibSupport" -Filter "*.pm" -ErrorAction SilentlyContinue
    foreach ($mibFile in $mibFiles) {
      $fileMap += @{src="lib\GLPI\Agent\SNMP\MibSupport\$($mibFile.Name)"; dst="perl\agent\GLPI\Agent\SNMP\MibSupport\$($mibFile.Name)"}
    }

    $installed = 0
    $errors = 0
    foreach ($entry in $fileMap) {
      $srcFile = Join-Path $srcRoot $entry.src
      $dstFile = Join-Path $GlpiDir $entry.dst
      if (-not (Test-Path $srcFile)) {
        # Some MIB files are .pm w/o extension? Check all files in MibSupport dir
        continue
      }
      $dstDir = Split-Path $dstFile -Parent
      if (-not (Test-Path $dstDir)) {
        New-Item -ItemType Directory -Path $dstDir -Force -ErrorAction SilentlyContinue | Out-Null
      }
      try {
        Copy-Item -Path $srcFile -Destination $dstFile -Force -ErrorAction Stop
        $installed++
      } catch {
        Write-Host "    [!] Failed to copy $($entry.dst): $_" -ForegroundColor DarkYellow
        $errors++
      }
    }

    # Clean up
    Remove-Item -Path $extractPath -Recurse -Force -ErrorAction SilentlyContinue

    Write-Host "    Installed $installed files ($errors errors)." -ForegroundColor Gray
    return ($installed -gt 0)
  } catch {
    Write-Host "    [!] Failed to download/extract: $_" -ForegroundColor Red
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force -ErrorAction SilentlyContinue }
    if (Test-Path $extractPath) { Remove-Item $extractPath -Recurse -Force -ErrorAction SilentlyContinue }
    return $false
  }
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  CRM Network Inventory - GLPI Agent" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ─── GLPI Agent version (for installer) ─────────────────────
$GLPI_VERSION = "1.18"

# ─── Check / Install GLPI Agent ─────────────────────────────
function Install-GLPI-Agent {
  Write-Host "[*] GLPI Agent not found. Attempting auto-install..." -ForegroundColor Yellow

  function Test-InstallSuccess {
    Update-SessionPath
    $script:glpiDir = Find-GLPIDir
    return ($null -ne $script:glpiDir)
  }

  # Method 1: winget
  $winget = Get-Command "winget" -ErrorAction SilentlyContinue
  if ($winget) {
    Write-Host "    Checking winget for GLPI Agent..." -ForegroundColor Gray
    $null = & winget install "glpi-agent" --accept-package-agreements --silent 2>&1
    if (Test-InstallSuccess) {
      Write-Host "[OK] GLPI Agent found (via winget)." -ForegroundColor Green
      return $true
    }
    Write-Host "    winget done. Binaries not found yet." -ForegroundColor DarkYellow
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

# ─── Find GLPI Agent ─────────────────────────────────────────
$glpiDir = Find-GLPIDir

if (-not $glpiDir) {
  $shouldInstall = $AutoInstall
  if (-not $shouldInstall) {
    Write-Host "[?] GLPI Agent not found. Install automatically? (Y/N)" -ForegroundColor Yellow
    $response = Read-Host "    "
    $shouldInstall = ($response -eq "Y" -or $response -eq "y" -or $response -eq "yes")
  }

  if ($shouldInstall) {
    $installed = Install-GLPI-Agent
    if ($installed) {
      $glpiDir = Find-GLPIDir
    }
  }

  if (-not $glpiDir) {
    Write-Host "[!] GLPI Agent still not available." -ForegroundColor Red
    Write-Host "    Install manually:" -ForegroundColor Yellow
    Write-Host "      winget install glpi-agent" -ForegroundColor Yellow
    Write-Host "      choco install glpi-agent" -ForegroundColor Yellow
    Write-Host "      https://github.com/glpi-project/glpi-agent/releases" -ForegroundColor Yellow
    exit 1
  }
}

Write-Host "[OK] GLPI Agent directory: $glpiDir" -ForegroundColor Green

# ─── GLPI Agent Perl interpreter ────────────────────────────
$perlExe = Join-Path $glpiDir "perl\bin\glpi-agent.exe"
if (-not (Test-Path $perlExe)) {
  Write-Host "[!] Perl interpreter not found at $perlExe" -ForegroundColor Red
  exit 1
}
$perlAgentDir = Join-Path $glpiDir "perl\agent"

# ─── Check / Install missing modules ────────────────────────
$netdiscoveryScript = Join-Path $glpiDir "perl\bin\glpi-netdiscovery"
$netinventoryScript = Join-Path $glpiDir "perl\bin\glpi-netinventory"
$netDiscoveryModule = Join-Path $perlAgentDir "GLPI\Agent\Task\NetDiscovery.pm"

if (-not (Test-Path $netdiscoveryScript) -or -not (Test-Path $netDiscoveryModule)) {
  Write-Host "[*] Network modules not found in GLPI Agent installation." -ForegroundColor Yellow
  Write-Host "    The Windows GLPI Agent package does not include NetDiscovery/NetInventory." -ForegroundColor Gray
  Write-Host "    Downloading missing modules from GLPI Agent GitHub..." -ForegroundColor Gray
  $modulesOk = Install-MissingNetworkModules -GlpiDir $glpiDir
  if (-not $modulesOk) {
    Write-Host "[!] Failed to install network modules." -ForegroundColor Red
    Write-Host "    Falling back to ping-based discovery only." -ForegroundColor DarkYellow

    # Fallback: use simple ping sweep + manual SNMP
    Write-Host ""
    Write-Host "[*] Fallback: ping sweep $FirstIP -> $LastIP..." -ForegroundColor Gray
    $liveIPs = @()
    $ipParts = $FirstIP -split '\.'
    $start = [int]$ipParts[3]
    $endParts = $LastIP -split '\.'
    $end = [int]$endParts[3]
    if ($start -gt $end) { $tmp = $start; $start = $end; $end = $tmp }
    for ($i = $start; $i -le $end; $i++) {
      $ip = "$($ipParts[0]).$($ipParts[1]).$($ipParts[2]).$i"
      if (Test-Connection -ComputerName $ip -Count 1 -Quiet -ErrorAction SilentlyContinue) {
        Write-Host "    $ip - alive" -ForegroundColor White
        $liveIPs += $ip
      }
    }
    if ($liveIPs.Count -eq 0) {
      Write-Host "[!] No live hosts found." -ForegroundColor Yellow
    } else {
      Write-Host "[OK] Found $($liveIPs.Count) live hosts." -ForegroundColor Green
    }
    $discoveredIPs = $liveIPs
  }
}

# Re-check after install
$hasNetdiscovery = Test-Path $netdiscoveryScript
$hasNetinventory = Test-Path $netinventoryScript
$hasNetDiscoveryModule = Test-Path $netDiscoveryModule

if ($hasNetdiscovery -and $hasNetDiscoveryModule) {
  Write-Host "[OK] glpi-netdiscovery: $netdiscoveryScript" -ForegroundColor Green
  Write-Host "[OK] glpi-netinventory: $netinventoryScript" -ForegroundColor Green
  Write-Host ""

  # ─── Step 1: Network Discovery ─────────────────────────────
  Write-Host "[*] Step 1: Network Discovery ($FirstIP -> $LastIP)..." -ForegroundColor Gray
  Write-Host "    Credentials: $Credentials" -ForegroundColor Gray

  $discoveryDir = "$env:TEMP\crm-netdiscovery-$(Get-Random)"
  New-Item -ItemType Directory -Path $discoveryDir -Force -ErrorAction SilentlyContinue | Out-Null

  try {
    # Parse credentials into --community for glpi-netdiscovery
    # Format: "version:2c,community:public" or "version:3,username:foo,authpassword:bar"
    $discoveryArgs = @(
      "--first", $FirstIP,
      "--last", $LastIP,
      "--save", $discoveryDir,
      "--debug"
    )
    if ($Credentials -match 'community:(\S+)') {
      $community = $matches[1]
      $discoveryArgs += "--community", $community
    }
    if ($Credentials -match 'version:(\S+)') {
      $version = $matches[1]
      if ($version -eq "1") { $discoveryArgs += "--v1" }
    }
    # Default to v2c
    if ($discoveryArgs -notcontains "--v1") {
      $discoveryArgs += "--v2c"
    }

    Write-Host "    Scanning $FirstIP -> $LastIP (this may take a few minutes)..." -ForegroundColor DarkGray
    Write-Host "    Output dir: $discoveryDir" -ForegroundColor DarkGray

    # Run discovery: capture stderr (log messages) separately from stdout
    $discResult = & $perlExe $netdiscoveryScript @discoveryArgs 2>&1

    # Filter out log/info messages from stderr — show only notable warnings
    $discWarnings = $discResult | Where-Object { $_ -is [string] -and $_ -match "(no mibsupport|warning|error|abort|failed)" }
    if ($discWarnings) {
      $discWarnings | ForEach-Object { Write-Host "    [agent] $_" -ForegroundColor DarkYellow }
    }

    # Collect XML results
    $xmlFiles = Get-ChildItem -Path $discoveryDir -Filter "*.xml" -ErrorAction SilentlyContinue
    if ($xmlFiles.Count -eq 0) {
      Write-Host "[!] Discovery found no devices." -ForegroundColor Yellow
    } else {
      Write-Host "[OK] Discovery complete. Found $($xmlFiles.Count) device(s)." -ForegroundColor Green
    }
  } catch {
    Write-Host "[!] Discovery error: $_" -ForegroundColor Red
  }

  # ─── Extract IPs from discovery XML ───────────────────────
  $discoveredIPs = @()
  foreach ($xmlFile in $xmlFiles) {
    $content = Get-Content $xmlFile.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match '<DEVICE>') {
      if ($content -match '<IP>([^<]+)</IP>') {
        $ip = $matches[1]
        if ($ip -and -not ($discoveredIPs -contains $ip)) {
          $discoveredIPs += $ip
        }
      }
    }
  }

  Write-Host ""
  if ($discoveredIPs.Count -gt 0) {
    Write-Host "[OK] Discovered $($discoveredIPs.Count) device(s):" -ForegroundColor Green
    $discoveredIPs | ForEach-Object { Write-Host "    $_" -ForegroundColor White }
  }

  # ─── Step 2: Network Inventory ────────────────────────────
  if ($hasNetinventory -and $discoveredIPs.Count -gt 0) {
    Write-Host ""
    Write-Host "[*] Step 2: Inventory each device..." -ForegroundColor Gray
    $inventoryDir = "$env:TEMP\crm-netinventory-$(Get-Random)"
    New-Item -ItemType Directory -Path $inventoryDir -Force -ErrorAction SilentlyContinue | Out-Null

    $count = 0
    $total = $discoveredIPs.Count
    foreach ($ip in $discoveredIPs) {
      $count++
      Write-Host "[$count/$total] Inventory $ip..." -ForegroundColor Gray
      try {
        $invArgs = @("--host", $ip, "--save", $inventoryDir)
        if ($Credentials -match 'community:(\S+)') {
          $invArgs += "--community", $matches[1]
        }
        & $perlExe "-I$perlAgentDir" $netinventoryScript @invArgs 2>&1
        Write-Host "    OK" -ForegroundColor Green
      } catch {
        Write-Host "    Error: $_" -ForegroundColor Yellow
      }
    }
    Write-Host ""
    Write-Host "[OK] Inventory complete." -ForegroundColor Green

    # Collect inventory XML
    $invXmlFiles = Get-ChildItem -Path $inventoryDir -Filter "*.xml" -ErrorAction SilentlyContinue
  }

  # ─── Step 3: Build JSON and send to CRM ───────────────────
  Write-Host ""
  Write-Host "[*] Results:" -ForegroundColor Gray
  Write-Host "    Discovery XML: $discoveryDir" -ForegroundColor White
  Write-Host "    Inventory XML: $($discoveryDir -replace '-netdiscovery-', '-netinventory-')" -ForegroundColor White
} else {
  # Modules not available; rely on fallback data from above
}

# ─── Fallback / combined result ─────────────────────────────
if (-not $discoveredIPs) { $discoveredIPs = @() }

# Send to CRM
# ─── Build payload (used for both CRM send and file export) ─
if ($discoveredIPs.Count -gt 0) {
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

  if ($CrmUrl) {
    Write-Host ""
    Write-Host "[*] Sending results to CRM..." -ForegroundColor Gray
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

  if ($OutputFile) {
    $outputDir = Split-Path $OutputFile -Parent
    if ($outputDir -and -not (Test-Path $outputDir)) {
      New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    }
    $payload | ConvertTo-Json -Depth 5 | Out-File -FilePath $OutputFile -Encoding utf8
    Write-Host "[OK] Results saved to $OutputFile" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  DONE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
