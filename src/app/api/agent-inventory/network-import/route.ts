/* ===== GLPI Network Inventory Import API =====
 *
 * Accept GLPI Network Inventory plugin output (JSON) — SNMP-discovered
 * network devices (switches, routers, firewalls, APs, etc).
 *
 * Flow:
 *   1. Auth + customer validation
 *   2. Parse JSON payload → extract network devices + ports + VLANs
 *   3. Match against existing devices (by serial / IP / MAC)
 *   4. Create InventorySubmission with reviewData
 *   5. Return submission ID → user reviews on /agent-updates/[id]
 *
 * GLPI Network Inventory JSON format (expected):
 *   {
 *     "action": "network_inventory",
 *     "deviceid": "SCANNER-001",
 *     "content": [
 *       {
 *         "type": "switch|router|firewall|ap|load-balancer|modem|ont",
 *         "manufacturer": "Cisco",
 *         "model": "Catalyst 2960X-48TS-L",
 *         "serial": "FOC1234XXXX",
 *         "firmware": "15.2(2)E7",
 *         "ip": "192.168.1.1",
 *         "mac": "00:1C:58:AB:CD:EF",
 *         "sysDescr": "...",
 *         "sysObjectID": ".1.3.6.1.4.1.9.1.2345",
 *         "uptime": "180 days",
 *         "location": "Server Room A - Rack 03",
 *         "ports": [ ... ],
 *         "vlans": [ ... ]
 *       }
 *     ]
 *   }
 *
 * Also supports flat CSV-like array of network devices (each w/ ip, mac, model, etc).
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";
import { z } from "zod";

/* ─── Types ────────────────────────────────────────────────── */
type NetworkDeviceRecord = {
  deviceType: "network";
  name: string;
  manufacturer: string;
  modelName: string;
  serialNumber: string;
  ipAddress: string;
  macAddress: string;
  firmware: string;
  notes: string;
  componentsJson: string | null;
};

/* ─── Validation schemas ───────────────────────────────────── */
const PortSchema = z.object({
  name: z.string().optional().default(""),
  type: z.string().optional().default(""),
  speed: z.number().optional().default(0),
  status: z.enum(["up", "down", "disabled"]).optional().default("up"),
  mac: z.string().optional().default(""),
  duplex: z.enum(["half", "full"]).optional(),
  mtu: z.number().optional(),
  neighbor: z.string().optional().default(""),
  neighborPort: z.string().optional().default(""),
  neighborType: z.string().optional().default(""),
  poe: z.boolean().optional().default(false),
});

const VlanSchema = z.object({
  id: z.number(),
  name: z.string().optional().default(""),
  ports: z.array(z.string()).optional().default([]),
});

const NetworkDeviceSchema = z.object({
  type: z.string().optional().default("network"),
  manufacturer: z.string().optional().default(""),
  model: z.string().optional().default(""),
  serial: z.string().optional().default(""),
  name: z.string().optional().default(""),
  firmware: z.string().optional().default(""),
  ip: z.string().optional().default(""),
  mac: z.string().optional().default(""),
  sysDescr: z.string().optional().default(""),
  sysObjectID: z.string().optional().default(""),
  uptime: z.string().optional().default(""),
  location: z.string().optional().default(""),
  portCount: z.number().optional(),
  managementIP: z.string().optional().default(""),
  snmpCommunity: z.string().optional().default(""),
  stackRole: z.enum(["master", "slave", "standalone"]).optional(),
  stackMembers: z.array(z.object({ serial: z.string(), role: z.string() })).optional().default([]),
  ports: z.array(PortSchema).optional().default([]),
  vlans: z.array(VlanSchema).optional().default([]),
});

const NetworkImportSchema = z.object({
  action: z.string().optional(),
  deviceid: z.string().optional(),
  content: z.array(NetworkDeviceSchema),
});

