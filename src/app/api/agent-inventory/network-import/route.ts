/* ===== GLPI Network Inventory Import API =====
 *
 * Accept GLPI Network Inventory (netinventory) output — SNMP-discovered
 * network devices (switches, routers, firewalls, APs, UPS, cameras, etc).
 *
 * Supports TWO formats:
 *
 * FORMAT A — GLPI Native (netinventory)  ← RECOMMENDED / CANONICAL
 *   Sent by glpi-agent / glpi-netinventory tool.
 *   {
 *     "action": "netinventory",
 *     "deviceid": "SCANNER-001",
 *     "content": {
 *       "versionclient": "1.0",
 *       "network_device": {
 *         "name": "Core-Switch-01",
 *         "manufacturer": "Cisco",
 *         "model": "Catalyst 2960X-48TS-L",
 *         "serial": "FOC1234XXXX",
 *         "mac": "00:1C:58:AB:CD:EF",
 *         "firmware": "15.2(2)E7",
 *         "uptime": "180 days",
 *         "ips": ["10.0.0.1"],
 *         "type": "Networking",
 *         "location": "Server Room A - Rack 03",
 *         "contact": "noc@company.com",
 *         "cpu": 4
 *       },
 *       "network_ports": [
 *         {
 *           "ifname": "Gi1/0/1",
 *           "ifdescr": "GigabitEthernet1/0/1",
 *           "ifspeed": 1000000000,
 *           "ifstatus": 1,
 *           "ifinternalstatus": 1,
 *           "iftype": 6,
 *           "mac": "00:1C:58:AB:CD:11",
 *           "ifmtu": 1500,
 *           "ifportduplex": 2,
 *           "trunk": false,
 *           "vlans": [{"name": "default", "number": "1"}],
 *           "connections": [{"ip": "10.0.0.2", "sysname": "Server-Web01"}]
 *         }
 *       ],
 *       "network_components": [
 *         { "type": "chassis", "model": "...", "serial": "...", "firmware": "..." }
 *       ],
 *       "firmwares": [
 *         { "name": "IOS", "version": "15.2(2)E7" }
 *       ]
 *     }
 *   }
 *
 * FORMAT B — Custom flat format (backward compat):
 *   {
 *     "action": "network_inventory",
 *     "deviceid": "SCANNER-001",
 *     "content": [{ "type": "switch", "manufacturer": "Cisco", "model": "...", "serial": "...", ... }]
 *   }
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

/* ─── GLPI Native Format schemas ────────────────────────────── */

const GlpiNetworkPortConnectionSchema = z.object({
  ip: z.string().optional().default(""),
  mac: z.string().optional().default(""),
  sysname: z.string().optional().default(""),
  ifdescr: z.string().optional().default(""),
  model: z.string().optional().default(""),
  sysdescr: z.string().optional().default(""),
}).passthrough();

const GlpiVlanSchema = z.object({
  name: z.string().optional().default(""),
  number: z.union([z.string(), z.number()]).optional().default(""),
}).passthrough();

const GlpiPortSchema = z.object({
  ifname: z.string().optional().default(""),
  ifdescr: z.string().optional().default(""),
  ifalias: z.string().optional().default(""),
  ifnumber: z.union([z.number(), z.string()]).optional(),
  ifspeed: z.union([z.number(), z.string()]).optional().default(0),
  ifstatus: z.union([z.number(), z.string()]).optional(),    // 1=up, 2=down (SNMP ifAdminStatus)
  ifinternalstatus: z.union([z.number(), z.string()]).optional(), // 1=up, 2=down (SNMP ifOperStatus)
  iftype: z.union([z.number(), z.string()]).optional(),
  mac: z.string().optional().default(""),
  ifmtu: z.union([z.number(), z.string()]).optional(),
  ifportduplex: z.union([z.number(), z.string()]).optional(), // 1=half, 2=full, 3=auto
  ifinerrors: z.union([z.number(), z.string()]).optional(),
  ifouterrors: z.union([z.number(), z.string()]).optional(),
  ifinbytes: z.union([z.number(), z.string()]).optional(),
  ifoutbytes: z.union([z.number(), z.string()]).optional(),
  iflastchange: z.string().optional(),
  trunk: z.union([z.boolean(), z.number(), z.string()]).optional(),
  poe: z.union([z.boolean(), z.number(), z.string()]).optional(),
  connections: z.array(GlpiNetworkPortConnectionSchema).optional().default([]),
  vlans: z.array(GlpiVlanSchema).optional().default([]),
}).passthrough();

