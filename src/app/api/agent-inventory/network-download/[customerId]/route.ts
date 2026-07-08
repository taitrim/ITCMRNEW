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

function loadScript(filename: string): string {
  // Always read from disk — no cache, so updates take effect immediately
  const scriptPath = path.join(process.cwd(), "agent", filename);
  if (fs.existsSync(scriptPath)) {
    return fs.readFileSync(scriptPath, "utf-8");
  }
  throw new Error(`Script not found: ${filename}`);
}

/** Escape a string for use in batch echo >> file */
function escapeBatchEcho(text: string): string {
  return text
    .replace(/%/g, "%%")
    .replace(/\^/g, "^^")
    .replace(/&/g, "^&")
    .replace(/\|/g, "^|")
    .replace(/</g, "^<")
    .replace(/>/g, "^>");
}

function buildWindowsBat(crmSubmitUrl: string): string {
  const ps1 = loadScript("network-inventory.ps1");
  // Inject CRM URL into PowerShell script
  const ps1Injected = ps1.replace('[string]$CrmUrl = ""', `[string]$CrmUrl = "${crmSubmitUrl}"`);

  // Split into lines, escape each, wrap as echo >> batch commands
  const ps1Lines = ps1Injected.split("\n").map((l) => l.replace(/\r$/, ""));
  const ps1EchoLines: string[] = [];
  ps1Lines.forEach((line, i) => {
    if (i === 0) {
      ps1EchoLines.push(`echo.${escapeBatchEcho(line)} > "%PS_SCRIPT%"`);
    } else {
      ps1EchoLines.push(`echo.${escapeBatchEcho(line)} >> "%PS_SCRIPT%"`);
    }
  });

  const lines = [
    '@echo off',
    'chcp 65001 >nul',
    'title CRM Network Inventory — GLPI Agent',
    'cd /d "%~dp0"',
    '',
    'echo ============================================',
    'echo   CRM Network Inventory - GLPI Agent',
    'echo   SNMP-based network inventory via GLPI Agent',
    'echo ============================================',
    'echo.',
    '',
    ':: Check for PowerShell',
    'where powershell.exe >nul 2>nul',
    'if %ERRORLEVEL% neq 0 (',
    '    echo [!] PowerShell is not available.',
    '    echo.',
    '    pause',
    '    exit /b 1',
    ')',
    '',
    'echo [*] Creating temp script...',
    'set "PS_SCRIPT=%temp%\\crm-network-inventory.ps1"',
    '',
    ...ps1EchoLines,
    '',
    'if %ERRORLEVEL% neq 0 (',
    '    echo [!] Could not create temp script.',
    '    echo.',
    '    pause',
    '    exit /b 1',
    ')',
    '',
    'echo [*] Running network inventory...',
    'echo.',
    '',
    ':: Run the script (forward arguments %*) with AutoInstall flag',
    'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" -AutoInstall %*',
    '',
    'set EXIT_CODE=%ERRORLEVEL%',
    '',
    ':: Clean up temp file',
    'del "%PS_SCRIPT%" 2>nul',
    '',
    'echo.',
    'if %EXIT_CODE% neq 0 (',
    '    echo [!] Script finished with error (code: %EXIT_CODE%^)',
    ') else (',
    '    echo [OK] Completed.',
    ')',
    '',
    'echo.',
    'pause',
    '',
  ];

  // Join with \r\n for Windows batch compatibility
  return lines.join('\r\n');
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
