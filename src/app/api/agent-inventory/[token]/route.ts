import { prisma } from "@/lib/db";

/* ===== GLPI Agent Inventory Parser =====
 *
 * Định dạng FusionInventory (từ --server):
 *   { "action": "inventory", "content": { "computers": [{...}], "monitors": [...], ... } }
 *
 * Định dạng flat (từ --local --json --full):
 *   { "action": "inventory", "content": { "hardware": {...}, "cpus": [...], "networks": [...], "operatingsystem": {...}, ... } }
 *
 * Parser tự động detect format.
 */

type DeviceRecord = {
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

type InventoryPayload = Record<string, unknown>;

/* ===== Dispatcher: detect format and route ===== */
function parseInventory(body: InventoryPayload): DeviceRecord[] {
  const content = (body.content as Record<string, any>) || {};
  // Flat format has no "computers" key — categories are at content root
  if (!content.computers && (content.hardware || content.cpus || content.networks || content.operatingsystem)) {
    return parseFlatInventory(content, body.deviceid as string);
  }
  // FusionInventory format — has content.computers array
  return parseFusionInventory(body);
}

/* ===== Flat format parser (--local --json --full) ===== */
function parseFlatInventory(content: Record<string, any>, deviceId: string): DeviceRecord[] {
  const devices: DeviceRecord[] = [];

  // === Main computer device ===
  const hw = content.hardware || {};
  const bios = content.bios || {};
  const os = content.operatingsystem || {};
  const cpus = asArray(content.cpus);
  const nets = asArray(content.networks);
  const drives = asArray(content.drives);
  const storages = asArray(content.storages);
  const videos = asArray(content.videos);
  const monitors = asArray(content.monitors);
  const softwares = asArray(content.softwares);
  const printers = asArray(content.printers);
  const memorySticks = asArray(content.memory || content.slots);

  // CPU
  const cpuList = cpus.map((p: any) => {
    const name = p.name || p.description || p.caption || "";
    const freq = p.frequency || p.max_frequency || p.speed || "";
    return freq ? `${name} @ ${freq}MHz` : name;
  }).filter(Boolean).join("; ");

  // RAM
  const ramMb = hw.memory || hw.physical_memory || 0;
  const ramStr = ramMb ? `${Math.round(ramMb)} MB` : "";

  // Disk — prefer physical storages over logical drives
  const totalStorage = storages.reduce((sum: number, s: any) => sum + (s.size || s.capacity || 0), 0);
  const totalDrives = drives.reduce((sum: number, d: any) => sum + ((d.total || 0) * 1024 * 1024), 0); // drives.total is MB
  const totalDisk = totalStorage > 0 ? totalStorage : totalDrives;
  const diskStr = totalDisk > 0 ? formatBytes(totalDisk) : "";

  // Serial: try bios fields, then hardware uuid as fallback
  const serialNumber = bios.sserial || bios.serial_number || hw.serial_number || "";

  // Manufacturer & model
  const manufacturer = bios.smanufacturer || bios.mmanufacturer || hw.manufacturer || "";
  const modelName = bios.smodel || bios.mmodel || hw.model || "";

  // IP & MAC from first network
  const firstNet = nets[0] || {};

  // Build components JSON
  const components: Record<string, any> = {};

  // Memory sticks
  const memList: any[] = memorySticks.map((s: any) => ({
    capacity: s.capacity,
    speed: s.speed,
    manufacturer: s.manufacturer || s.vendor,
    slot: s.slot || s.name || s.caption,
    type: s.type || s.caption,
  }));
  if (memList.length > 0) components.memory = memList;

  // Physical storage drives
  const diskList: any[] = storages.map((s: any) => ({
    model: s.model || s.name || s.caption,
    size: s.size || s.capacity,
    interface: s.interface || s.interface_type,
    type: (s.is_ssd || s.ssd) ? "SSD" : (s.disk_type || "HDD"),
  }));
  if (diskList.length > 0) components.disks = diskList;

  // Logical drives (volumes)
  const volList: any[] = drives.map((d: any) => ({
    letter: d.letter || "",
    label: d.label || d.volumn || "",
    filesystem: d.filesystem || "",
    total: d.total || 0,
    free: d.free || 0,
  }));
  if (volList.length > 0) components.volumes = volList;

  // GPUs
  const gpuList: any[] = videos.map((v: any) => ({
    name: v.name || v.chipset || v.caption,
    memory: v.memory,
    driver: v.driver_version || v.driver,
  }));
  if (gpuList.length > 0) components.gpus = gpuList;

  // Monitors
  const monList: any[] = monitors.map((m: any) => ({
    name: m.name || m.caption,
    manufacturer: m.manufacturer,
    serial: m.serial_number || m.serial,
  }));
  if (monList.length > 0) components.monitors = monList;

  // Software
  const swList: any[] = softwares.map((s: any) => ({
    name: s.name,
    version: s.version,
    publisher: s.publisher || s.manufacturer,
  }));
  if (swList.length > 0) components.software = swList;

  // Network adapters
  const netList: any[] = nets.map((n: any) => ({
    name: n.name || n.caption,
    mac: n.mac_address || n.mac,
    ip: n.ip_address || n.ip,
    speed: n.speed,
    type: n.type || n.adapter_type,
  }));
  if (netList.length > 0) components.network = netList;

  // BIOS
  components.bios = {
    manufacturer: bios.bmanufacturer || bios.manufacturer || "",
    version: bios.bversion || bios.version || "",
    date: bios.bdate || bios.date || "",
  };

  // OS
  components.os = {
    name: os.full_name || os.name || os.caption || "",
    version: os.version || "",
    build: os.build_number || os.build || "",
    architecture: os.architecture || "",
  };

  // Form factor
  components.formFactor = getFormFactor(hw);

  // CPU summary
  components.cpuSummary = cpuList;

  const componentsJson = Object.keys(components).length > 0 ? JSON.stringify(components) : null;

  devices.push({
    deviceType: "computer",
    name: hw.name || hw.hostname || modelName || "Unknown PC",
    manufacturer,
    modelName,
    serialNumber,
    ipAddress: firstNet.ip_address || firstNet.ip || "",
    macAddress: firstNet.mac_address || firstNet.mac || "",
    cpu: cpuList,
    ram: ramStr,
    disk: diskStr,
    os: os.full_name || os.name || os.caption || "",
    notes: `GLPI Agent inventory (flat) — deviceid: ${deviceId || ""}`,
    componentsJson,
  });

  // Additional network interfaces as separate network devices
  for (let i = 1; i < nets.length; i++) {
    const n = nets[i];
    if (n.mac_address || n.ip_address || n.mac || n.ip) {
      devices.push({
        deviceType: "network",
        name: n.name || `Network ${i}`,
        manufacturer: "",
        modelName: "",
        serialNumber: "",
        ipAddress: n.ip_address || n.ip || "",
        macAddress: n.mac_address || n.mac || "",
        cpu: "",
        ram: "",
        disk: "",
        os: "",
        notes: `Network interface #${i + 1}`,
        componentsJson: null,
      });
    }
  }

  // === Standalone monitors ===
  for (const m of monitors as any[]) {
    devices.push({
      deviceType: "monitor",
      name: m.name || "Monitor",
      manufacturer: m.manufacturer || "",
      modelName: m.name || "",
      serialNumber: m.serial_number || m.serial || "",
      ipAddress: "", macAddress: "",
      cpu: m.size ? `${m.size}"` : "",
      ram: (m.resolution || `${m.width || ""}x${m.height || ""}`).replace(/^x$/, ""),
      disk: m.display_type || m.type || "",
      os: "",
      notes: "", componentsJson: JSON.stringify({ size: m.size, resolution: m.resolution, type: m.display_type }),
    });
  }

  // === Standalone printers ===
  for (const p of printers as any[]) {
    devices.push({
      deviceType: "printer",
      name: p.name || "Printer",
      manufacturer: p.manufacturer || "",
      modelName: p.name || "",
      serialNumber: p.serial_number || "",
      ipAddress: p.ip || "",
      macAddress: "",
      cpu: p.printer_type || p.type || "",
      ram: "",
      disk: "",
      os: "",
      notes: "",
      componentsJson: JSON.stringify({
        type: p.printer_type || p.type,
        cartridges: (p.cartridges || []).map((c: any) => ({ name: c.name, type: c.type, level: c.level })),
        connectivity: p.connectivity || "",
      }),
    });
  }

  return devices;
}

/* ===== FusionInventory format parser (từ --server) ===== */
function parseFusionInventory(body: InventoryPayload): DeviceRecord[] {
  const content: Record<string, any> = (body.content as any) || {};
  const devices: DeviceRecord[] = [];

  // Parse computers
  const computers = asArray(content.computers);
  for (const c of computers as any[]) {
    const hw = c.hardware || {};
    const os = c.operatingsystem || {};
    const mem = c.memory || {};
    const procs = c.processors || [];
    const nets = c.networks || [];
    const storage = c.storage || {};
    const vols = storage.volumes || [];
    const drives = storage.drives || storage.disks || [];
    const memorySticks = mem.sticks || mem.modules || c.memory_sticks || [];
    const softwares = content.softwares || [];
    const videos = content.videos || [];

    const cpuList = procs.map((p: any) => `${p.name}${p.frequency ? ` @ ${p.frequency}MHz` : ""}`).join("; ");

    // Prefer physical drives (Win32_DiskDrive) over logical volumes for accuracy
    const totalDiskPhys = drives.reduce((sum: number, d: any) => sum + ((d.size || d.capacity) as number), 0);
    const totalDiskVol = vols.reduce((sum: number, v: any) => sum + (v.total || 0), 0);
    const totalDisk = totalDiskPhys > 0 ? totalDiskPhys : totalDiskVol;
    const diskStr = totalDisk > 0 ? formatBytes(totalDisk) : "";
    const ramStr = mem.physical_memory ? `${mem.physical_memory} MB` : "";

    // Build components JSON
    const components: Record<string, any> = {};
    const totalSlots = mem.total_slots || 0;

    // Memory sticks
    const memList: any[] = [];
    for (const s of memorySticks as any[]) {
      memList.push({
        capacity: s.capacity,
        speed: s.speed,
        manufacturer: s.manufacturer || s.vendor,
        slot: s.slot || s.name,
        type: s.type || s.caption,
      });
    }
    if (memList.length === 0 && mem.physical_memory) {
      memList.push({ capacity: mem.physical_memory * 1024 * 1024, speed: null, manufacturer: null, slot: null, type: null });
    }
    components.memory = memList;
    if (totalSlots > 0) components.totalSlots = totalSlots;

    // Disk drives
    const diskList: any[] = [];
    for (const d of drives as any[]) {
      diskList.push({
        model: d.model || d.name,
        size: d.size || d.capacity,
        interface: d.interface || d.type,
        type: d.disk_type || (d.is_ssd ? "SSD" : "HDD"),
      });
    }
    if (diskList.length === 0 && vols.length > 0) {
      for (const v of vols as any[]) {
        diskList.push({ model: null, size: v.total, interface: null, type: null });
      }
    }
    components.disks = diskList;

    // GPUs
    const gpuList: any[] = [];
    for (const v of videos as any[]) {
      gpuList.push({
        name: v.name || v.chipset,
        memory: v.memory,
        driver: v.driver_version || v.driver,
      });
    }
    components.gpus = gpuList;

    // Monitors (from device-level monitors if available)
    const monList: any[] = [];
    for (const m of (c.monitors || []) as any[]) {
      monList.push({ name: m.name, manufacturer: m.manufacturer, serial: m.serial_number });
    }
    components.monitors = monList;

    // Software
    const swList: any[] = [];
    for (const s of softwares as any[]) {
      swList.push({
        name: s.name,
        version: s.version,
        publisher: s.publisher || s.manufacturer,
      });
    }
    components.software = swList;

    // Network adapters
    const netList: any[] = [];
    for (const n of nets as any[]) {
      netList.push({
        name: n.name,
        mac: n.mac_address,
        ip: n.ip_address,
        speed: n.speed,
      });
    }
    components.network = netList;

    // BIOS & OS
    components.bios = {
      manufacturer: hw.bios_manufacturer || hw.manufacturer,
      version: hw.bios_version,
      date: hw.bios_date,
    };
    components.os = {
      name: os.full_name || os.name,
      version: os.version,
      build: os.build_number,
      architecture: os.architecture,
    };
    components.formFactor = getFormFactor(hw);
    components.cpuSummary = cpuList;

    const componentsJson = Object.keys(components).length > 0 ? JSON.stringify(components) : null;

    devices.push({
      deviceType: "computer",
      name: c.name || hw.model || "Unknown PC",
      manufacturer: hw.manufacturer || "",
      modelName: hw.model || "",
      serialNumber: hw.serial_number || "",
      ipAddress: nets[0]?.ip_address || "",
      macAddress: nets[0]?.mac_address || "",
      cpu: cpuList,
      ram: ramStr,
      disk: diskStr,
      os: os.full_name || os.name || "",
      notes: `GLPI Agent inventory — deviceid: ${(body as any).deviceid || ""}`,
      componentsJson,
    });

    // Parse additional network interfaces as separate network devices
    for (let i = 1; i < nets.length; i++) {
      const n = nets[i];
      if (n.mac_address || n.ip_address) {
        devices.push({
          deviceType: "network",
          name: n.name || `Network ${i}`,
          manufacturer: "",
          modelName: "",
          serialNumber: "",
          ipAddress: n.ip_address || "",
          macAddress: n.mac_address || "",
          cpu: "",
          ram: "",
          disk: "",
          os: "",
          notes: `Network interface #${i + 1} từ máy ${c.name || hw.model || ""}`,
          componentsJson: null,
        });
      }
    }
  }

  // Parse monitors
  const monitors = asArray(content.monitors);
  for (const m of monitors as any[]) {
    devices.push({
      deviceType: "monitor",
      name: m.name || "Monitor",
      manufacturer: m.manufacturer || "",
      modelName: m.name || "",
      serialNumber: m.serial_number || "",
      ipAddress: "", macAddress: "",
      cpu: m.size ? `${m.size}"` : "",
      ram: m.resolution || `${m.width || ""}x${m.height || ""}`,
      disk: m.display_type || m.type || "",
      os: "",
      notes: "",
      componentsJson: JSON.stringify({
        size: m.size, resolution: m.resolution, display_type: m.display_type,
        manufacturer: m.manufacturer, name: m.name, serial: m.serial_number,
      }),
    });
  }

  // Parse printers
  const printers = asArray(content.printers);
  for (const p of printers as any[]) {
    devices.push({
      deviceType: "printer",
      name: p.name || "Printer",
      manufacturer: p.manufacturer || "",
      modelName: p.name || "",
      serialNumber: p.serial_number || "",
      ipAddress: (p as any).ip || "",
      macAddress: "",
      cpu: p.printer_type || p.type || p.comment || "",
      ram: (p.cartridges || p.toners || []).length > 0 ? `${(p.cartridges || p.toners || []).length} hộp` : "",
      disk: "", os: "",
      notes: "",
      componentsJson: JSON.stringify({
        printer_type: p.printer_type || p.type, cartridges: (p.cartridges || p.toners || []),
        connectivity: p.connectivity, serial: p.serial_number,
      }),
    });
  }

  // Parse peripherals
  const peripherals = asArray(content.peripherals);
  for (const p of peripherals as any[]) {
    devices.push({
      deviceType: "peripheral", name: p.name || "Peripheral",
      manufacturer: p.manufacturer || "", modelName: p.name || "",
      serialNumber: p.serial_number || "",
      ipAddress: "", macAddress: "", cpu: "", ram: "", disk: "", os: "",
      notes: "", componentsJson: null,
    });
  }

  // Parse networks (switches, routers, APs)
  const networks = asArray(content.networks);
  for (const n of networks as any[]) {
    if (!n.ip_address && !n.mac_address && !n.serial_number) continue;
    devices.push({
      deviceType: "network",
      name: n.name || "Network device",
      manufacturer: n.manufacturer || "",
      modelName: n.name || "",
      serialNumber: n.serial_number || "",
      ipAddress: n.ip || n.ip_address || "",
      macAddress: n.mac_address || "",
      cpu: n.network_type || n.type || "",
      ram: n.firmware || n.sysdescr || "",
      disk: (n.ports || n.port_count) ? `${n.ports || n.port_count} cổng` : "",
      os: "",
      notes: "",
      componentsJson: JSON.stringify({
        type: n.network_type || n.type, firmware: n.firmware || n.sysdescr,
        version: n.version, port_count: n.ports || n.port_count,
        ports: (n.ports_list || n.port_details || []).map((pt: any) => ({ name: pt.name || pt.port, type: pt.type, speed: pt.speed })),
        manufacturer: n.manufacturer, name: n.name,
      }),
    });
  }

  // Parse phones
  const phones = asArray(content.phones);
  for (const p of phones as any[]) {
    devices.push({
      deviceType: "phone",
      name: p.name || "Phone",
      manufacturer: p.manufacturer || "",
      modelName: p.name || "",
      serialNumber: p.serial_number || "",
      ipAddress: p.ip || "",
      macAddress: p.mac_address || "",
      cpu: p.firmware || "",
      ram: p.phone_number || p.line || "",
      disk: "", os: "",
      notes: "",
      componentsJson: JSON.stringify({ firmware: p.firmware, phone_number: p.phone_number || p.line, phone_type: p.phone_type || p.type, mac: p.mac_address }),
    });
  }

  return devices;
}

function asArray(val: unknown): any[] {
  if (Array.isArray(val)) return val;
  if (val && typeof val === "object") return [val];
  return [];
}

function asObj<T = Record<string, unknown>>(val: unknown): T {
  if (val && typeof val === "object" && !Array.isArray(val)) return val as T;
  return {} as T;
}

/* Chassis type → form factor label (GLPI-style) */
const CHASSIS_MAP: Record<number, string> = {
  3: 'Desktop', 4: 'Desktop', 5: 'Desktop', 6: 'Desktop', 7: 'Desktop',
  8: 'Laptop', 9: 'Laptop', 10: 'Laptop', 12: 'Laptop', 14: 'Laptop',
  13: 'AIO', 23: 'Rack Mount', 24: 'Desktop', 30: 'Tablet',
  31: 'Laptop', 32: 'Laptop',
};

function getFormFactor(hw: Record<string, any>): string {
  // GLPI Agent FusionInventory: hw.type = "laptop" / "desktop"
  if (hw.type && typeof hw.type === 'string') {
    const t = hw.type.toLowerCase();
    if (t.includes('laptop') || t.includes('notebook')) return 'Laptop';
    if (t.includes('aio') || t.includes('all-in-one')) return 'AIO';
    if (t.includes('desktop') || t.includes('tower') || t.includes('mini')) return 'Desktop';
    if (t.includes('rack')) return 'Rack Mount';
    if (t.includes('tablet')) return 'Tablet';
    return hw.type;
  }
  // Chassis type number (from Win32_SystemEnclosure)
  const ct = hw.chassis_type;
  if (ct != null) {
    return CHASSIS_MAP[ct] || `Chassis-${ct}`;
  }
  // Fallback: guess from model keywords
  const model = (hw.model || '').toLowerCase();
  if (model.includes('laptop') || model.includes('thinkpad') || model.includes('latitude') || model.includes('elitebook') || model.includes('probook')) return 'Laptop';
  if (model.includes('aio') || model.includes('all-in-one') || model.includes('optiplex') || model.includes('elitedesk')) return 'Desktop';
  return 'Desktop';
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000_000) return `${(bytes / 1_000_000_000_000).toFixed(1)} TB`;
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${bytes} B`;
}

/* ===== Route Handler ===== */

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Find session by token
  const session = await prisma.collectionSession.findUnique({
    where: { token },
    include: { address: { select: { id: true, label: true } } },
  });

  if (!session) {
    return Response.json({ error: "Invalid token", code: "INVALID_TOKEN" }, { status: 404 });
  }

  if (session.status === "failed") {
    return Response.json({ error: "Session failed", code: "SESSION_FAILED" }, { status: 410 });
  }

  if (session.expiresAt && new Date() > session.expiresAt) {
    await prisma.collectionSession.update({
      where: { id: session.id },
      data: { status: "failed", errorMessage: "Token expired" },
    });
    return Response.json({ error: "Token expired", code: "TOKEN_EXPIRED" }, { status: 410 });
  }

  // Parse body
  let body: InventoryPayload;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body", code: "INVALID_JSON" }, { status: 400 });
  }

  // Parse inventory
  const devices = parseInventory(body);
  const rawPayload = JSON.stringify(body);

  // Mark session as active (first time or subsequent)
  if (session.status === "pending") {
    await prisma.collectionSession.update({
      where: { id: session.id },
      data: { status: "active", startedAt: new Date(), rawPayload },
    });
  } else {
    // Append raw payload (keep history)
    await prisma.collectionSession.update({
      where: { id: session.id },
      data: { rawPayload: session.rawPayload
        ? `${session.rawPayload}\n---NEXT SUBMISSION---\n${rawPayload}`
        : rawPayload },
    });
  }

  // Create or UPDATE device records (dedup by serialNumber + deviceType for same customer)
  const created: Array<Record<string, unknown>> = [];
  const updated: Array<Record<string, unknown>> = [];

  for (const d of devices) {
    // Try to find existing device by serialNumber (most reliable) OR by matching name+manufacturer
    let existing: any = null;
    if (d.serialNumber) {
      existing = await prisma.customerCollectedDevice.findFirst({
        where: {
          customerId: session.customerId,
          deviceType: d.deviceType,
          serialNumber: d.serialNumber,
        },
      });
    }
    // Fallback: match by manufacturer+modelName if no serial
    if (!existing && d.manufacturer && d.modelName) {
      existing = await prisma.customerCollectedDevice.findFirst({
        where: {
          customerId: session.customerId,
          deviceType: d.deviceType,
          manufacturer: d.manufacturer,
          modelName: d.modelName,
        },
      });
    }

    if (existing) {
      // UPDATE existing device
      const device = await prisma.customerCollectedDevice.update({
        where: { id: existing.id },
        data: {
          manufacturer: d.manufacturer || existing.manufacturer,
          modelName: d.modelName || existing.modelName,
          serialNumber: d.serialNumber || existing.serialNumber,
          ipAddress: d.ipAddress || existing.ipAddress,
          macAddress: d.macAddress || existing.macAddress,
          cpu: d.cpu || existing.cpu,
          ram: d.ram || existing.ram,
          disk: d.disk || existing.disk,
          os: d.os || existing.os,
          componentsJson: d.componentsJson || existing.componentsJson,
          notes: d.notes ? (existing.notes ? `${existing.notes}\n${d.notes}` : d.notes) : existing.notes,
          sessionId: session.id,
          condition: existing.condition || null,
          collectedAt: new Date(),
        },
        include: {
          address: { select: { id: true, label: true, address: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true, code: true, department: true } },
        },
      });
      updated.push(device);
    } else {
      // CREATE new device
      const device = await prisma.customerCollectedDevice.create({
        data: {
          customerId: session.customerId,
          addressId: session.addressId,
          deviceType: d.deviceType,
          manufacturer: d.manufacturer || null,
          modelName: d.modelName || null,
          serialNumber: d.serialNumber || null,
          ipAddress: d.ipAddress || null,
          macAddress: d.macAddress || null,
          cpu: d.cpu || null,
          ram: d.ram || null,
          disk: d.disk || null,
          os: d.os || null,
          componentsJson: d.componentsJson || null,
          notes: d.notes || null,
          collectedById: session.collectedById || undefined,
          sessionId: session.id,
          status: "active",
          condition: null,
        },
        include: {
          address: { select: { id: true, label: true, address: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true, code: true, department: true } },
        },
      });
      created.push(device);
    }
  }

  // Update session stats
  const totalDevices = await prisma.customerCollectedDevice.count({
    where: { customerId: session.customerId, sessionId: session.id },
  });

  await prisma.collectionSession.update({
    where: { id: session.id },
    data: {
      deviceCount: totalDevices,
      completedAt: new Date(), // bump timestamp
    },
  });

  return Response.json({
    success: true,
    message: `Created ${created.length}, updated ${updated.length} devices`,
    created: created.length,
    updated: updated.length,
    totalDevices,
    sessionId: session.id,
  });
}
