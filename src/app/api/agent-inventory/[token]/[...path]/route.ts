/* ===== Catch-all route for GLPI Agent =====
 *
 * GLPI Agent appends /plugins/fusioninventory/ to --server URL.
 * Example: --server https://crm/api/agent-inventory/TOKEN
 *   → Agent POSTs to: https://crm/api/agent-inventory/TOKEN/plugins/fusioninventory/
 *
 * Agent workflow:
 *   1. PROLOG (XML): asks "what should I do?" → respond with "run inventory"
 *   2. INVENTORY (XML or JSON): sends collected data → proxy to main handler
 */

import { prisma } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ token: string; path: string[] }> }) {
  const { token } = await params;
  const rawBody = await req.text();
  const contentType = req.headers.get("content-type") || "";
  const baseUrl = new URL(req.url);

  // Validate token
  const session = await prisma.collectionSession.findUnique({
    where: { token },
    select: { id: true, status: true },
  });
  if (!session || (session.status !== "pending" && session.status !== "active")) {
    return new Response("Invalid session", { status: 404 });
  }

  // Detect prolog: XML body or form-encoded with action=prolog
  const isXml = contentType.includes("xml") || rawBody.trim().startsWith("<?xml") || rawBody.trim().startsWith("<");
  const isForm = contentType.includes("form-urlencoded") || contentType.includes("form-data");
  const isProlog =
    isXml ||
    rawBody.includes("PROLOG") ||
    rawBody.includes('"action":"prolog"') ||
    rawBody.includes("action=prolog");

  if (isProlog || isXml) {
    // ── Prolog response: tell agent to run inventory ──
    // Extract device ID from request
    let deviceId = "";
    const deviceMatch = rawBody.match(/<DEVICEID>([^<]+)<\/DEVICEID>/i);
    if (deviceMatch) deviceId = deviceMatch[1];

    const prologResponse = `<?xml version="1.0" encoding="UTF-8"?>
<RESPONSE>
  <DEVICEID>${deviceId || "unknown"}</DEVICEID>
  <PROLOG_FREQ>31536000</PROLOG_FREQ>
  <CONTENT>
    <INVENTORY>
      <ENABLED>1</ENABLED>
    </INVENTORY>
  </CONTENT>
</RESPONSE>`;

    return new Response(prologResponse, {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  }

  // ── Inventory data: proxy to main handler ──
  const mainUrl = `${baseUrl.origin}/api/agent-inventory/${token}`;
  const response = await fetch(mainUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: rawBody,
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}
