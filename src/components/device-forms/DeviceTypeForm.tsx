"use client";

/* ===== DeviceTypeForm — type-specific fields panel =====
 *
 * Render phần fields riêng theo từng loại thiết bị (GLPI-style).
 * Common fields (manufacturer, model, serial, IP, MAC, location, assignee)
 * do component cha xử lý — component này chỉ render phần đặc thù.
 *
 * Props:
 *   deviceType — string key
 *   specs      — object chứa type-specific values (có thể undefined)
 *   onChange   — (specs) => void, gọi khi có thay đổi
 */

import type {
  NetworkEquipmentSpecs, CameraSpecs, UPSpecs, PhoneSpecs,
  PrinterSpecs, MonitorSpecs, PeripheralSpecs, ComputerSpecs,
  NetworkSubType, CameraSubType, CameraMounting,
  UPSSubType, PhoneSubType, PrinterSubType,
  PanelType, ConnectionType, PeripheralType, ComputerFormFactor,
} from "@/types/device-specs";

/* ─── Shared UI ─────────────────────────────────────────────── */
const inputCls = "w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400";
const selectCls = "w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400 bg-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] text-gray-500">{label}</label>
      {children}
    </div>
  );
}

/* ─── Generic string field helper ──────────────────────────── */
function StrField({ label, value, onChange, placeholder }: {
  label: string; value?: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <Field label={label}>
      <input value={value ?? ""} onChange={e => onChange(e.target.value)}
        className={inputCls} placeholder={placeholder} />
    </Field>
  );
}

function NumField({ label, value, onChange, min }: {
  label: string; value?: number; onChange: (v: number) => void; min?: number;
}) {
  return (
    <Field label={label}>
      <input type="number" value={value ?? ""} onChange={e => onChange(Number(e.target.value) || 0)}
        className={inputCls} min={min} />
    </Field>
  );
}

function CheckField({ label, value, onChange }: {
  label: string; value?: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
      <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)}
        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
      {label}
    </label>
  );
}

function SelectField<T extends string>({ label, value, onChange, options }: {
  label: string; value?: T; onChange: (v: T) => void; options: readonly T[];
}) {
  return (
    <Field label={label}>
      <select value={value ?? ""} onChange={e => onChange(e.target.value as T)} className={selectCls}>
        <option value="">— Chọn —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );
}

/* ─── Port / VLAN arrays ────────────────────────────────────── */
function PortEditor({ ports, onChange }: {
  ports?: { name: string; speed: number; status: string; mac?: string; neighbor?: string }[];
  onChange: (ports: any[]) => void;
}) {
  const list = ports ?? [];
  const add = () => onChange([...list, { name: "", speed: 1000, status: "up" }]);
  const upd = (i: number, k: string, v: any) => {
    const next = [...list];
    next[i] = { ...next[i], [k]: v };
    onChange(next);
  };
  const del = (i: number) => onChange(list.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-500 font-medium">Cổng (Ports)</span>
        <button type="button" onClick={add} className="text-[11px] text-blue-600 hover:text-blue-800">+ Thêm cổng</button>
      </div>
      {list.map((p, i) => (
        <div key={i} className="flex gap-1 items-center bg-gray-50 rounded-lg p-1.5">
          <input value={p.name} onChange={e => upd(i, "name", e.target.value)}
            className="w-20 h-7 px-1.5 rounded border border-gray-200 text-[11px]" placeholder="Gi1/0/1" />
          <select value={String(p.speed)} onChange={e => upd(i, "speed", Number(e.target.value))}
            className="h-7 px-1 rounded border border-gray-200 text-[11px] bg-white">
            <option value="10">10M</option>
            <option value="100">100M</option>
            <option value="1000">1G</option>
            <option value="10000">10G</option>
            <option value="40000">40G</option>
            <option value="100000">100G</option>
          </select>
          <select value={p.status} onChange={e => upd(i, "status", e.target.value)}
            className="h-7 px-1 rounded border border-gray-200 text-[11px] bg-white">
            <option value="up">Up</option>
            <option value="down">Down</option>
            <option value="disabled">Disabled</option>
          </select>
          <input value={p.mac ?? ""} onChange={e => upd(i, "mac", e.target.value)}
            className="w-24 h-7 px-1.5 rounded border border-gray-200 text-[11px] font-mono" placeholder="MAC" />
          <input value={p.neighbor ?? ""} onChange={e => upd(i, "neighbor", e.target.value)}
            className="w-24 h-7 px-1.5 rounded border border-gray-200 text-[11px]" placeholder="Neighbor" />
          <button type="button" onClick={() => del(i)} className="text-red-400 hover:text-red-600 text-[13px] px-1">✕</button>
        </div>
      ))}
    </div>
  );
}

