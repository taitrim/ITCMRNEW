import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createReviewData } from "@/lib/inventory-matching";

/* ===== Parser =====
 *
 * PowerShell script gửi:
 *   { action: "inventory", deviceid: "PC-12345", content: { hardware: {...}, bios: {...}, ... } }
 *
 * GLPI Agent gửi:
 *   { action: "inventory", deviceid: "PC-...", content: { hardware, bios, printers, monitors, ... } }
 *
 * Trả về nhiều DeviceRecord:
 *   [0] = computer chính
 *   [1..n] = peripherals (monitor ngoài, printer vật lý)
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
  parentDeviceId?: string;
  assignedUserId?: string;
};

/** Kiểm tra printer ảo (Windows built-in, app software) */
function isVirtualPrinter(p: any): boolean {
  const name = (p.name || "").toLowerCase();
  const port = (p.port || "").toLowerCase();
  const virtualNames = [
    "microsoft print to pdf", "microsoft xps document writer",
    "fax", "send to onenote", "onenote", "snagit",
    "adobe pdf", "cute pdf writer", "pdfcreator",
    "doro pdf", "bullzip pdf printer", "do pdf",
    "universal print", "microsoft print to",
  ];
  if (virtualNames.some(v => name.includes(v))) return true;
  // Port software: PORTPROMPT:, nul:, : (prompt port)
  if (port.includes("prompt") || port === "nul:" || port.endsWith("prompt:")) return true;
  return false;
}

/** Parse computer chính từ content */
function parseMainComputer(
  body: Record<string, unknown>,
  content: Record<string, any>,
  deviceid: string,
): DeviceRecord {
  const hw = content.hardware || {};
  const bios = content.bios || {};
  const os = content.operatingsystem || {};
  const cpus = Array.isArray(content.cpus) ? content.cpus : [];
  const storages = Array.isArray(content.storages) ? content.storages : [];
  const nets = Array.isArray(content.networks) ? content.networks : [];
  const users = Array.isArray(content.users) ? content.users : [];

  const cpuList = cpus.map((p: any) => p.name || "").filter(Boolean).join("; ");
  const ramMb = hw.memory || 0;
  const ramStr = ramMb ? `${Math.round(Number(ramMb))} MB` : "";
  const totalDiskMb = storages.reduce((sum: number, s: any) => sum + (Number(s.disksize) || 0), 0);
  const diskGB = totalDiskMb > 0 ? Math.round(totalDiskMb / 1024) : 0;
  const diskStr = diskGB > 0 ? `${diskGB} GB` : "";
  const serialNumber = bios.sserial || bios.serial_number || hw.uuid || hw.serial_number || "";
  const manufacturer = bios.smanufacturer || "";
  const modelName = bios.smodel || "";
  const activeNet = nets.find((n: any) => n.ipaddress || n.ip) || nets[0] || {};
  const ipAddress = activeNet.ipaddress || activeNet.ip || "";
  const macAddress = activeNet.macaddr || activeNet.mac || "";
  const loggedUser = users.map((u: any) => u.LOGIN || u.login || "").filter(Boolean).join("; ");

  // Build components JSON
  const components: Record<string, any> = {};
  for (const [key, value] of Object.entries(content)) {
    if (value === null || value === undefined) continue;
    components[key] = value;
  }
  if (content.operatingsystem) components.os = content.operatingsystem;
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

  const deviceType = (hw.chassis_type || "").toLowerCase() === "laptop" ? "laptop" : "computer";

  return {
    deviceId: String(deviceid || `${hw.name || ""}_${serialNumber || ""}_${Date.now()}`),
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
    notes: `GLPI Agent — hostname: ${hw.name || ""}, user: ${loggedUser}`,
    componentsJson: JSON.stringify(components),
  };
}