const GlpiNetworkDeviceSchema = z.object({
  name: z.string().optional().default(""),
  manufacturer: z.string().optional().default(""),
  model: z.string().optional().default(""),
  serial: z.string().optional().default(""),
  type: z.string().optional().default("Networking"),
  mac: z.string().optional().default(""),
  firmware: z.string().optional().default(""),
  uptime: z.string().optional().default(""),
  location: z.string().optional().default(""),
  contact: z.string().optional().default(""),
  cpu: z.union([z.number(), z.string()]).optional(),
  ips: z.array(z.string()).optional().default([]),
  credentials: z.union([z.number(), z.string()]).optional(),
  description: z.string().optional().default(""),
}).passthrough();

const GlpiComponentSchema = z.object({
  type: z.string().optional(),
  model: z.string().optional(),
  serial: z.string().optional(),
  manufacturer: z.string().optional(),
  name: z.string().optional(),
  firmware: z.string().optional(),
  description: z.string().optional(),
}).passthrough();

const GlpiFirmwareSchema = z.object({
  name: z.string().optional().default(""),
  version: z.string().optional().default(""),
  manufacturer: z.string().optional().default(""),
  description: z.string().optional().default(""),
  type: z.string().optional().default(""),
}).passthrough();

const GlpiContentSchema = z.object({
  versionclient: z.string().optional(),
  network_device: GlpiNetworkDeviceSchema.optional(),
  network_ports: z.array(GlpiPortSchema).optional().default([]),
  network_components: z.array(GlpiComponentSchema).optional().default([]),
  firmwares: z.array(GlpiFirmwareSchema).optional().default([]),
}).passthrough();

/* ─── Custom (backward compat) format schemas ──────────────── */

const LegacyPortSchema = z.object({
  name: z.string().optional().default(""),
  type: z.string().optional().default(""),
  speed: z.number().optional().default(0),
  status: z.string().optional().default("up"),
  mac: z.string().optional().default(""),
  duplex: z.string().optional(),
  mtu: z.number().optional(),
  neighbor: z.string().optional().default(""),
  neighborPort: z.string().optional().default(""),
  neighborType: z.string().optional().default(""),
  poe: z.boolean().optional().default(false),
});

const LegacyVlanSchema = z.object({
  id: z.number().optional(),
  name: z.string().optional().default(""),
  ports: z.array(z.string()).optional().default([]),
});

const LegacyDeviceSchema = z.object({
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
  ports: z.array(LegacyPortSchema).optional().default([]),
  vlans: z.array(LegacyVlanSchema).optional().default([]),
});

/* ─── Helpers ──────────────────────────────────────────────── */

/** Map SNMP ifAdminStatus/ifOperStatus number → display string */
function ifstatusLabel(val: unknown): string {
  const n = Number(val);
  if (n === 1) return "up";
  if (n === 2) return "down";
  if (n === 3) return "testing";
  if (n === 4) return "unknown";
  if (n === 5) return "dormant";
  if (n === 6) return "notPresent";
  if (n === 7) return "lowerLayerDown";
  return String(val || "unknown");
}

/** Map ifPortDuplex number → label */
function duplexLabel(val: unknown): "half" | "full" | "auto" | undefined {
  const n = Number(val);
  if (n === 1) return "half";
  if (n === 2) return "full";
  if (n === 3) return "auto";
  return undefined;
}