/* ─── ===== COMPUTER / SERVER FORM ===== ────────────────────── */
type ComputerFields = { cpu?: string; ram?: string; disk?: string; os?: string };
type ServerExtra = ComputerSpecs;

export function ComputerSection({ fields, extra, onFieldChange, onExtraChange }: {
  fields: ComputerFields;
  extra?: ServerExtra;
  onFieldChange: (k: string, v: string) => void;
  onExtraChange: (v: ServerExtra) => void;
}) {
  const ext = extra ?? {};
  const set = (k: keyof ServerExtra, v: any) => onExtraChange({ ...ext, [k]: v });
  return (
    <div className="bg-blue-50/50 rounded-lg p-2.5 space-y-2">
      <p className="text-[10px] font-medium text-blue-700">Cấu hình máy</p>
      <div className="grid grid-cols-2 gap-2">
        <StrField label="CPU" value={fields.cpu} onChange={v => onFieldChange("cpu", v)} />
        <StrField label="RAM" value={fields.ram} onChange={v => onFieldChange("ram", v)} />
        <StrField label="Ổ đĩa" value={fields.disk} onChange={v => onFieldChange("disk", v)} />
        <StrField label="Hệ điều hành" value={fields.os} onChange={v => onFieldChange("os", v)} />
      </div>
      <div className="border-t border-blue-100 pt-2">
        <p className="text-[10px] font-medium text-blue-600 mb-1.5">Quản lý từ xa</p>
        <div className="grid grid-cols-2 gap-2">
          <StrField label="Management IP (iLO/iDRAC)" value={ext.managementIP} onChange={v => set("managementIP", v)} />
          <StrField label="Hypervisor" value={ext.virtualization} onChange={v => set("virtualization", v)} placeholder="VMware ESXi, Hyper-V..." />
        </div>
      </div>
      <div className="border-t border-blue-100 pt-2">
        <p className="text-[10px] font-medium text-blue-600 mb-1.5">Server rack</p>
        <div className="grid grid-cols-3 gap-2">
          <NumField label="Chiều cao (U)" value={ext.rackHeight} onChange={v => set("rackHeight", v)} />
          <NumField label="Số nguồn" value={ext.powerSupplyCount} onChange={v => set("powerSupplyCount", v)} />
          <StrField label="RAID Controller" value={ext.raidController} onChange={v => set("raidController", v)} />
        </div>
      </div>
    </div>
  );
}

