/* ===== Catch-all route for GLPI Agent =====
 *
 * GLPI Agent appends /plugins/fusioninventory/ to --server URL.
 * Example: --server https://crm/api/agent-inventory/TOKEN
 *   → Agent POSTs to: https://crm/api/agent-inventory/TOKEN/plugins/fusioninventory/
 *
 * This catch-all handler proxies those requests back to the main POST handler.
 */

export async function POST(req: Request, { params }: { params: Promise<{ token: string; path: string[] }> }) {
  const { token } = await params;
  const body = await req.text();

  // Proxy to main handler
  const baseUrl = new URL(req.url);
  const mainUrl = `${baseUrl.origin}/api/agent-inventory/${token}`;
  const response = await fetch(mainUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}