/** Parse GLPI network port → our port spec */
function parseGlpiPort(p: z.infer<typeof GlpiPortSchema>): Record<string, unknown> {
  const ifspeed = Number(p.ifspeed) || 0;
  // GLPI stores speed in bps (e.g. 1000000000 = 1Gbps), convert to Mbps for display
  const speedMbps = ifspeed >= 1_000_000_000 ? ifspeed / 1_000_000
    : ifspeed >= 1_000_000 ? ifspeed / 1_000_000
    : ifspeed;

  const neighbors = (p.connections || []).map(c => {
    const parts = [c.sysname, c.ip, c.model, c.ifdescr].filter(Boolean);
    return parts.length ? parts.join(" @ ") : "";
  }).filter(Boolean);

  return {
    name: p.ifname || p.ifdescr || "",
    description: p.ifdescr || "",
    alias: p.ifalias || "",
    speed: speedMbps || 0,
    speedBps: ifspeed,
    status: ifstatusLabel(p.ifstatus),
    operationalStatus: ifstatusLabel(p.ifinternalstatus),
    mac: p.mac || "",
    duplex: duplexLabel(p.ifportduplex),
    mtu: Number(p.ifmtu) || undefined,
    trunk: p.trunk === true || p.trunk === 1 || p.trunk === "1" || false,
    poe: p.poe === true || p.poe === 1 || false,
    neighbors,
    vlans: (p.vlans || []).map((v: Record<string, unknown>) => ({
      name: v.name || "",
      number: String(v.number || ""),
    })),
  };
}

/** Parse GLPI firmware → simple firmware string */
function parseGlpiFirmware(fws: z.infer<typeof GlpiFirmwareSchema>[]): string {
  if (!fws || fws.length === 0) return "";
  // Pick the first "device" type firmware, or just the first one
  const device = fws.find(f => f.type === "device" || !f.type);
  if (!device) return fws[0]?.version || fws[0]?.name || "";
  return device.version || device.name || "";
}

/* ─── Parsers per format ───────────────────────────────────── */

function parseGlpiDevice(
  nd: z.infer<typeof GlpiNetworkDeviceSchema>,
  ports: z.infer<typeof GlpiPortSchema>[],
  fws: z.infer<typeof GlpiFirmwareSchema>[]
): NetworkDeviceRecord {
  const ipAddress = (nd.ips && nd.ips.length > 0) ? nd.ips[0] : "";
  const firmwareVer = nd.firmware || parseGlpiFirmware(fws || []);

  const netSpecs = {
    subType: nd.type?.toLowerCase() === "networking" ? undefined : nd.type?.toLowerCase(),
    firmware: firmwareVer || undefined,
    managementIP: ipAddress || undefined,
    uptime: nd.uptime || undefined,
    location: nd.location || undefined,
    contact: nd.contact || undefined,
    cpu: nd.cpu ? Number(nd.cpu) : undefined,
    ips: nd.ips?.length ? nd.ips : undefined,
    ports: (ports || []).map(parseGlpiPort),
    portCount: (ports || []).length,
  };

  const componentsJson = JSON.stringify({
    type: "network",
    source: "glpi-netinventory",
    netSpecs,
  });

  const notes = [
    nd.uptime ? `uptime: ${nd.uptime}` : null,
    nd.location ? `vị trí: ${nd.location}` : null,
    nd.contact ? `contact: ${nd.contact}` : null,
    nd.description ? nd.description : null,
  ].filter(Boolean).join("; ") || "";

  return {
    deviceType: "network",
    name: nd.name || nd.model || "",
    manufacturer: nd.manufacturer || "",
    modelName: nd.model || "",
    serialNumber: nd.serial || "",
    ipAddress,
    macAddress: nd.mac || "",
    firmware: firmwareVer,
    notes,
    componentsJson,
  };
}

