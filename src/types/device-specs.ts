/* ===== Device Specification Types — GLPI-Style =====
 *
 * Mỗi loại thiết bị có spec riêng, lưu trong componentsJson (JSON string).
 * Các trường first-class (manufacturer, modelName, serialNumber, ipAddress, macAddress, 
 * cpu, ram, disk, os) giữ nguyên để tương thích ngược.
 * Riêng các trường đặc thù theo loại → lưu trong componentsJson dưới key tương ứng.
 */

// ─── Computer / Server ──────────────────────────────────────────
export const COMPUTER_FORM_FACTORS = [
  "laptop", "desktop", "aio", "tablet",
  // Server subtypes
  "rack", "tower", "blade", "microserver",
] as const;
export type ComputerFormFactor = (typeof COMPUTER_FORM_FACTORS)[number];

export type ComputerSpecs = {
  formFactor?: ComputerFormFactor;
  /** iLO / iDRAC / iMMC — out-of-band management */
  managementIP?: string;
  /** Hypervisor nếu là host */
  virtualization?: string;
  /** Chiều cao rack (U) — server rack */
  rackHeight?: number;
  /** Số nguồn */
  powerSupplyCount?: number;
  /** RAID controller */
  raidController?: string;
};

// ─── Network Equipment ──────────────────────────────────────────
export const NETWORK_SUB_TYPES = [
  "switch", "router", "firewall", "ap", "load-balancer", "modem", "ont", "other",
] as const;
export type NetworkSubType = (typeof NETWORK_SUB_TYPES)[number];

export type PortInfo = {
  name: string;
  type: string;
  speed: number;
  status: "up" | "down" | "disabled";
  mac?: string;
  duplex?: "half" | "full";
  mtu?: number;
  neighbor?: string;
  neighborPort?: string;
  neighborType?: string;
  poe?: boolean;
};

export type VlanInfo = {
  id: number;
  name: string;
  ports: string[];
};

export type NetworkEquipmentSpecs = {
  subType?: NetworkSubType;
  firmware?: string;
  portCount?: number;
  managementIP?: string;
  sysDescr?: string;
  sysObjectID?: string;
  uptime?: string;
  snmpCommunity?: string;
  stackRole?: "master" | "slave" | "standalone";
  stackMembers?: { serial: string; role: string }[];
  ports?: PortInfo[];
  vlans?: VlanInfo[];
  /** Out-of-band management MAC */
  macAddress?: string;
};

// ─── Camera ─────────────────────────────────────────────────────
export const CAMERA_SUB_TYPES = ["ip", "analog", "webcam", "body-cam"] as const;
export type CameraSubType = (typeof CAMERA_SUB_TYPES)[number];

export const CAMERA_MOUNTING = ["wall", "ceiling", "pole", "desk", "in-ceiling"] as const;
export type CameraMounting = (typeof CAMERA_MOUNTING)[number];

export type CameraSpecs = {
  subType?: CameraSubType;
  firmware?: string;
  resolution?: string;
  lens?: string;
  mounting?: CameraMounting;
  poe?: boolean;
  nightVision?: boolean;
  audioSupport?: boolean;
  credentials?: string;
  streamUrl?: string;
  irDistance?: number;
  fieldOfView?: number;
};

// ─── UPS ─────────────────────────────────────────────────────────
export const UPS_SUB_TYPES = ["online", "line-interactive", "standby"] as const;
export type UPSSubType = (typeof UPS_SUB_TYPES)[number];

export type UPSpecs = {
  subType?: UPSSubType;
  capacityVA?: number;
  capacityWatts?: number;
  inputVoltage?: string;
  outputVoltage?: string;
  batteryCount?: number;
  batteryType?: string;
  managementCard?: boolean;
  managementCardModel?: string;
  managementIP?: string;
  outletCount?: number;
  /** Switch time (ms) */
  switchTimeMs?: number;
};