/** Parse printer từ GLPI content (bỏ qua printer ảo) */
function parsePrinters(content: Record<string, any>, parentDeviceId: string): DeviceRecord[] {
  const printers = Array.isArray(content.printers) ? content.printers : [];
  const result: DeviceRecord[] = [];
  for (const p of printers) {
    if (isVirtualPrinter(p)) continue;
    const name = p.name || "Unknown Printer";
    const manufacturer = p.manufacturer || (p.name || "").split(" ")[0] || "";
    const modelName = p.model || p.name || "";
    const serial = p.serial || "";
    const port = p.port || "";
    const driver = p.driver || "";
    const isColor = p.color === true || p.color === "true" || p.color === "1";
    const isDuplex = p.duplex === true || p.duplex === "true" || p.duplex === "1";
    const resolution = p.resolution || "";
    const pageTotal = p.pages_total || p.pages || p.total_pages || "";
    const status = p.status || "";

    // Build notes with rich detail
    const detailParts: string[] = [`Máy in — ${manufacturer} ${modelName}`];
    if (port) detailParts.push(`port: ${port}`);
    if (driver) detailParts.push(`driver: ${driver}`);
    if (isColor) detailParts.push("màu");
    if (isDuplex) detailParts.push("2 mặt");
    if (resolution) detailParts.push(`${resolution} dpi`);
    if (pageTotal) detailParts.push(`đã in: ${pageTotal} trang`);
    if (p.network) detailParts.push("mạng");
    if (p.shared) detailParts.push("chia sẻ");
    if (status) detailParts.push(`status: ${status}`);

    // Enrich componentsJson with extracted fields
    const enhancedPrinter = {
      ...p,
      _extracted: {
        isColor,
        isDuplex,
        resolution,
        pageTotal: pageTotal ? Number(pageTotal) : undefined,
        driver,
        manufacturer,
        modelName,
      },
    };

    result.push({
      deviceId: `printer_${serial || name.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`,
      deviceType: "printer",
      name,
      manufacturer,
      modelName,
      serialNumber: serial,
      ipAddress: port,
      macAddress: "",
      cpu: "", ram: "", disk: "", os: "",
      notes: detailParts.join(" · "),
      componentsJson: JSON.stringify(enhancedPrinter),
      parentDeviceId,
    });
  }
  return result;
}

/** Parse monitor từ GLPI content (bỏ qua built-in laptop/AIO) */
function parseMonitors(content: Record<string, any>, parentDeviceId: string, isLaptop: boolean): DeviceRecord[] {
  const monitors = Array.isArray(content.monitors) ? content.monitors : [];
  const result: DeviceRecord[] = [];
  for (const m of monitors) {
    // Built-in laptop/AIO monitor: không có serial hoặc tên giống laptop
    const serial = m.serial || "";
    const caption = m.caption || m.name || "";
    if (!serial) continue; // monitor tích hợp không có serial
    if (isLaptop && (!serial || serial.length < 4)) continue;
    result.push({
      deviceId: `monitor_${serial}_${Date.now()}`,
      deviceType: "monitor",
      name: caption || `Monitor ${serial.substring(0, 8)}`,
      manufacturer: m.manufacturer || "",
      modelName: caption || m.description || "",
      serialNumber: serial,
      ipAddress: "", macAddress: "",
      cpu: "", ram: "", disk: "", os: "",
      notes: `Monitor — ${m.manufacturer || ""} ${caption}`.trim(),
      componentsJson: JSON.stringify(m),
      parentDeviceId,
    });
  }
  return result;
}

function parsePowerShellPayload(body: Record<string, unknown>): DeviceRecord[] {
  const content = (body.content as Record<string, any>) || {};
  const hw = content.hardware || {};
  const deviceid = String(body.deviceid || `${hw.name || ""}_${Date.now()}`);
  const isLaptop = (hw.chassis_type || "").toLowerCase() === "laptop";

  // 1. Computer chính
  const mainDevice = parseMainComputer(body, content, deviceid);
  const devices: DeviceRecord[] = [mainDevice];

  // 2. Printer vật lý
  const printers = parsePrinters(content, mainDevice.deviceId);
  devices.push(...printers);

  // 3. Monitor ngoài
  const monitors = parseMonitors(content, mainDevice.deviceId, isLaptop);
  devices.push(...monitors);

  return devices;
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
