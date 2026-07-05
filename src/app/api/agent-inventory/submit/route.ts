import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createReviewData } from "@/lib/inventory-matching";

/* ===== Flat PowerShel format parser =====
 *
 * PowerShell script gửi:
 *   { action: "inventory", deviceid: "PC-12345", content: { hardware: {...}, bios: {...}, ... } }
 */
type DeviceRecord = {
  deviceId: string;
  deviceType: string;
  name: string;
  manufacturer: string;
  modelName: string;
  serialNumber: string;
  ipAddress: string;
  macAddress: string;
  cpu: string;
  ram: string;
  disk: string;
  os: string;
  notes: string;
  componentsJson: string | null;
};

function parsePowerShellPayload(body: Record<string, unknown>): DeviceRecord[] {
  const content = (body.content as Record<string, any>) || {};
  const hw = content.hardware || {};
  const bios = content.bios || {};
  const os = content.operatingsystem || {};
  const cpus = Array.isArray(content.cpus) ? content.cpus : [];
  const storages = Array.isArray(content.storages) ? content.storages : [];
  const nets = Array.isArray(content.networks) ? content.networks : [];

  // CPU
  const cpuList = cpus.map((p: any) => p.name || "").filter(Boolean).join("; ");

  // RAM (hardware.memory in MB from PowerShell)
  const ramMb = hw.memory || 0;
  const ramStr = ramMb ? `${Math.round(Number(ramMb))} MB` : "";

  // Disk (storages.disksize in MB)
  const totalDiskMb = storages.reduce((sum: number, s: any) => sum + (Number(s.disksize) || 0), 0);
  const diskGB = totalDiskMb > 0 ? Math.round(totalDiskMb / 1024) : 0;
  const diskStr = diskGB > 0 ? `${diskGB} GB` : "";

  // Serial
  const serialNumber = bios.sserial || bios.serial_number || hw.uuid || hw.serial_number || "";

  // Manufacturer & Model
  const manufacturer = bios.smanufacturer || "";
  const modelName = bios.smodel || "";

  // IP & MAC
  const activeNet = nets.find((n: any) => n.ipaddress || n.ip) || nets[0] || {};
  const ipAddress = activeNet.ipaddress || activeNet.ip || "";
  const macAddress = activeNet.macaddr || activeNet.mac || "";

  // Users
  const users = Array.isArray(content.users) ? content.users : [];
  const loggedUser = users.map((u: any) => u.LOGIN || u.login || "").filter(Boolean).join("; ");

  // Build components JSON — include ALL content sections for DeviceComponentsPanel display
  // (softwares, antivirus, monitors, printers, memories, usbdevices, etc.)
  const components: Record<string, any> = {};
  for (const [key, value] of Object.entries(content)) {
    if (value === null || value === undefined) continue;
    components[key] = value; // keep all original keys (operatingsystem, bios, etc.)
  }
  // 'os' alias for backward compat with DeviceComponentsPanel (uses c.operatingsystem)
  if (content.operatingsystem) components.os = content.operatingsystem;
  // Override with enriched field mappings
  components.cpus = cpus.map((p: any) => ({
    name: p.name, manufacturer: p.manufacturer, speed: p.speed,
    core: p.core, thread: p.thread, serial: p.serial, id: p.id,
  }));
  components.storages = storages.map((s: any) => ({
    model: s.model || s.name || "", disksize: s.disksize || 0,
    interface: s.interface || "", type: s.type || "",
    serial: s.serial || "", firmware: s.firmware || "",
    manufacturer: s.manufacturer || "", description: s.description || "",
  }));
  components.hardware = {
    name: hw.name || "", chassis_type: hw.chassis_type || "",
    memory: hw.memory || 0, uuid: hw.uuid || "",
    defaultgateway: hw.defaultgateway || "", dns: hw.dns || "",
    lastloggeduser: hw.lastloggeduser || "",
    workgroup: hw.workgroup || "", vmsystem: hw.vmsystem || "",
  };
  components.users = users.map((u: any) => ({
    login: u.LOGIN || u.login || "", domain: u.domain || "",
  }));
  const componentsJson = JSON.stringify(components);

  const deviceType = (hw.chassis_type || "").toLowerCase() === "laptop" ? "laptop" : "computer";

  return [{
    deviceId: String(body.deviceid || `${hw.name || ""}_${serialNumber || ""}_${Date.now()}`),
    deviceType,
    name: hw.name || modelName || "Unknown PC",
    manufacturer,
    modelName,
    serialNumber,
    ipAddress,
    macAddress,
    cpu: cpuList,
    ram: ramStr,
    disk: diskStr,
    os: os.full_name || os.name || "",
    notes: `PowerShell Agent — user: ${loggedUser}`,
    componentsJson,
  }];
}

export async function POST(req: NextRequest) {
  try {
    // 1. Xác thực: customerId + agentKey
    const url = new URL(req.url);
    const customerId = url.searchParams.get("customerId") || "";
    const key = url.searchParams.get("key") || "";

    if (!customerId || !key) {
      return NextResponse.json({ error: "Missing authentication", code: "AUTH_REQUIRED" }, { status: 401 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, agentKey: true, agentEnabled: true, name: true },
    });

    if (!customer) {
      return NextResponse.json({ error: "Invalid customer", code: "INVALID_CUSTOMER" }, { status: 401 });
    }
    if (!customer.agentEnabled) {
      return NextResponse.json({ error: "Agent disabled", code: "AGENT_DISABLED" }, { status: 403 });
    }
    if (customer.agentKey !== key) {
      return NextResponse.json({ error: "Invalid key", code: "INVALID_KEY" }, { status: 401 });
    }

    // 2. Đọc payload
    const rawText = await req.text();
    if (!rawText) {
      return NextResponse.json({ error: "Empty payload", code: "EMPTY_PAYLOAD" }, { status: 400 });
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawText);
    } catch {
      return NextResponse.json({ error: "Invalid JSON", code: "INVALID_JSON" }, { status: 400 });
    }

    // 3. Parse inventory thành DeviceRecord[] rồi match
    const devices = parsePowerShellPayload(payload);
    const reviewData = await createReviewData(customerId, devices as Record<string, unknown>[]);

    // 4. Lưu submission
    const submission = await prisma.inventorySubmission.create({
      data: {
        customerId,
        rawPayload: rawText,
        reviewData: JSON.stringify(reviewData),
        status: "pending",
        deviceCount: reviewData.devices.length,
      },
    });

    return NextResponse.json({
      data: {
        id: submission.id,
        deviceCount: reviewData.devices.length,
        status: "pending",
      },
    });
  } catch (error) {
    console.error("[submit]", error);
    return NextResponse.json({ error: "Internal error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