/* ─── Parsing ──────────────────────────────────────────────── */
function parseNetworkDevice(raw: z.infer<typeof NetworkDeviceSchema>): NetworkDeviceRecord {
  const netSpecs = {
    subType: raw.type === "network" ? undefined : raw.type,
    firmware: raw.firmware || undefined,
    portCount: raw.portCount || raw.ports?.length || undefined,
    managementIP: raw.managementIP || raw.ip || undefined,
    sysDescr: raw.sysDescr || undefined,
    sysObjectID: raw.sysObjectID || undefined,
    uptime: raw.uptime || undefined,
    snmpCommunity: raw.snmpCommunity || undefined,
    stackRole: raw.stackRole || undefined,
    stackMembers: raw.stackMembers?.length ? raw.stackMembers : undefined,
    ports: raw.ports?.length ? raw.ports.map(p => ({
      name: p.name,
      type: p.type,
      speed: p.speed,
      status: p.status,
      mac: p.mac || undefined,
      duplex: p.duplex || undefined,
      mtu: p.mtu || undefined,
      neighbor: p.neighbor || undefined,
      neighborPort: p.neighborPort || undefined,
      neighborType: p.neighborType || undefined,
      poe: p.poe || undefined,
    })) : undefined,
    vlans: raw.vlans?.length ? raw.vlans : undefined,
  };

  const componentsJson = JSON.stringify({
    type: "network",
    netSpecs,
    rawAgentData: raw,
  });

  const notes = [
    raw.sysDescr ? `sysDescr: ${raw.sysDescr}` : null,
    raw.uptime ? `uptime: ${raw.uptime}` : null,
    raw.location ? `vị trí: ${raw.location}` : null,
    raw.snmpCommunity ? `SNMP: ${raw.snmpCommunity}` : null,
  ].filter(Boolean).join("; ") || "";

  return {
    deviceType: "network",
    name: raw.name || raw.model || "",
    manufacturer: raw.manufacturer,
    modelName: raw.model,
    serialNumber: raw.serial,
    ipAddress: raw.ip,
    macAddress: raw.mac,
    firmware: raw.firmware || "",
    notes,
    componentsJson,
  };
}

/* ─── Matching ─────────────────────────────────────────────── */
async function matchNetworkDevice(
  record: NetworkDeviceRecord,
  customerId: string
): Promise<{
  found: boolean;
  existingDeviceId: string | null;
  method: "serial" | "ip" | "mac" | "none";
  confidence: "high" | "medium" | "low";
  existingDevice: Record<string, unknown> | null;
}> {
  const { serialNumber, ipAddress, macAddress } = record;

  // 1. Serial match (highest confidence)
  if (serialNumber) {
    const existing = await prisma.customerCollectedDevice.findFirst({
      where: { customerId, deviceType: "network", serialNumber },
    });
    if (existing) return { found: true, existingDeviceId: existing.id, method: "serial", confidence: "high", existingDevice: existing as any };
  }

  // 2. MAC address match
  if (macAddress) {
    const existing = await prisma.customerCollectedDevice.findFirst({
      where: { customerId, deviceType: "network", macAddress },
    });
    if (existing) return { found: true, existingDeviceId: existing.id, method: "mac", confidence: "high", existingDevice: existing as any };
  }

  // 3. IP address match
  if (ipAddress) {
    const existing = await prisma.customerCollectedDevice.findFirst({
      where: { customerId, deviceType: "network", ipAddress },
    });
    if (existing) return { found: true, existingDeviceId: existing.id, method: "ip", confidence: "medium", existingDevice: existing as any };
  }

  return { found: false, existingDeviceId: null, method: "none", confidence: "low", existingDevice: null };
}

/* ─── Route handler ────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  // Parse & validate input
  let body: unknown;
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON body", code: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = NetworkImportSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({
      error: "Invalid GLPI Network Inventory format",
      code: "VALIDATION_ERROR",
      issues: parsed.error.issues,
    }, { status: 400 });
  }

  const { content: devices } = parsed.data;

  // Extract customerId from query param
  const url = new URL(req.url);
  const customerId = url.searchParams.get("customerId");
  if (!customerId) {
    return Response.json({ error: "Missing customerId query param", code: "MISSING_PARAM" }, { status: 400 });
  }

  // Verify customer exists
  const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true, name: true } });
  if (!customer) {
    return Response.json({ error: "Customer not found", code: "NOT_FOUND" }, { status: 404 });
  }

  // Parse each device
  const parsedDevices = devices.map(parseNetworkDevice);

  // Match against existing
  const reviewDevices = await Promise.all(
    parsedDevices.map(async (record) => {
      const match = await matchNetworkDevice(record, customerId);
      return { parsed: record as unknown as Record<string, unknown>, match };
    })
  );

  // Create submission
  const reviewData = {
    parsedAt: new Date().toISOString(),
    devices: reviewDevices,
    source: "glpi-network-inventory" as const,
  };

  const submission = await prisma.inventorySubmission.create({
    data: {
      customerId,
      rawPayload: JSON.stringify(body),
      reviewData: JSON.stringify(reviewData),
      status: "pending",
      deviceCount: parsedDevices.length,
    },
  });

  return Response.json({
    data: {
      submissionId: submission.id,
      deviceCount: parsedDevices.length,
      matchedCount: reviewDevices.filter(d => d.match.found).length,
      newCount: reviewDevices.filter(d => !d.match.found).length,
    },
  });
}
