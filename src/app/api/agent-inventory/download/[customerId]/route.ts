import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

function createAgentScript(agentUrl: string, customerId: string): string {
  const lines: string[] = [
    `@echo off`,
    `chcp 65001 >nul`,
    `title CRM Agent - ${customerId.substring(0, 8)}`,
    `cd /d "%~dp0"`,
    ``,
    `set "CRM_URL=${agentUrl}"`,
    `set "PS_SCRIPT=%temp%\\crm-agent.ps1"`,
    ``,
    `echo ============================================`,
    `echo   CRM Agent - Quick Inventory`,
    `echo ============================================`,
    `echo.`,
    `echo Collecting system info...`,
    ``,
    `:: Generate PowerShell script line by line`,
    `echo # CRM Agent > "%PS_SCRIPT%"`,
    `echo $ErrorActionPreference = 'Stop' >> "%PS_SCRIPT%"`,
    `echo try { >> "%PS_SCRIPT%"`,
    `echo   $hostname = $env:COMPUTERNAME >> "%PS_SCRIPT%"`,
    `echo   $cpu = (Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue ^| Select-Object -First 1).Name >> "%PS_SCRIPT%"`,
    `echo   $ram = [math]::Round((Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue).TotalPhysicalMemory / 1MB, 0^) >> "%PS_SCRIPT%"`,
    `echo   $serial = (Get-CimInstance Win32_BIOS -ErrorAction SilentlyContinue).SerialNumber >> "%PS_SCRIPT%"`,
    `echo   $manufacturer = (Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue).Manufacturer >> "%PS_SCRIPT%"`,
    `echo   $model = (Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue).Model >> "%PS_SCRIPT%"`,
    `echo   $ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue ^| Where-Object { $_.InterfaceAlias -ne 'Loopback Pseudo-Interface 1' } ^| Select-Object -First 1^).IPAddress >> "%PS_SCRIPT%"`,
    `echo   $mac = (Get-NetAdapter -ErrorAction SilentlyContinue ^| Where-Object { $_.Status -eq 'Up' } ^| Select-Object -First 1^).MacAddress >> "%PS_SCRIPT%"`,
    `echo   $os = (Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue).Caption >> "%PS_SCRIPT%"`,
    `echo   $user = $env:USERNAME >> "%PS_SCRIPT%"`,
    `echo   $diskGB = [math]::Round(((Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' -ErrorAction SilentlyContinue ^| Measure-Object -Property Size -Sum^).Sum / 1GB^), 0^) >> "%PS_SCRIPT%"`,
    `echo   $chassis = 'Desktop' >> "%PS_SCRIPT%"`,
    `echo   $enc = Get-CimInstance Win32_SystemEnclosure -ErrorAction SilentlyContinue ^| Select-Object -First 1 >> "%PS_SCRIPT%"`,
    `echo   if ($enc -and $enc.ChassisTypes -contains 10 -or $enc.ChassisTypes -contains 11 -or $enc.ChassisTypes -contains 12 -or $enc.ChassisTypes -contains 14^) { $chassis = 'Laptop' } >> "%PS_SCRIPT%"`,
    `echo   $body = @{ >> "%PS_SCRIPT%"`,
    `echo     action = 'inventory' >> "%PS_SCRIPT%"`,
    `echo     deviceid = "$hostname-$serial" >> "%PS_SCRIPT%"`,
    `echo     content = @{ >> "%PS_SCRIPT%"`,
    `echo       hardware = @{ name = $hostname; chassis_type = $chassis; memory = $ram; uuid = $serial; lastloggeduser = $user } >> "%PS_SCRIPT%"`,
    `echo       bios = @{ smanufacturer = $manufacturer; smodel = $model; sserial = $serial } >> "%PS_SCRIPT%"`,
    `echo       operatingsystem = @{ name = 'Windows'; full_name = $os } >> "%PS_SCRIPT%"`,
    `echo       cpus = @(@{ name = $cpu }) >> "%PS_SCRIPT%"`,
    `echo       storages = @(@{ disksize = ($diskGB * 1024^) }) >> "%PS_SCRIPT%"`,
    `echo       networks = @(@{ ipaddress = $ip; macaddr = $mac }) >> "%PS_SCRIPT%"`,
    `echo       users = @(@{ LOGIN = $user }) >> "%PS_SCRIPT%"`,
    `echo     } >> "%PS_SCRIPT%"`,
    `echo   } >> "%PS_SCRIPT%"`,
    `echo   $json = $body ^| ConvertTo-Json -Depth 10 -Compress >> "%PS_SCRIPT%"`,
    `echo   Write-Output "Hostname: $hostname" >> "%PS_SCRIPT%"`,
    `echo   Write-Output "CPU: $cpu" >> "%PS_SCRIPT%"`,
    `echo   Write-Output "RAM: $ram MB" >> "%PS_SCRIPT%"`,
    `echo   Write-Output "Serial: $serial" >> "%PS_SCRIPT%"`,
    `echo   Write-Output "" >> "%PS_SCRIPT%"`,
    `echo   Write-Output "Sending to CRM..." >> "%PS_SCRIPT%"`,
    `echo   $jsonBody = $body ^| ConvertTo-Json -Depth 10 -Compress >> "%PS_SCRIPT%"`,
    `echo   Invoke-RestMethod -Uri '%CRM_URL%' -Method POST -Body $jsonBody -ContentType 'application/json' -TimeoutSec 30 ^| Out-Null >> "%PS_SCRIPT%"`,
    `echo   Write-Output "Done!" >> "%PS_SCRIPT%"`,
    `echo } catch { >> "%PS_SCRIPT%"`,
    `echo   Write-Output "ERROR: $_" >> "%PS_SCRIPT%"`,
    `echo   exit 1 >> "%PS_SCRIPT%"`,
    `echo } >> "%PS_SCRIPT%"`,
    ``,
    `powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%"`,
    `del "%PS_SCRIPT%" >nul 2>&1`,
    `echo.`,
    `pause`,
  ];
  return lines.join("\r\n");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  // Yêu cầu đăng nhập — chỉ CRM staff mới tải được script
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const { customerId } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, agentKey: true, agentEnabled: true, name: true },
  });

  if (!customer) {
    return new Response("Customer not found", { status: 404 });
  }
  if (!customer.agentEnabled) {
    return new Response("Agent disabled for this customer", { status: 403 });
  }

  // Build URL cho agent POST: thêm customerId + agentKey làm query params
  const reqUrl = new URL(req.url);
  const host = req.headers.get("host") || reqUrl.host;
  const proto = req.headers.get("x-forwarded-proto") || reqUrl.protocol.replace(":", "");
  const baseUrl = `${proto}://${host}`;
  const agentUrl = `${baseUrl}/api/agent-inventory/submit?customerId=${customerId}&key=${customer.agentKey}`;

  const script = createAgentScript(agentUrl, customerId);
  const filename = `crm-agent-${customer.name?.replace(/[^a-zA-Z0-9]/g, "_") || "inventory"}.bat`;

  return new Response(script, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