// ─── Phone ───────────────────────────────────────────────────────
export const PHONE_SUB_TYPES = ["desk", "mobile", "VoIP", "softphone", "DECT"] as const;
export type PhoneSubType = (typeof PHONE_SUB_TYPES)[number];

export type PhoneSpecs = {
  subType?: PhoneSubType;
  firmware?: string;
  phoneNumber?: string;
  extension?: string;
  lineCount?: number;
  features?: string[];
};

// ─── Printer (enhance) ───────────────────────────────────────────
export const PRINTER_SUB_TYPES = ["laser", "ink", "dot-matrix", "thermal", "label"] as const;
export type PrinterSubType = (typeof PRINTER_SUB_TYPES)[number];

export type TonerInfo = {
  color: string;
  level: number;
  model?: string;
};

export type PrinterSpecs = {
  subType?: PrinterSubType;
  color?: boolean;
  duplex?: boolean;
  resolution?: string;
  pagesTotal?: number;
  pagesColor?: number;
  tonerLevels?: TonerInfo[];
  /** Support paper sizes */
  paperSizes?: string[];
};

// ─── Monitor (enhance) ──────────────────────────────────────────
export const PANEL_TYPES = ["IPS", "TN", "VA", "OLED", "Mini-LED", "CRT"] as const;
export type PanelType = (typeof PANEL_TYPES)[number];

export const CONNECTION_TYPES = ["HDMI", "VGA", "DP", "USB-C", "DVI", "Thunderbolt", "Composite"] as const;
export type ConnectionType = (typeof CONNECTION_TYPES)[number];

export type MonitorSpecs = {
  sizeInch?: number;
  resolution?: string;
  panelType?: PanelType;
  refreshRate?: number;
  connectionType?: ConnectionType;
  curved?: boolean;
  hdr?: boolean;
  touchScreen?: boolean;
};

// ─── Peripheral ──────────────────────────────────────────────────
export const PERIPHERAL_TYPES = [
  "keyboard", "mouse", "webcam", "speaker", "headset", "dock", "usb-hub",
  "card-reader", "barcode-scanner", "biometric", "other",
] as const;
export type PeripheralType = (typeof PERIPHERAL_TYPES)[number];

export type PeripheralSpecs = {
  subType?: PeripheralType;
  connection?: "USB" | "BT" | "WiFi" | "PS2" | "other";
};

// ─── Other ───────────────────────────────────────────────────────
export type OtherSpecs = Record<string, string>;

// ─── Discriminated Union ────────────────────────────────────────
export type DeviceComponentsJson = {
  /** Discriminator — trùng với deviceType của CustomerCollectedDevice */
  type: string;

  /** Specs riêng theo loại */
  computerSpecs?: ComputerSpecs;
  netSpecs?: NetworkEquipmentSpecs;
  cameraSpecs?: CameraSpecs;
  upsSpecs?: UPSpecs;
  phoneSpecs?: PhoneSpecs;
  printerSpecs?: PrinterSpecs;
  monitorSpecs?: MonitorSpecs;
  peripheralSpecs?: PeripheralSpecs;
  otherSpecs?: OtherSpecs;

  /** Dữ liệu gốc từ GLPI Agent / Network Import */
  rawAgentData?: Record<string, unknown>;
};

/* ===== Helper: trích xuất DeviceComponentsJson từ componentsJson string ===== */
export function parseComponentsJson(raw: string | null | undefined): DeviceComponentsJson | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // Nếu là object có type → return as-is
    if (parsed && typeof parsed === "object" && parsed.type) {
      return parsed as DeviceComponentsJson;
    }
    // Legacy: componentsJson không có type discriminator → wrap lại
    return { type: "legacy", rawAgentData: parsed };
  } catch {
    return null;
  }
}

/* ===== Helper: gán giá trị mặc định cho form từ componentsJson ===== */
export function extractSpecs<T>(raw: string | null | undefined, extractor: (cj: DeviceComponentsJson) => T | null): T | null {
  const cj = parseComponentsJson(raw);
  if (!cj) return null;
  return extractor(cj);
}