function parseLegacyDevice(raw: z.infer<typeof LegacyDeviceSchema>): NetworkDeviceRecord {
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
    source: "custom-legacy",
    netSpecs,
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

/* ─── Auto-detect and parse incoming payload ───────────────── */

function parsePayload(rawBody: unknown): NetworkDeviceRecord[] {
  // Type guard helpers
  const isObject = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

  // CASE 1: GLPI Native Format (content is object with network_device)
  const body = isObject(rawBody) ? rawBody : {};
  const content = body.content;

  if (isObject(content) && (content.network_device || content.versionclient)) {
    const parsedContent = GlpiContentSchema.parse(content);
    const nd = parsedContent.network_device;
    if (nd && nd.name) {
      return [parseGlpiDevice(nd, parsedContent.network_ports, parsedContent.firmwares)];
    }
    // If network_device exists but has no name, skip
    if (nd) {
      return [parseGlpiDevice(nd, parsedContent.network_ports, parsedContent.firmwares)];
    }
    // Content has versionclient but no network_device — no devices to import
    return [];
  }

  // CASE 2: Array of GLPI content objects (multiple devices)
  if (Array.isArray(content) && content.length > 0) {
    const first = content[0];
    // Detect if it's GLPI format (has network_device) or legacy (has manufacturer/type)
    if (isObject(first) && (first.network_device || first.versionclient)) {
      const entries = z.array(GlpiContentSchema).parse(content);
      return entries
        .map(e => {
          const nd = e.network_device;
          if (!nd) return null;
          return parseGlpiDevice(nd, e.network_ports, e.firmwares);
        })
        .filter(Boolean) as NetworkDeviceRecord[];
    }
    // Legacy flat format (array of flat devices)
    const devices = z.array(LegacyDeviceSchema).parse(content);
    return devices.map(parseLegacyDevice);
  }

  // CASE 3: content is neither — try to parse body as single device
  if (body.manufacturer || body.model || body.serial || body.name || body.ip) {
    const single = LegacyDeviceSchema.parse(body);
    return [parseLegacyDevice(single)];
  }

  return [];
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
    if (existing) return { found: true, existingDeviceId: existing.id, method: "serial", confidence: "high", existingDevice: existing as unknown as Record<string, unknown> };
  }

  // 2. MAC address match
  if (macAddress) {
    const existing = await prisma.customerCollectedDevice.findFirst({
      where: { customerId, deviceType: "network", macAddress },
    });
    if (existing) return { found: true, existingDeviceId: existing.id, method: "mac", confidence: "high", existingDevice: existing as unknown as Record<string, unknown> };
  }

  // 3. IP address match
  if (ipAddress) {
    const existing = await prisma.customerCollectedDevice.findFirst({
      where: { customerId, deviceType: "network", ipAddress },
    });
    if (existing) return { found: true, existingDeviceId: existing.id, method: "ip", confidence: "medium", existingDevice: existing as unknown as Record<string, unknown> };
  }

  return { found: false, existingDeviceId: null, method: "none", confidence: "low", existingDevice: null };
}

/* ─── Route handler ────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  // Parse raw body
  let body: unknown;
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON body", code: "INVALID_JSON" }, { status: 400 });
  }

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

  // Parse devices (auto-detects GLPI native vs legacy format)
  let parsedDevices: NetworkDeviceRecord[];
  try {
    parsedDevices = parsePayload(body);
  } catch (err: unknown) {
    const msg = err instanceof z.ZodError
      ? `Validation error: ${err.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ")}`
      : `Invalid format: ${err instanceof Error ? err.message : "unknown error"}`;
    return Response.json({ error: msg, code: "VALIDATION_ERROR" }, { status: 400 });
  }

  if (parsedDevices.length === 0) {
    return Response.json({
      error: "No valid network devices found in payload",
      code: "NO_DEVICES",
    }, { status: 400 });
  }

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
