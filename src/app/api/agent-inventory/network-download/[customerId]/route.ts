/* ===== Network SNMP Scanner Download API =====
 *
 * Serve scripts: network-scan.ps1 (Windows) / network-scan.sh (Linux/macOS)
 * Được gọi từ tab Agent → "Tải Script Network Scan"
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import * as fs from "fs";
import * as path from "path";

function loadScript(filename: string): string {
  // Script files stored in agent/ directory
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
    filename = "network-scan.sh";
    script = loadScript(filename);
  } else {
    filename = "network-scan.ps1";
    script = loadScript(filename);
  }

  return new Response(script, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