/* ─── ===== NETWORK EQUIPMENT FORM ===== ────────────────────── */
export function NetworkSection({ specs, onChange }: {
  specs?: NetworkEquipmentSpecs;
  onChange: (v: NetworkEquipmentSpecs) => void;
}) {
  const s = specs ?? {};
  const set = (k: keyof NetworkEquipmentSpecs, v: any) => onChange({ ...s, [k]: v });
  const NET_SUB_TYPES: NetworkSubType[] = ["switch", "router", "firewall", "ap", "load-balancer", "modem", "ont", "other"];
  return (
    <div className="bg-cyan-50/50 rounded-lg p-2.5 space-y-2">
      <p className="text-[10px] font-medium text-cyan-700">Thông số thiết bị mạng</p>
      <div className="grid grid-cols-3 gap-2">
        <SelectField label="Loại" value={s.subType} onChange={v => set("subType", v)} options={NET_SUB_TYPES} />
        <StrField label="Firmware" value={s.firmware} onChange={v => set("firmware", v)} />
        <NumField label="Số cổng" value={s.portCount} onChange={v => set("portCount", v)} min={0} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StrField label="Management IP" value={s.managementIP} onChange={v => set("managementIP", v)} />
        <StrField label="SNMP Community" value={s.snmpCommunity} onChange={v => set("snmpCommunity", v)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StrField label="sysDescr" value={s.sysDescr} onChange={v => set("sysDescr", v)} placeholder="Cisco IOS Software..." />
        <StrField label="Uptime" value={s.uptime} onChange={v => set("uptime", v)} placeholder="180 days" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <SelectField label="Stack Role" value={s.stackRole} onChange={v => set("stackRole", v)} options={["master", "slave", "standalone"] as const} />
        <StrField label="sysObjectID" value={s.sysObjectID} onChange={v => set("sysObjectID", v)} placeholder=".1.3.6.1.4.1.9.1..." />
      </div>
      <PortEditor ports={s.ports} onChange={v => set("ports", v)} />
    </div>
  );
}

/* ─── ===== CAMERA FORM ===== ───────────────────────────────── */
export function CameraSection({ specs, onChange }: {
  specs?: CameraSpecs;
  onChange: (v: CameraSpecs) => void;
}) {
  const s = specs ?? {};
  const set = (k: keyof CameraSpecs, v: any) => onChange({ ...s, [k]: v });
  const CAM_SUB_TYPES: CameraSubType[] = ["ip", "analog", "webcam", "body-cam"];
  const CAM_MOUNTING: CameraMounting[] = ["wall", "ceiling", "pole", "desk", "in-ceiling"];
  return (
    <div className="bg-purple-50/50 rounded-lg p-2.5 space-y-2">
      <p className="text-[10px] font-medium text-purple-700">Thông số camera</p>
      <div className="grid grid-cols-3 gap-2">
        <SelectField label="Loại" value={s.subType} onChange={v => set("subType", v)} options={CAM_SUB_TYPES} />
        <StrField label="Firmware" value={s.firmware} onChange={v => set("firmware", v)} />
        <StrField label="Độ phân giải" value={s.resolution} onChange={v => set("resolution", v)} placeholder="1920x1080" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <StrField label="Ống kính" value={s.lens} onChange={v => set("lens", v)} placeholder="2.8mm" />
        <SelectField label="Gắn" value={s.mounting} onChange={v => set("mounting", v)} options={CAM_MOUNTING} />
        <NumField label="IR (m)" value={s.irDistance} onChange={v => set("irDistance", v)} min={0} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StrField label="Stream URL" value={s.streamUrl} onChange={v => set("streamUrl", v)} placeholder="rtsp://..." />
        <StrField label="Thông tin đăng nhập" value={s.credentials} onChange={v => set("credentials", v)} placeholder="admin / ***" />
      </div>
      <div className="flex gap-4">
        <CheckField label="PoE" value={s.poe} onChange={v => set("poe", v)} />
        <CheckField label="Hồng ngoại" value={s.nightVision} onChange={v => set("nightVision", v)} />
        <CheckField label="Có audio" value={s.audioSupport} onChange={v => set("audioSupport", v)} />
      </div>
    </div>
  );
}

/* ─── ===== UPS FORM ===== ──────────────────────────────────── */
export function UPSSection({ specs, onChange }: {
  specs?: UPSpecs;
  onChange: (v: UPSpecs) => void;
}) {
  const s = specs ?? {};
  const set = (k: keyof UPSpecs, v: any) => onChange({ ...s, [k]: v });
  const UPS_SUB_TYPES: UPSSubType[] = ["online", "line-interactive", "standby"];
  return (
    <div className="bg-amber-50/50 rounded-lg p-2.5 space-y-2">
      <p className="text-[10px] font-medium text-amber-700">Thông số UPS</p>
      <div className="grid grid-cols-3 gap-2">
        <SelectField label="Loại" value={s.subType} onChange={v => set("subType", v)} options={UPS_SUB_TYPES} />
        <NumField label="VA" value={s.capacityVA} onChange={v => set("capacityVA", v)} min={0} />
        <NumField label="Watt" value={s.capacityWatts} onChange={v => set("capacityWatts", v)} min={0} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <StrField label="Điện áp vào" value={s.inputVoltage} onChange={v => set("inputVoltage", v)} placeholder="220V" />
        <StrField label="Điện áp ra" value={s.outputVoltage} onChange={v => set("outputVoltage", v)} placeholder="220V" />
        <NumField label="Số ngăn ắc quy" value={s.batteryCount} onChange={v => set("batteryCount", v)} min={0} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StrField label="Loại ắc quy" value={s.batteryType} onChange={v => set("batteryType", v)} placeholder="12V 7Ah" />
        <NumField label="Số ổ cắm" value={s.outletCount} onChange={v => set("outletCount", v)} min={0} />
      </div>
      <div className="border-t border-amber-100 pt-2">
        <p className="text-[10px] font-medium text-amber-600 mb-1.5">Quản lý</p>
        <div className="grid grid-cols-3 gap-2">
          <StrField label="Card quản lý" value={s.managementCardModel} onChange={v => set("managementCardModel", v)} placeholder="AP9630" />
          <StrField label="Management IP" value={s.managementIP} onChange={v => set("managementIP", v)} />
          <CheckField label="Có card" value={s.managementCard} onChange={v => set("managementCard", v)} />
        </div>
      </div>
    </div>
  );
}

/* ─── ===== PHONE FORM ===== ────────────────────────────────── */
export function PhoneSection({ specs, onChange }: {
  specs?: PhoneSpecs;
  onChange: (v: PhoneSpecs) => void;
}) {
  const s = specs ?? {};
  const set = (k: keyof PhoneSpecs, v: any) => onChange({ ...s, [k]: v });
  const PH_SUB_TYPES: PhoneSubType[] = ["desk", "mobile", "VoIP", "softphone", "DECT"];
  return (
    <div className="bg-pink-50/50 rounded-lg p-2.5 space-y-2">
      <p className="text-[10px] font-medium text-pink-700">Thông số điện thoại</p>
      <div className="grid grid-cols-3 gap-2">
        <SelectField label="Loại" value={s.subType} onChange={v => set("subType", v)} options={PH_SUB_TYPES} />
        <StrField label="Firmware" value={s.firmware} onChange={v => set("firmware", v)} />
        <NumField label="Số line" value={s.lineCount} onChange={v => set("lineCount", v)} min={1} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StrField label="Số điện thoại" value={s.phoneNumber} onChange={v => set("phoneNumber", v)} placeholder="+84 28 3911 2345" />
        <StrField label="Số máy lẻ (Extension)" value={s.extension} onChange={v => set("extension", v)} placeholder="101" />
      </div>
      <StrField label="Tính năng" value={s.features?.join(", ")} onChange={v => set("features", v.split(",").map(x => x.trim()).filter(Boolean))} placeholder="speakerphone, headset, conference" />
    </div>
  );
}

/* ─── ===== PRINTER FORM (enhanced) ===== ──────────────────── */
export function PrinterSection({ specs, onChange }: {
  specs?: PrinterSpecs;
  onChange: (v: PrinterSpecs) => void;
}) {
  const s = specs ?? {};
  const set = (k: keyof PrinterSpecs, v: any) => onChange({ ...s, [k]: v });
  const PR_SUB_TYPES: PrinterSubType[] = ["laser", "ink", "dot-matrix", "thermal", "label"];
  return (
    <div className="bg-orange-50/50 rounded-lg p-2.5 space-y-2">
      <p className="text-[10px] font-medium text-orange-700">Thông số máy in</p>
      <div className="grid grid-cols-3 gap-2">
        <SelectField label="Công nghệ" value={s.subType} onChange={v => set("subType", v)} options={PR_SUB_TYPES} />
        <StrField label="Độ phân giải" value={s.resolution} onChange={v => set("resolution", v)} placeholder="1200x1200" />
        <StrField label="Khổ giấy" value={s.paperSizes?.join(", ")} onChange={v => set("paperSizes", v.split(",").map(x => x.trim()).filter(Boolean))} placeholder="A4, A3" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumField label="Tổng số trang" value={s.pagesTotal} onChange={v => set("pagesTotal", v)} min={0} />
        <NumField label="Trang màu" value={s.pagesColor} onChange={v => set("pagesColor", v)} min={0} />
      </div>
      <div className="flex gap-4">
        <CheckField label="Màu" value={s.color} onChange={v => set("color", v)} />
        <CheckField label="In 2 mặt" value={s.duplex} onChange={v => set("duplex", v)} />
      </div>
      {s.tonerLevels && s.tonerLevels.length > 0 && (
        <div className="border-t border-orange-100 pt-2">
          <p className="text-[10px] font-medium text-orange-600 mb-1.5">Toner / Mực</p>
          {s.tonerLevels.map((t, i) => (
            <div key={i} className="flex gap-2 items-center mb-1">
              <span className="text-[11px] text-gray-600 w-16">{t.color}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${Math.min(100, t.level)}%` }} />
              </div>
              <span className="text-[11px] text-gray-500 w-8">{t.level}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── ===== MONITOR FORM (enhanced) ===== ──────────────────── */
export function MonitorSection({ specs, onChange }: {
  specs?: MonitorSpecs;
  onChange: (v: MonitorSpecs) => void;
}) {
  const s = specs ?? {};
  const set = (k: keyof MonitorSpecs, v: any) => onChange({ ...s, [k]: v });
  const PANEL_TYPES: PanelType[] = ["IPS", "TN", "VA", "OLED", "Mini-LED", "CRT"];
  const CONN_TYPES: ConnectionType[] = ["HDMI", "VGA", "DP", "USB-C", "DVI", "Thunderbolt", "Composite"];
  return (
    <div className="bg-green-50/50 rounded-lg p-2.5 space-y-2">
      <p className="text-[10px] font-medium text-green-700">Thông số màn hình</p>
      <div className="grid grid-cols-3 gap-2">
        <NumField label="Kích cỡ (inch)" value={s.sizeInch} onChange={v => set("sizeInch", v)} min={0} />
        <StrField label="Độ phân giải" value={s.resolution} onChange={v => set("resolution", v)} placeholder="1920x1080" />
        <SelectField label="Panel" value={s.panelType} onChange={v => set("panelType", v)} options={PANEL_TYPES} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <NumField label="Tần số (Hz)" value={s.refreshRate} onChange={v => set("refreshRate", v)} min={0} />
        <SelectField label="Cổng kết nối" value={s.connectionType} onChange={v => set("connectionType", v)} options={CONN_TYPES} />
      </div>
      <div className="flex gap-4">
        <CheckField label="Cong" value={s.curved} onChange={v => set("curved", v)} />
        <CheckField label="HDR" value={s.hdr} onChange={v => set("hdr", v)} />
        <CheckField label="Cảm ứng" value={s.touchScreen} onChange={v => set("touchScreen", v)} />
      </div>
    </div>
  );
}

/* ─── ===== PERIPHERAL FORM ===== ──────────────────────────── */
export function PeripheralSection({ specs, onChange }: {
  specs?: PeripheralSpecs;
  onChange: (v: PeripheralSpecs) => void;
}) {
  const s = specs ?? {};
  const set = (k: keyof PeripheralSpecs, v: any) => onChange({ ...s, [k]: v });
  const PER_TYPES: PeripheralType[] = ["keyboard", "mouse", "webcam", "speaker", "headset", "dock", "usb-hub", "card-reader", "barcode-scanner", "biometric", "other"];
  return (
    <div className="bg-gray-50/50 rounded-lg p-2.5 space-y-2">
      <p className="text-[10px] font-medium text-gray-700">Thông số ngoại vi</p>
      <div className="grid grid-cols-2 gap-2">
        <SelectField label="Loại" value={s.subType} onChange={v => set("subType", v)} options={PER_TYPES} />
        <Field label="Kết nối">
          <select value={s.connection ?? ""} onChange={e => set("connection", e.target.value)} className={selectCls}>
            <option value="">— Chọn —</option>
            <option value="USB">USB</option>
            <option value="BT">Bluetooth</option>
            <option value="WiFi">WiFi</option>
            <option value="PS2">PS/2</option>
            <option value="other">Khác</option>
          </select>
        </Field>
      </div>
    </div>
  );
}

/* ─── ===== MAIN SWITCHER ===== ────────────────────────────────
 * Render phần type-specific specs dựa vào deviceType.
 * specs: object chứa các giá trị đặc thù.
 * onChange: callback gửi object specs mới.
 */
export default function DeviceTypeForm({ deviceType, specs, onChange }: {
  deviceType: string;
  specs: Record<string, any>;
  onChange: (updatedSpecs: Record<string, any>) => void;
}) {
  switch (deviceType) {
    case "computer":
    case "desktop":
    case "laptop":
    case "server":
      return <ComputerSection
        fields={{ cpu: specs.cpu, ram: specs.ram, disk: specs.disk, os: specs.os }}
        extra={specs.computerSpecs}
        onFieldChange={(k, v) => onChange({ ...specs, [k]: v })}
        onExtraChange={v => onChange({ ...specs, computerSpecs: v })}
      />;

    case "network":
      return <NetworkSection
        specs={specs.netSpecs}
        onChange={v => onChange({ ...specs, netSpecs: v })}
      />;

    case "camera":
      return <CameraSection
        specs={specs.cameraSpecs}
        onChange={v => onChange({ ...specs, cameraSpecs: v })}
      />;

    case "ups":
      return <UPSSection
        specs={specs.upsSpecs}
        onChange={v => onChange({ ...specs, upsSpecs: v })}
      />;

    case "phone":
      return <PhoneSection
        specs={specs.phoneSpecs}
        onChange={v => onChange({ ...specs, phoneSpecs: v })}
      />;

    case "printer":
      return <PrinterSection
        specs={specs.printerSpecs}
        onChange={v => onChange({ ...specs, printerSpecs: v })}
      />;

    case "monitor":
      return <MonitorSection
        specs={specs.monitorSpecs}
        onChange={v => onChange({ ...specs, monitorSpecs: v })}
      />;

    case "peripheral":
      return <PeripheralSection
        specs={specs.peripheralSpecs}
        onChange={v => onChange({ ...specs, peripheralSpecs: v })}
      />;

    default:
      return null;
  }
}
