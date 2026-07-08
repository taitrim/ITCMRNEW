/* ===== GLPI Agent Network Inventory Wrapper Download API =====
 *
 * Serve wrapper scripts: network-inventory.ps1 (Windows) / network-inventory.sh (Linux/macOS)
 * Các script này gọi glpi-netdiscovery + glpi-netinventory thật (trong gói GLPI Agent Perl)
 * Được gọi từ tab Agent → "Tải Script Network Scan"
 *
 * Khi download, inject CRM_URL + customerId vào script để tự động POST kết quả về CRM.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import * as fs from "fs";
import * as path from "path";

function loadScript(filename: string): string {
  const scriptPath = path.join(process.cwd(), "agent", filename);
  if (fs.existsSync(scriptPath)) {
    return fs.readFileSync(scriptPath, "utf-8");
  }
  throw new Error(`Script not found: ${filename}`);
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
  let script: string;

  if (osParam === "linux" || osParam === "mac") {
    filename = "network-inventory.sh";
    script = loadScript(filename);
    // Inject CRM URL into bash script — replaces default CRM_URL=""
    script = script.replace('CRM_URL=""', `CRM_URL="${crmSubmitUrl}"`);
  } else {
    filename = "network-inventory.ps1";
    script = loadScript(filename);
    // Inject CRM URL into PowerShell script — replaces default $CrmUrl = ""
    script = script.replace('[string]$CrmUrl = ""', `[string]$CrmUrl = "${crmSubmitUrl}"`);
  }

  return new Response(script, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
