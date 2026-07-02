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
  parentDeviceId?: string;  // For monitors/peripherals linked to a computer
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

/* ===== Flat format parser (--local --json --full) =====
 *
 * Field names verified against real GLPI Agent 1.18 --full output.
 * See test data: DESKTOP-ERUUSFN-2026-06-29-21-21-48.json (277KB, 32 categories)
 */
function parseFlatInventory(content: Record<string, any>, deviceId: string): DeviceRecord[] {
  const devices: DeviceRecord[] = [];

  // === Top-level categories from --full ===
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
  const memories = asArray(content.memories);     // slot positions only
  const slots = asArray(content.slots);            // PCI/PCIe slots
  const antivirus = asArray(content.antivirus);
  const firewalls = asArray(content.firewalls);
  const sounds = asArray(content.sounds);
  const controllers = asArray(content.controllers);
  const inputs = asArray(content.inputs);
  const usbdevices = asArray(content.usbdevices);
  const ports = asArray(content.ports);

  // === CPU (name: "Intel(R) Core(TM) i5-6500 CPU @ 3.20GHz", speed: 3200 MHz) ===
  const cpuList = cpus.map((p: any) => {
    const name = p.name || p.description || "";
    const speed = p.speed || p.frequency || "";
    return speed ? `${name} @ ${speed}MHz` : name;
  }).filter(Boolean).join("; ");

  // === RAM (hardware.memory = 16237 MB) ===
  const ramMb = hw.memory || 0;
  const ramStr = ramMb ? `${Math.round(ramMb)} MB` : "";

  // === Disk (storages.disksize is MB) ===
  const totalStorageMb = storages.reduce((sum: number, s: any) => sum + (s.disksize || 0), 0);
  const diskStr = totalStorageMb > 0 ? formatBytes(totalStorageMb * 1024 * 1024) : "";

  // === Serial: hardware has uuid but no serial; BIOS has no serial either ===
  const serialNumber = bios.sserial || bios.serial_number || hw.serial_number || hw.uuid || "";

  // === Manufacturer & Model (from bios.smanufacturer / bios.smodel) ===
  const manufacturer = bios.smanufacturer || bios.mmanufacturer || "";
  const modelName = bios.smodel || bios.mmodel || "";

  // === IP & MAC from first active network interface ===
  // Best active network — prefer IPv4 (not IPv6) and physical (not virtual)
  const activeNet = nets.find((n: any) => n.status === "up" && n.ipaddress && !n.virtualdev)
    || nets.find((n: any) => n.status === "up" && n.ipaddress)
    || nets.find((n: any) => n.status === "up" && n.ip)
    || nets[0] || {};

  // ========================================================
  // Build componentsJson — ALL detail for device detail page
  // ========================================================
  const components: Record<string, any> = {};

  // --- CPU ---
  components.cpus = cpus.map((p: any) => ({
    name: p.name,
    manufacturer: p.manufacturer,
    speed: p.speed,
    core: p.core,
    thread: p.thread,
    id: p.id,
    serial: p.serial,
    description: p.description,
  }));

  // --- OS ---
  components.operatingsystem = {
    full_name: os.full_name || os.name || "",
    name: os.name || "",
    kernel_name: os.kernel_name || "",
    version: os.version || "",
    kernel_version: os.kernel_version || "",
    build: os.service_pack || "",
    arch: os.arch || "",
    install_date: os.install_date || "",
    boot_time: os.boot_time || "",
    timezone: os.timezone || "",
    fqdn: os.fqdn || "",
    dns_domain: os.dns_domain || "",
  };

  // --- BIOS ---
  components.bios = {
    manufacturer: bios.bmanufacturer || "",
    version: bios.bversion || "",
    date: bios.bdate || "",
    system_manufacturer: bios.smanufacturer || "",
    system_model: bios.smodel || "",
    motherboard_manufacturer: bios.mmanufacturer || "",
    motherboard_model: bios.mmodel || "",
  };

  // --- Hardware ---
  const loggedUsers = asArray(content.users);
  components.hardware = {
    name: hw.name || "",
    chassis_type: hw.chassis_type || "",
    memory: hw.memory || 0,
    uuid: hw.uuid || "",
    defaultgateway: hw.defaultgateway || "",
    dns: hw.dns || "",
    lastloggeduser: hw.lastloggeduser || "",
    datelastloggeduser: hw.datelastloggeduser || "",
    workgroup: hw.workgroup || "",
    vmsystem: hw.vmsystem || "",
  };

  // --- Logged-in users (all OS: Windows via WMI, Linux/macOS via who/loginctl/last) ---
  // Each entry: { LOGIN: string, DOMAIN?: string }
  components.users = loggedUsers.map((u: any) => ({
    login: u.LOGIN || u.login || "",
    domain: u.DOMAIN || u.domain || "",
  }));

  // --- Memory slots (full detail: capacity/type/speed for populated slots, caption only for empty) ---
  // GLPI Agent --full outputs capacity/type/speed/manufacturer/model/serialnumber for populated slots,
  // and only caption + numslots for empty slots.
  components.memories = memories.map((m: any) => ({
    caption: m.caption || "",
    numslots: m.numslots || 0,
    capacity: m.capacity || null,
    description: m.description || "",
    manufacturer: m.manufacturer || "",
    model: m.model || "",
    serialnumber: m.serialnumber || "",
    speed: m.speed || null,
    type: m.type || "",
  }));

  // --- PCI/PCIe Slots ---
  components.slots = slots.map((s: any) => ({
    description: s.description || "",
    designation: s.designation || "",
    name: s.name || "",
    status: s.status || "",
  }));

  // --- Physical storages (disksize = MB) ---
  components.storages = storages.map((s: any) => ({
    model: s.model || s.name || "",
    disksize: s.disksize || 0,
    interface: s.interface || "",
    type: s.type || "",
    serial: s.serial || "",
    firmware: s.firmware || "",
    manufacturer: s.manufacturer || "",
    description: s.description || "",
  }));

  // --- Logical drives (total/free = MB) ---
  components.drives = drives.map((d: any) => ({
    letter: d.letter || "",
    label: d.label || d.volumn || "",
    filesystem: d.filesystem || "",
    total: d.total || 0,
    free: d.free || 0,
    serial: d.serial || "",
    encrypt_status: d.encrypt_status || "",
    encrypt_name: d.encrypt_name || "",
    systemdrive: d.systemdrive || false,
  }));

  // --- GPUs ---
  components.videos = videos.map((v: any) => ({
    name: v.name || v.chipset || "",
    chipset: v.chipset || "",
    memory: v.memory || 0,
    resolution: v.resolution || "",
    pcislot: v.pcislot || "",
  }));

  // --- Monitors ---
  components.monitors = monitors.map((m: any) => ({
    caption: m.caption || m.name || "",
    manufacturer: m.manufacturer || "",
    serial: m.serial || m.serial_number || "",
  }));

  // --- Network adapters — dedup by MAC address ---
  // GLPI Agent --full outputs one entry per IP address, so a single physical NIC
  // with IPv4 + multiple IPv6 addresses appears multiple times with the same MAC.
  // Merge: 1 entry per unique MAC, collect all IP addresses.
  const nicByMac = new Map<string, { n: any; ips: string[] }>();
  for (const n of nets as any[]) {
    const mac = (n.mac || n.mac_address || "").toLowerCase().trim();
    if (!mac) continue;  // skip entries without MAC (VPN adapters etc.)
    const ip = n.ipaddress || n.ip_address || n.ip || n.ipaddress6 || "";
    if (nicByMac.has(mac)) {
      // Merge IPs — avoid duplicates
      const existing = nicByMac.get(mac)!;
      if (ip && !existing.ips.includes(ip)) existing.ips.push(ip);
    } else {
      nicByMac.set(mac, { n, ips: ip ? [ip] : [] });
    }
  }
  components.networks = Array.from(nicByMac.entries()).map(([mac, { n, ips }]) => ({
    description: n.description || n.name || "",
    mac,
    ipaddress: ips.join(", "),
    ipmask: n.ipmask || "",
    ipgateway: n.ipgateway || "",
    ipdhcp: n.ipdhcp || "",
    ipsubnet: n.ipsubnet || "",
    speed: n.speed || "",
    status: n.status || "",
    type: n.type || "",
    virtualdev: n.virtualdev || false,
    pciid: n.pciid || "",
    pnpdeviceid: n.pnpdeviceid || "",
  }));

  // --- Software ---
  components.softwares = softwares.map((s: any) => ({
    name: s.name || "",
    version: s.version || "",
    publisher: s.publisher || s.manufacturer || "",
  }));

  // --- Printers ---
  components.printers = printers.map((p: any) => ({
    name: p.name || "",
    driver: p.driver || "",
    port: p.port || "",
    network: p.network || false,
    shared: p.shared || false,
    status: p.status || "",
    resolution: p.resolution || "",
  }));

  // --- Antivirus ---
  components.antivirus = antivirus.map((a: any) => ({
    name: a.name || "",
    company: a.company || "",
    enabled: a.enabled || false,
    uptodate: a.uptodate || false,
    base_version: a.base_version || "",
  }));

  // --- Firewalls ---
  components.firewalls = firewalls.map((f: any) => ({
    profile: f.profile || "",
    status: f.status || "",
  }));

  // --- Sound cards ---
  components.sounds = sounds.map((s: any) => ({
    caption: s.caption || "",
    description: s.description || "",
    manufacturer: s.manufacturer || "",
    name: s.name || "",
  }));

  // --- Controllers ---
  components.controllers = controllers.map((c: any) => ({
    caption: c.caption || "",
    manufacturer: c.manufacturer || "",
    name: c.name || "",
    type: c.type || "",
    pcislot: c.pcislot || "",
    vendorid: c.vendorid || "",
    productid: c.productid || "",
  }));

  // --- Input devices ---
  components.inputs = inputs.map((i: any) => ({
    caption: i.caption || "",
    description: i.description || "",
    name: i.name || "",
    layout: i.layout || "",
  }));

  // --- USB devices ---
  components.usbdevices = usbdevices.map((u: any) => ({
    caption: u.caption || "",
    manufacturer: u.manufacturer || "",
    name: u.name || "",
    serial: u.serial || "",
    vendorid: u.vendorid || "",
    productid: u.productid || "",
  }));

  // --- Ports ---
  components.ports = ports.map((p: any) => ({
    caption: p.caption || "",
    description: p.description || "",
    name: p.name || "",
    type: p.type || "",
  }));

  const formFactor = getFormFactor(hw);

  // --- Form factor ---
  components.formFactor = formFactor;

  // --- Total RAM for overview ---
  components.totalMemory = ramMb;

  const componentsJson = Object.keys(components).length > 0 ? JSON.stringify(components) : null;

  // deviceType uses normalized form factor instead of hardcoded "computer"
  const normalizedDeviceType = normalizeDeviceType(formFactor);

  devices.push({
    deviceType: normalizedDeviceType,
    name: hw.name || modelName || "Unknown PC",
    manufacturer,
    modelName,
    serialNumber,
    ipAddress: activeNet.ipaddress || activeNet.ip_address || activeNet.ip || "",
    macAddress: activeNet.mac || activeNet.mac_address || "",
    cpu: cpuList,
    ram: ramStr,
    disk: diskStr,
    os: os.full_name || os.name || "",
    notes: `GLPI Agent inventory (full) — deviceid: ${deviceId || ""}`,
    componentsJson,
  });

  // NOTE: Network interfaces are components of the computer, NOT separate devices.
  // They are already stored in components.networks. Do NOT create standalone "network" devices.
  // A physical switch/router at the customer site is a different story — that would be
  // entered manually or via a network discovery tool, not from GLPI Agent per-host inventory.

  // === Standalone monitors — linked to the parent computer ===
  for (const m of monitors as any[]) {
    devices.push({
      deviceType: "monitor",
      name: m.caption || m.name || "Monitor",
      manufacturer: m.manufacturer || "",
      modelName: m.caption || m.name || "",
      serialNumber: m.serial || m.serial_number || "",
      ipAddress: "", macAddress: "",
      cpu: "", ram: "", disk: "", os: "",
      notes: "",
      componentsJson: JSON.stringify({
        caption: m.caption, manufacturer: m.manufacturer, serial: m.serial,
        description: m.description || "", base64: m.base64 || "",
      }),
      parentDeviceId: deviceId,  // link monitor to this computer
    });
  }

  // === Standalone printers — but ONLY real physical printers ===
  // Filter out Windows virtual printers (PDF, XPS, Fax, OneNote, etc.)
  // These have driver names like "Microsoft Print To PDF", port "PORTPROMPT:", "nul:", etc.
  const VIRTUAL_PRINTER_PATTERNS = [
    /microsoft.*print.*to.*pdf/i,
    /microsoft.*xps/i,
    /send.*to.*onenote/i,
    /onenote.*desktop/i,
    /fax/i,
    /microsoft.*print.*to.*onenote/i,
  ];
  const VIRTUAL_PRINTER_PORTS = ["PORTPROMPT:", "nul:", "NUL:", "LPT1:", "COM1:"];

  const seenPrinterNames = new Set<string>();
  for (const p of printers as any[]) {
    // Skip virtual / software-only printers
    const name = p.name || p.driver || "";
    if (VIRTUAL_PRINTER_PATTERNS.some(re => re.test(name))) {
      continue;  // Windows virtual printer — skip
    }
    const port = p.port || "";
    if (VIRTUAL_PRINTER_PORTS.includes(port)) {
      continue;  // Virtual port — skip
    }
    // If network=false and shared=false and no real port → likely virtual, skip
    if (!p.network && !p.shared && (!port || port.startsWith("nul") || port === "PORTPROMPT:")) {
      continue;
    }

    // Dedup by normalised name (case-insensitive)
    const nameKey = name.toLowerCase().trim();
    if (!nameKey || seenPrinterNames.has(nameKey)) continue;
    seenPrinterNames.add(nameKey);

    devices.push({
      deviceType: "printer",
      name: p.name || "Printer",
      manufacturer: p.manufacturer || "",
      modelName: p.name || "",
      serialNumber: p.serial || p.serial_number || "",
      ipAddress: p.port || "",
      macAddress: "",
      cpu: "",
      ram: "",
      disk: "",
      os: "",
      notes: "",
      componentsJson: JSON.stringify({
        name: p.name, driver: p.driver, port: p.port,
        network: p.network, shared: p.shared, status: p.status, resolution: p.resolution,
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

/** Map form factor label to deviceType enum values used in DB/Prisma.
 *  Falls back to "computer" for unrecognized types.
 */
function normalizeDeviceType(formFactor: string): string {
  const ff = formFactor.toLowerCase();
  if (ff === 'laptop' || ff === 'notebook') return 'laptop';
  if (ff === 'desktop' || ff === 'mini pc') return 'desktop';
  if (ff === 'aio' || ff === 'all-in-one') return 'aio';
  if (ff === 'server' || ff === 'rack mount' || ff === 'rack') return 'server';
  if (ff === 'tablet') return 'tablet';
  // Unknown chassis type — store as "computer" for now, formFactor in componentsJson has detail
  return 'computer';
}

function getFormFactor(hw: Record<string, any>): string {
  // GLPI Agent --full: chassis_type is a STRING like "Desktop", "Laptop", "Notebook", etc.
  // FusionInventory / WMI: chassis_type is a NUMBER (Win32_SystemEnclosure ChassisTypes).
  // Handle both.
  const ct = hw.chassis_type;

  if (ct != null && typeof ct === 'string') {
    const s = ct.toLowerCase().trim();
    if (s === 'desktop' || s === 'tower' || s === 'mini tower' || s === 'mini pc') return 'Desktop';
    if (s === 'laptop' || s === 'notebook' || s === 'sub notebook') return 'Laptop';
    if (s === 'all in one' || s === 'aio' || s === 'all-in-one') return 'AIO';
    if (s === 'convertible' || s === 'detachable') return 'Laptop';
    if (s === 'rack mount' || s === 'rack' || s === 'server') return 'Server';
    if (s === 'tablet') return 'Tablet';
    if (s === 'stick pc' || s === 'mini pc' || s === 'pc stick') return 'Mini PC';
    if (s === 'space-saving') return 'Desktop';
    // Fallback: return as-is with "Chassis-" prefix if unknown
    return ct;
  }

  if (ct != null && typeof ct === 'number') {
    return CHASSIS_MAP[ct] || `Chassis-${ct}`;
  }

  // GLPI Agent FusionInventory: hw.type = "laptop" / "desktop"
  if (hw.type && typeof hw.type === 'string') {
    const t = hw.type.toLowerCase();
    if (t.includes('laptop') || t.includes('notebook')) return 'Laptop';
    if (t.includes('aio') || t.includes('all-in-one')) return 'AIO';
    if (t.includes('desktop') || t.includes('tower') || t.includes('mini')) return 'Desktop';
    if (t.includes('rack')) return 'Server';
    if (t.includes('tablet')) return 'Tablet';
    return hw.type;
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
  // Map of hardware UUID / deviceId → Prisma ID, so child devices (monitors) can reference parent
  const computerPrismaIdMap = new Map<string, string>();

  // Phase 1: Create/update computers first (they are the parents)
  const computerDevices = devices.filter(d => d.deviceType === "computer" || d.deviceType === "desktop" || d.deviceType === "laptop" || d.deviceType === "server" || d.deviceType === "aio" || d.deviceType === "tablet");
  const childDevices = devices.filter(d => !computerDevices.includes(d));

  for (const d of computerDevices) {
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

    // Extract the hardware UUID (hardware.uuid) stored in notes "deviceid:..." by parser
    const deviceidMatch = d.notes?.match(/deviceid:\s*([^\s]+)/);
    const hwDeviceId = deviceidMatch?.[1] || "";

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
      // Map hardware deviceId → Prisma ID for child device linking
      if (hwDeviceId) computerPrismaIdMap.set(hwDeviceId, device.id);
      computerPrismaIdMap.set(d.serialNumber || d.modelName, device.id);
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
      if (hwDeviceId) computerPrismaIdMap.set(hwDeviceId, device.id);
      computerPrismaIdMap.set(d.serialNumber || d.modelName, device.id);
    }
  }

  // Phase 2: Create/update child devices (monitors, printers etc.)
  // Resolve parentDeviceId from parser's deviceId (hardware UUID) to actual Prisma ID
  for (const d of childDevices) {
    // Resolve parentDeviceId — parser set it to the hardware UUID string,
    // we need to find the Prisma ID that was assigned to the computer
    let resolvedParentId: string | null = null;
    if (d.parentDeviceId) {
      resolvedParentId = computerPrismaIdMap.get(d.parentDeviceId) || null;
    }

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
      const device = await prisma.customerCollectedDevice.update({
        where: { id: existing.id },
        data: {
          manufacturer: d.manufacturer || existing.manufacturer,
          modelName: d.modelName || existing.modelName,
          serialNumber: d.serialNumber || existing.serialNumber,
          componentsJson: d.componentsJson || existing.componentsJson,
          notes: d.notes ? (existing.notes ? `${existing.notes}\n${d.notes}` : d.notes) : existing.notes,
          sessionId: session.id,
          parentDeviceId: resolvedParentId || existing.parentDeviceId,
          collectedAt: new Date(),
        },
        include: {
          address: { select: { id: true, label: true, address: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true, code: true, department: true } },
        },
      });
      updated.push(device);
    } else {
      const device = await prisma.customerCollectedDevice.create({
        data: {
          customerId: session.customerId,
          addressId: session.addressId,
          deviceType: d.deviceType,
          manufacturer: d.manufacturer || null,
          modelName: d.modelName || null,
          serialNumber: d.serialNumber || null,
          componentsJson: d.componentsJson || null,
          notes: d.notes || null,
          collectedById: session.collectedById || undefined,
          sessionId: session.id,
          parentDeviceId: resolvedParentId,
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
