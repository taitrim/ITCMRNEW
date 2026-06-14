#!/usr/bin/env pwsh
<#
.SYNOPSIS
  ITSM Inventory Agent - Thu thập thông tin máy tính và gửi về server
.DESCRIPTION
  Agent tự động thu thập hardware, software, network và gửi dữ liệu về 
  ITSM System server qua REST API.
.PARAMETER ServerUrl
  URL của ITSM server (mặc định: http://localhost:3000)
.PARAMETER ApiKey
  API key để xác thực agent
.PARAMETER DeviceId
  ID định danh thiết bị (mặc định: hostname)
.EXAMPLE
  .\inventory-agent.ps1 -ServerUrl "http://localhost:3000" -ApiKey "agent-key-123"
#>

param(
  [string]$ServerUrl = "http://localhost:3000",
  [string]$ApiKey = "agent-key-demo",
  [string]$DeviceId = $env:COMPUTERNAME
)

# Thu thập thông tin hệ thống
function Get-SystemInfo {
  $os = Get-CimInstance Win32_OperatingSystem
  $cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
  $memory = Get-CimInstance Win32_ComputerSystem

  return @{
    hostname    = $env:COMPUTERNAME
    domain      = $env:USERDOMAIN
    os          = "$($os.Caption) $($os.Version)"
    osVersion   = $os.Version
    osArch      = $os.OSArchitecture
    lastBoot    = $os.LastBootUpTime.ToString("yyyy-MM-dd HH:mm:ss")
  }
}

function Get-CpuInfo {
  $cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
  return @{
    name      = $cpu.Name.Trim()
    cores     = $cpu.NumberOfCores
    threads   = $cpu.NumberOfLogicalProcessors
    frequency = "$($cpu.MaxClockSpeed) MHz"
  }
}

function Get-RamInfo {
  $memory = Get-CimInstance Win32_PhysicalMemory
  $totalGB = [math]::Round(($memory | Measure-Object -Property Capacity -Sum).Sum / 1GB, 2)
  $modules = $memory | Select-Object @{N="size";E={[math]::Round($_.Capacity/1GB,0)}}, Manufacturer, PartNumber, Speed
  return @{ totalGB = $totalGB; modules = @($modules) }
}

function Get-DiskInfo {
  $disks = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Select-Object DeviceID, @{N="sizeGB";E={[math]::Round($_.Size/1GB,2)}}, @{N="freeGB";E={[math]::Round($_.FreeSpace/1GB,2)}}, FileSystem
  return @($disks)
}

function Get-NetworkInfo {
  $adapters = Get-CimInstance Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled -eq $true }
  return @($adapters | Select-Object @{N="name";E={$_.Description}}, @{N="mac";E={$_.MACAddress}}, @{N="ip";E={$_.IPAddress -join ","}}, @{N="gateway";E={$_.DefaultIPGateway -join ","}}, @{N="dns";E={$_.DNSServerSearchOrder -join ","}})
}

function Get-SoftwareInfo {
  $software = Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*,
    HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\* |
    Where-Object { $_.DisplayName -and $_.DisplayName -notmatch "^(Update|Security|Microsoft Visual|KB\d)" } |
    Select-Object @{N="name";E={$_.DisplayName}}, DisplayVersion, Publisher, InstallDate -First 100
  return @($software)
}

Write-Host "=== ITSM Inventory Agent ===" -ForegroundColor Cyan
Write-Host "Device: $DeviceId"
Write-Host "Server: $ServerUrl"
Write-Host ""

# Thu thập
Write-Host "[*] Đang thu thập thông tin..." -ForegroundColor Yellow
$payload = @{
  deviceId  = $DeviceId
  timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
  system    = Get-SystemInfo
  cpu       = Get-CpuInfo
  ram       = Get-RamInfo
  disks     = Get-DiskInfo
  network   = Get-NetworkInfo
  software  = Get-SoftwareInfo
}

# Gửi lên server
Write-Host "[*] Đang gửi dữ liệu đến $ServerUrl/api/agent/inventory..." -ForegroundColor Yellow
try {
  $json = $payload | ConvertTo-Json -Depth 10
  $response = Invoke-RestMethod -Uri "$ServerUrl/api/agent/inventory" `
    -Method POST `
    -Body $json `
    -ContentType "application/json" `
    -Headers @{ "X-API-Key" = $ApiKey } `
    -TimeoutSec 30

  Write-Host "[OK] Gửi thành công!" -ForegroundColor Green
  Write-Host "Asset ID: $($response.assetId)" -ForegroundColor Green
  Write-Host "Agent ID: $($response.agentId)" -ForegroundColor Green
}
catch {
  Write-Host "[ERROR] Gửi thất bại: $_" -ForegroundColor Red
  Write-Host "[*] Dữ liệu đã lưu vào inventory-backup.json" -ForegroundColor Yellow
  $json | Out-File -FilePath "$PSScriptRoot\inventory-backup.json" -Encoding utf8
  exit 1
}

Write-Host ""
Write-Host "=== Hoàn tất ===" -ForegroundColor Cyan
