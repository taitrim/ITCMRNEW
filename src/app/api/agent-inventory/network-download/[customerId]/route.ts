/* ===== GLPI Agent Network Inventory Wrapper Download API =====
 *
 * Serve wrapper scripts: network-inventory.ps1 (Windows) / network-inventory.sh (Linux/macOS)
 * Các script này gọi glpi-netdiscovery + glpi-netinventory thật (trong gói GLPI Agent Perl)
 * Được gọi từ tab Agent → "Tải Script Network Scan"
 *
 * Windows: serve .bat wrapper (double-click được, có pause)
 *   - Nhúng .ps1 dạng base64 → decode → chạy → pause
 * Linux/macOS: serve .sh trực tiếp (chạy từ terminal)
 * Khi download, inject CRM_URL để tự động POST kết quả về CRM.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as fs from "fs";
import * as path from "path";

const SCRIPT_CACHE: Record<string, string> = {};

function loadScript(filename: string): string {
  if (SCRIPT_CACHE[filename]) return SCRIPT_CACHE[filename];
  const scriptPath = path.join(process.cwd(), "agent", filename);
  if (fs.existsSync(scriptPath)) {
    SCRIPT_CACHE[filename] = fs.readFileSync(scriptPath, "utf-8");
    return SCRIPT_CACHE[filename];
  }
  throw new Error(`Script not found: ${filename}`);
}

/** Encode string to base64 for embedding in .bat */
function toBase64(str: string): string {
  return Buffer.from(str, "utf-8").toString("base64");
}

function buildWindowsBat(crmSubmitUrl: string): string {
  const ps1 = loadScript("network-inventory.ps1");
  // Inject CRM URL into PowerShell script
  const ps1Injected = ps1.replace('[string]$CrmUrl = ""', `[string]$CrmUrl = "${crmSubmitUrl}"`);
  const b64 = toBase64(ps1Injected);

  return `@echo off
chcp 65001 >nul
title CRM Network Inventory — GLPI Agent
cd /d "%~dp0"

echo ============================================
echo   CRM Network Inventory — GLPI Agent
echo   Quet mang SNMP bang GLPI Agent
echo ============================================
echo.

:: Kiem tra PowerShell
where powershell.exe >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [!] Khong tim thay PowerShell.
    echo.
    pause
    exit /b 1
)

echo [*] Dang chuan bi...
set "PS_SCRIPT=%temp%\\crm-network-inventory.ps1"

:: Giai ma base64 thanh .ps1
powershell -NoProfile -Command ^
  "$b='%b64%';" ^
  "$d=[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($b));" ^
  "Out-File -FilePath '%temp%\\crm-network-inventory.ps1' -InputObject $d -Encoding UTF8"

if %ERRORLEVEL% neq 0 (
    echo [!] Khong the tao temp script.
    echo.
    pause
    exit /b 1
)

echo [*] Dang chay network inventory...
echo [*] Can GLPI Agent (Perl) da cai de hoat dong.
echo [*] Neu chua cai: choco install glpi-agent
echo.

:: Chay script (forward arguments %*)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" %*

set EXIT_CODE=%ERRORLEVEL%

:: Don dep temp file
del "%PS_SCRIPT%" 2>nul

echo.
if %EXIT_CODE% neq 0 (
    echo [!] Script ket thuc voi loi (code: %EXIT_CODE%^)
) else (
    echo [OK] Hoan tat.
)

echo.
pause
`;
}

function buildLinuxScript(crmSubmitUrl: string): string {
  const script = loadScript("network-inventory.sh");
  return script.replace('CRM_URL=""', `CRM_URL="${crmSubmitUrl}"`);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const { customerId } = await params;

  const reqUrl = new URL(req.url);
  const osParam = reqUrl.searchParams.get("os") || "windows";

  const host = req.headers.get("host") || reqUrl.host;
  const proto = req.headers.get("x-forwarded-proto") || reqUrl.protocol.replace(":", "");
  const baseUrl = `${proto}://${host}`;

  // Build CRM URL for auto-POST
  const agentKey = reqUrl.searchParams.get("key") || "";
  const crmSubmitUrl = `${baseUrl}/api/agent-inventory/network-import?customerId=${customerId}&key=${agentKey}`;

  let filename: string;
  let content: string;
  let mimeType: string;

  if (osParam === "linux" || osParam === "mac") {
    // Linux/macOS: serve .sh (users run from terminal, no window-close issue)
    filename = "network-inventory.sh";
    content = buildLinuxScript(crmSubmitUrl);
    mimeType = "text/x-shellscript";
  } else {
    // Windows: serve .bat wrapper with embedded base64 .ps1 + pause
    filename = "network-inventory.bat";
    content = buildWindowsBat(crmSubmitUrl);
    mimeType = "application/x-bat";
  }

  return new Response(content, {
    headers: {
      "Content-Type": `${mimeType}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
