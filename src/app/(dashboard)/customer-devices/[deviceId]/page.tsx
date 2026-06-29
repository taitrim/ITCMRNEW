"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit3, Trash2, X, HardDrive, Monitor, Building2, User, Calendar, Tag, Cpu, HardDrive as HDD, Wifi, Globe, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const DEVICE_ICONS: Record<string, string> = {
  computer: "💻", monitor: "🖥️", printer: "🖨️", network: "🌐", phone: "📱",
  peripheral: "🎮", server: "🖥️", other: "📦",
};
const DEVICE_LABELS: Record<string, string> = {
  computer: "Máy tính", monitor: "Màn hình", printer: "Máy in", network: "Mạng",
  phone: "Điện thoại", peripheral: "Ngoại vi", server: "Máy chủ", other: "Khác",
};
const STATUS_LABELS: Record<string, string> = {
  active: "Đang dùng", broken: "Hỏng", stored: "Lưu kho", retired: "Thanh lý",
};
const CONDITION_LABELS: Record<string, string> = {
  good: "Tốt", fair: "Tạm được", broken: "Hỏng", damaged: "Hư hại", other: "Khác",
};
const CONDITION_COLORS: Record<string, string> = {
  good: "bg-green-100 text-green-700",
  fair: "bg-amber-100 text-amber-700",
  broken: "bg-red-100 text-red-700",
  damaged: "bg-orange-100 text-orange-700",
  other: "bg-gray-100 text-gray-600",
};
const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  broken: "bg-red-100 text-red-700",
  stored: "bg-amber-100 text-amber-700",
  retired: "bg-gray-100 text-gray-600",
};
const DEVICE_TYPES = Object.keys(DEVICE_LABELS);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] text-gray-500">{label}</label>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-50">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-gray-800">{value || "-"}</span>
    </div>
  );
}

/* ===== Type-specific specs grid — GLPI-style ===== */
function DeviceSpecs({ device }: { device: any }) {
  const t = device.deviceType;

  if (t === "computer") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-0.5">
        <InfoRow label="Nhãn hiệu" value={device.manufacturer} />
        <InfoRow label="Model" value={device.modelName} />
        <InfoRow label="Số serial" value={device.serialNumber} />
        <InfoRow label="Mã tài sản" value={device.assetTag} />
        <InfoRow label="CPU" value={device.cpu} />
        <InfoRow label="RAM" value={device.ram} />
        <InfoRow label="Ổ đĩa" value={device.disk} />
        <InfoRow label="Hệ điều hành" value={device.os} />
        <InfoRow label="IP" value={device.ipAddress} />
        <InfoRow label="MAC" value={device.macAddress} />
        <InfoRow label="Vị trí đặt" value={device.locationDetail} />
        <InfoRow label="Số lượng" value={device.quantity != null ? `${device.quantity}` : "-"} />
      </div>
    );
  }

  if (t === "monitor") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-0.5">
        <InfoRow label="Nhãn hiệu" value={device.manufacturer} />
        <InfoRow label="Model" value={device.modelName} />
        <InfoRow label="Số serial" value={device.serialNumber} />
        <InfoRow label="Mã tài sản" value={device.assetTag} />
        <InfoRow label="Kích cỡ" value={device.cpu || "(chưa có)"} />
        <InfoRow label="Độ phân giải" value={device.ram || "(chưa có)"} />
        <InfoRow label="Loại màn hình" value={device.disk || "(chưa có)"} />
        <InfoRow label="Vị trí đặt" value={device.locationDetail} />
        <InfoRow label="Số lượng" value={device.quantity != null ? `${device.quantity}` : "-"} />
      </div>
    );
  }

  if (t === "printer") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-0.5">
        <InfoRow label="Nhãn hiệu" value={device.manufacturer} />
        <InfoRow label="Model" value={device.modelName} />
        <InfoRow label="Số serial" value={device.serialNumber} />
        <InfoRow label="Mã tài sản" value={device.assetTag} />
        <InfoRow label="Loại máy in" value={device.cpu || "(chưa có)"} />
        <InfoRow label="Địa chỉ IP" value={device.ipAddress} />
        <InfoRow label="MAC" value={device.macAddress} />
        <InfoRow label="Vị trí đặt" value={device.locationDetail} />
        <InfoRow label="Số lượng" value={device.quantity != null ? `${device.quantity}` : "-"} />
      </div>
    );
  }

  if (t === "network") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-0.5">
        <InfoRow label="Nhãn hiệu" value={device.manufacturer} />
        <InfoRow label="Model" value={device.modelName} />
        <InfoRow label="Số serial" value={device.serialNumber} />
        <InfoRow label="Mã tài sản" value={device.assetTag} />
        <InfoRow label="Loại" value={device.cpu || "(chưa có)"} />
        <InfoRow label="Firmware" value={device.ram || "(chưa có)"} />
        <InfoRow label="Số cổng" value={device.disk || "(chưa có)"} />
        <InfoRow label="Địa chỉ IP" value={device.ipAddress} />
        <InfoRow label="MAC" value={device.macAddress} />
        <InfoRow label="Vị trí đặt" value={device.locationDetail} />
        <InfoRow label="Số lượng" value={device.quantity != null ? `${device.quantity}` : "-"} />
      </div>
    );
  }

  if (t === "phone") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-0.5">
        <InfoRow label="Nhãn hiệu" value={device.manufacturer} />
        <InfoRow label="Model" value={device.modelName} />
        <InfoRow label="Số serial" value={device.serialNumber} />
        <InfoRow label="Mã tài sản" value={device.assetTag} />
        <InfoRow label="Firmware" value={device.cpu || "(chưa có)"} />
        <InfoRow label="Số đường dây" value={device.ram || "(chưa có)"} />
        <InfoRow label="IP" value={device.ipAddress} />
        <InfoRow label="MAC" value={device.macAddress} />
        <InfoRow label="Vị trí đặt" value={device.locationDetail} />
        <InfoRow label="Số lượng" value={device.quantity != null ? `${device.quantity}` : "-"} />
      </div>
    );
  }

  // Peripheral, server, other
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-0.5">
      <InfoRow label="Nhãn hiệu" value={device.manufacturer} />
      <InfoRow label="Model" value={device.modelName} />
      <InfoRow label="Số serial" value={device.serialNumber} />
      <InfoRow label="Mã tài sản" value={device.assetTag} />
      <InfoRow label="IP" value={device.ipAddress} />
      <InfoRow label="MAC" value={device.macAddress} />
      <InfoRow label="Vị trí đặt" value={device.locationDetail} />
      <InfoRow label="Số lượng" value={device.quantity != null ? `${device.quantity}` : "-"} />
    </div>
  );
}

/* ===== Type-specific detail panels — GLPI-style ===== */
function MonitorDetail({ components }: { components: any }) {
  const mon = components.monitors?.[0] || components;
  return (
    <div className="bg-white rounded-xl p-4 shadow-xs border border-border/50">
      <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5 mb-3">🖥️ Chi tiết màn hình</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
        <div><span className="text-gray-400">Kích cỡ:</span> <span className="text-gray-700 ml-1">{mon.size ? `${mon.size}"` : '?'}</span></div>
        <div><span className="text-gray-400">Độ phân giải:</span> <span className="text-gray-700 ml-1">{mon.resolution || '?'}</span></div>
        <div><span className="text-gray-400">Loại:</span> <span className="text-gray-700 ml-1">{mon.display_type || mon.type || '?'}</span></div>
        <div><span className="text-gray-400">Serial:</span> <span className="text-gray-700 ml-1">{mon.serial || mon.serialNumber || '?'}</span></div>
        <div><span className="text-gray-400">Hãng:</span> <span className="text-gray-700 ml-1">{mon.manufacturer || '?'}</span></div>
        <div><span className="text-gray-400">Model:</span> <span className="text-gray-700 ml-1">{mon.name || mon.model || '?'}</span></div>
      </div>
    </div>
  );
}

function PrinterDetail({ components }: { components: any }) {
  const p = components.printer || {};
  return (
    <div className="bg-white rounded-xl p-4 shadow-xs border border-border/50">
      <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5 mb-3">🖨️ Chi tiết máy in</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
        <div><span className="text-gray-400">Loại:</span> <span className="text-gray-700 ml-1">{p.printer_type || p.type || '?'}</span></div>
        <div><span className="text-gray-400">Mực/toner:</span> <span className="text-gray-700 ml-1">{p.cartridges ? `${p.cartridges.length} hộp` : '?'}</span></div>
        <div><span className="text-gray-400">Khổ giấy:</span> <span className="text-gray-700 ml-1">{p.paper_size || '?'}</span></div>
        <div><span className="text-gray-400">Kết nối:</span> <span className="text-gray-700 ml-1">{p.connectivity || (components.network?.[0]?.type || '?')}</span></div>
      </div>
      {p.cartridges?.length > 0 && (
        <div className="mt-2 space-y-1">
          <span className="text-[10px] text-gray-400 font-medium">Hộp mực:</span>
          {p.cartridges.map((c: any, i: number) => (
            <div key={i} className="flex justify-between text-[11px] py-1 px-2 bg-gray-50 rounded-lg">
              <span className="text-gray-700">{c.name || c.color || `Hộp ${i+1}`}</span>
              <span className="text-gray-500">{c.type || ''}{c.level ? ` (${c.level}%)` : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NetworkDetail({ components }: { components: any }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-xs border border-border/50">
      <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5 mb-3">🌐 Chi tiết thiết bị mạng</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
        <div><span className="text-gray-400">Loại thiết bị:</span> <span className="text-gray-700 ml-1">{components.type || '?'}</span></div>
        <div><span className="text-gray-400">Firmware:</span> <span className="text-gray-700 ml-1">{components.firmware || '?'}</span></div>
        <div><span className="text-gray-400">Phiên bản:</span> <span className="text-gray-700 ml-1">{components.version || '?'}</span></div>
        <div><span className="text-gray-400">Số cổng:</span> <span className="text-gray-700 ml-1">{components.port_count != null ? `${components.port_count}` : '?'}</span></div>
      </div>
      {components.ports?.length > 0 && (
        <div className="mt-2 space-y-1">
          <span className="text-[10px] text-gray-400 font-medium">Cổng:</span>
          {components.ports.map((p: any, i: number) => (
            <div key={i} className="flex justify-between text-[11px] py-1 px-2 bg-gray-50 rounded-lg">
              <span className="text-gray-700">{p.name || `Cổng ${i+1}`}</span>
              <span className="text-gray-500">{p.type || ''}{p.speed ? ` - ${p.speed}` : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PhoneDetail({ components }: { components: any }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-xs border border-border/50">
      <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5 mb-3">📱 Chi tiết điện thoại</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
        <div><span className="text-gray-400">Firmware:</span> <span className="text-gray-700 ml-1">{components.firmware || '?'}</span></div>
        <div><span className="text-gray-400">Số điện thoại:</span> <span className="text-gray-700 ml-1">{components.phone_number || components.line || '?'}</span></div>
        <div><span className="text-gray-400">Loại:</span> <span className="text-gray-700 ml-1">{components.phone_type || components.type || 'IP'}</span></div>
        <div><span className="text-gray-400">MAC:</span> <span className="text-gray-700 ml-1">{components.mac || '?'}</span></div>
      </div>
    </div>
  );
}

function formatStorage(bytes: number): string {
  if (!bytes) return '?';
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${bytes} B`;
}

/* Convert SMBIOSMemoryType number to DDR label */
function ramTypeLabel(type: number | string | null | undefined): string {
  if (!type) return '';
  if (typeof type === 'string') return type;
  const map: Record<number, string> = {
    20: 'DDR', 21: 'DDR2', 24: 'DDR3', 26: 'DDR4', 34: 'DDR5',
    0: 'RAM', 1: 'Other', 2: 'DRAM', 3: 'EDO', 4: 'SDRAM',
    5: 'SRAM', 12: 'DDR-FB', 13: 'DDR2-FB',
  };
  return map[type] || `Type-${type}`;
}

function ComponentsSection({ components }: { components: any }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
        <Cpu size={13} /> Linh kiện chi tiết
      </h3>
      {components.memory?.length > 0 && (
        <div className="bg-white rounded-xl border border-border/50 p-3">
          <h4 className="text-[11px] font-semibold text-gray-700 mb-2">🧠 RAM{components.totalSlots ? ` (${components.memory.length}/${components.totalSlots} slot)` : ` (${components.memory.length} thanh)`}</h4>
          <div className="space-y-1.5">
            {components.memory.map((m: any, i: number) => {
              const ramType = ramTypeLabel(m.type);
              return (
                <div key={i} className="flex items-center justify-between text-[11px] py-1.5 px-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    <span className="text-gray-700 font-medium truncate">{m.slot || `Slot ${i+1}`}</span>
                  </div>
                  <span className="text-gray-500 flex-shrink-0 ml-2 text-right">
                    {m.capacity ? formatStorage(m.capacity) : '?'}
                    {ramType && <span className="font-semibold text-gray-600"> {ramType}</span>}
                    {m.speed ? ` @ ${m.speed}MHz` : ''}
                    {m.manufacturer ? ` · ${m.manufacturer}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Summary bar */}
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] px-1">
            <span className="text-gray-400">Tổng:</span>
            <span className="text-gray-700 font-medium">
              {formatStorage(components.memory.reduce((s: number, m: any) => s + (m.capacity || 0), 0))}
              {' — '}{components.totalSlots ? `${components.memory.length}/${components.totalSlots} slot` : `${components.memory.length} thanh`}
            </span>
          </div>
        </div>
      )}
      {components.disks?.length > 0 && (
        <div className="bg-white rounded-xl border border-border/50 p-3">
          <h4 className="text-[11px] font-semibold text-gray-700 mb-2">💾 Ổ đĩa ({components.disks.length} ổ)</h4>
          <div className="space-y-1.5">
            {components.disks.map((d: any, i: number) => {
              const isSsd = d.type?.toUpperCase() === 'SSD' || d.model?.toUpperCase().includes('SSD');
              const isNvme = d.interface?.toUpperCase().includes('NVME') || d.model?.toUpperCase().includes('NVMe');
              const diskIcon = isSsd ? '⚡' : '🔵';
              const diskType = isNvme ? 'NVMe' : d.type || '';
              return (
                <div key={i} className="flex items-center justify-between text-[11px] py-1.5 px-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex-shrink-0">{diskIcon}</span>
                    <span className="text-gray-700 font-medium truncate">{d.model || `Đĩa ${i+1}`}</span>
                  </div>
                  <span className="text-gray-500 flex-shrink-0 ml-2 text-right">
                    {d.size ? formatStorage(d.size) : '?'}
                    {diskType && <span className="font-semibold text-gray-600"> {diskType}</span>}
                    {d.interface && !isNvme ? ` · ${d.interface}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] px-1">
            <span className="text-gray-400">Tổng:</span>
            <span className="text-gray-700 font-medium">
              {formatStorage(components.disks.reduce((s: number, d: any) => s + (d.size || 0), 0))}
              {' — '}{components.disks.length} ổ
              ({components.disks.filter((d: any) =>
                d.type?.toUpperCase() === 'SSD' ||
                d.interface?.toUpperCase().includes('NVME') ||
                d.model?.toUpperCase().includes('SSD') ||
                d.model?.toUpperCase().includes('NVMe')
              ).length} SSD)
            </span>
          </div>
        </div>
      )}
      {components.gpus?.length > 0 && (
        <div className="bg-white rounded-xl border border-border/50 p-3">
          <h4 className="text-[11px] font-semibold text-gray-700 mb-2">🎮 VGA ({components.gpus.length} card)</h4>
          <div className="space-y-1.5">
            {components.gpus.map((g: any, i: number) => {
              const vramGb = g.memory ? Math.round(g.memory / 1024 / 1024) : 0;
              const vramStr = vramGb >= 1024
                ? `${(vramGb / 1024).toFixed(1)} GB`
                : vramGb > 0 ? `${vramGb} MB` : '';
              return (
                <div key={i} className="flex items-center justify-between text-[11px] py-1.5 px-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex-shrink-0">🎮</span>
                    <span className="text-gray-700 font-medium truncate">{g.name || `GPU ${i+1}`}</span>
                  </div>
                  <span className="text-gray-500 flex-shrink-0 ml-2 text-right">
                    {vramStr && <span className="font-medium">{vramStr}</span>}
                    {g.driver ? ` · ${g.driver.replace(/[.]{3,}/g, '…')}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {components.monitors?.length > 0 && (
        <div className="bg-white rounded-xl border border-border/50 p-3">
          <h4 className="text-[11px] font-semibold text-gray-700 mb-2">🖥️ Màn hình ({components.monitors.length} cái)</h4>
          <div className="space-y-1.5">
            {components.monitors.map((m: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-[11px] py-1 px-2 bg-gray-50 rounded-lg">
                <span className="text-gray-700 font-medium">{m.name || `Màn ${i+1}`}</span>
                <span className="text-gray-500">{m.manufacturer || ''}{m.serial ? ` - SN: ${m.serial}` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {components.software?.length > 0 && (
        <div className="bg-white rounded-xl border border-border/50 p-3">
          <h4 className="text-[11px] font-semibold text-gray-700 mb-2">📦 Phần mềm ({components.software.length} ứng dụng)</h4>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {components.software.map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-[11px] py-1 px-2 bg-gray-50 rounded-lg">
                <span className="text-gray-700">{s.name}</span>
                <span className="text-gray-400 ml-2 whitespace-nowrap">{s.version || ''}{s.publisher ? ` - ${s.publisher}` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Summary overview: RAM type breakdown + disk type + OS detail */}
      {components.memory && components.memory.length > 0 && (
        <div className="bg-white rounded-xl border border-border/50 p-3">
          <h4 className="text-[11px] font-semibold text-gray-700 mb-2">📊 Tổng quan phần cứng</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
            {/* RAM summary */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-gray-400 text-[10px] mb-0.5">RAM</div>
              <div className="text-gray-800 font-semibold">
                {formatStorage(components.memory.reduce((s: number, m: any) => s + (m.capacity || 0), 0))}
              </div>
              <div className="text-gray-500 text-[10px]">
                {components.totalSlots ? `${components.memory.length}/${components.totalSlots} slot` : `${components.memory.length} thanh`}
                {(() => {
                  const types = [...new Set(components.memory.map((m: any) => ramTypeLabel(m.type)).filter(Boolean))];
                  return types.length > 0 ? ` · ${types.join('/')}` : '';
                })()}
                {(() => {
                  const speeds = [...new Set(components.memory.map((m: any) => m.speed).filter(Boolean))].sort();
                  return speeds.length > 0 ? ` · ${speeds[0]}MHz` : '';
                })()}
              </div>
            </div>
            {/* Disk summary */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-gray-400 text-[10px] mb-0.5">Ổ đĩa</div>
              <div className="text-gray-800 font-semibold">
                {formatStorage(components.disks?.reduce((s: number, d: any) => s + (d.size || 0), 0) || 0)}
              </div>
              <div className="text-gray-500 text-[10px]">
                {components.disks?.length || 0} ổ
                {(() => {
                  const ssdCount = components.disks?.filter((d: any) =>
                    d.type?.toUpperCase() === 'SSD' || d.model?.toUpperCase().includes('SSD')
                  ).length || 0;
                  return ssdCount > 0 ? ` · ${ssdCount} SSD` : '';
                })()}
                {(() => {
                  const nvmeCount = components.disks?.filter((d: any) =>
                    d.interface?.toUpperCase().includes('NVME') || d.model?.toUpperCase().includes('NVMe')
                  ).length || 0;
                  return nvmeCount > 0 ? ` · ${nvmeCount} NVMe` : '';
                })()}
              </div>
            </div>
            {/* OS summary */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-gray-400 text-[10px] mb-0.5">Hệ điều hành</div>
              <div className="text-gray-800 font-semibold truncate">{components.os?.name || '?'}</div>
              <div className="text-gray-500 text-[10px]">
                {components.os?.architecture || ''}{components.os?.build ? ` · Build ${components.os.build}` : ''}
              </div>
            </div>
            {/* CPU summary */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-gray-400 text-[10px] mb-0.5">CPU</div>
              <div className="text-gray-800 font-semibold truncate">
                {components.cpuSummary || '?'}
              </div>
              <div className="text-gray-500 text-[10px]">Bộ xử lý</div>
            </div>
          </div>
        </div>
      )}
      {components.bios && (
        <div className="bg-white rounded-xl border border-border/50 p-3">
          <h4 className="text-[11px] font-semibold text-gray-700 mb-2">🔌 BIOS</h4>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div><span className="text-gray-400">Hãng:</span> <span className="text-gray-700">{components.bios.manufacturer || '?'}</span></div>
            <div><span className="text-gray-400">Phiên bản:</span> <span className="text-gray-700">{components.bios.version || '?'}</span></div>
            <div><span className="text-gray-400">Ngày:</span> <span className="text-gray-700">{components.bios.date || '?'}</span></div>
          </div>
        </div>
      )}
      {components.network?.length > 0 && (
        <div className="bg-white rounded-xl border border-border/50 p-3">
          <h4 className="text-[11px] font-semibold text-gray-700 mb-2">🌐 Network ({components.network.length} adapter)</h4>
          <div className="space-y-1">
            {components.network.map((n: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-[11px] py-1 px-2 bg-gray-50 rounded-lg">
                <span className="text-gray-700">{n.name || `Network ${i+1}`}</span>
                <span className="text-gray-500">{n.mac || ''}{n.ip ? ` ${n.ip}` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DeviceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const deviceId = params.deviceId as string;
  const [device, setDevice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [employeesByCustomer, setEmployeesByCustomer] = useState<Record<string, any[]>>({});
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    fetch("/api/customer-devices")
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : d?.data || [];
        const found = list.find((x: any) => x.id === deviceId);
        if (found) {
          setDevice(found);
          return found.customerId;
        }
        return null;
      })
      .then((customerId: string | null) => {
        if (customerId) {
          fetch(`/api/customers/${customerId}/devices/${deviceId}`)
            .then(r => r.json())
            .then(d => {
              setDevice(d?.data || d);
              setLoading(false);
            });
        } else {
          setLoading(false);
        }
      });
  }, [deviceId]);

  useEffect(() => {
    fetch("/api/customer-employees").then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : d?.data || [];
      const byCust: Record<string, any[]> = {};
      for (const e of list) {
        const cid = e.customerId || "__none__";
        if (!byCust[cid]) byCust[cid] = [];
        byCust[cid].push(e);
      }
      setEmployeesByCustomer(byCust);
    });
  }, []);

  const openEdit = () => {
    if (!device) return;
    setForm({
      deviceType: device.deviceType || "computer",
      manufacturer: device.manufacturer || "",
      modelName: device.modelName || "",
      serialNumber: device.serialNumber || "",
      assetTag: device.assetTag || "",
      ipAddress: device.ipAddress || "",
      macAddress: device.macAddress || "",
      cpu: device.cpu || "",
      ram: device.ram || "",
      disk: device.disk || "",
      os: device.os || "",
      locationDetail: device.locationDetail || "",
      assignedToId: device.assignedToId || "",
      status: device.status || "active",
      condition: device.condition || "good",
      quantity: device.quantity || 1,
      notes: device.notes || "",
    });
    setEditOpen(true);
  };

  const handleEdit = () => {
    fetch(`/api/customer-devices/${deviceId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).then(r => r.json()).then((d) => {
      setDevice(d?.data || d);
      setEditOpen(false);
    });
  };

  const handleDelete = () => {
    fetch(`/api/customer-devices/${deviceId}`, { method: "DELETE" })
      .then(() => router.push("/customer-devices"));
  };

  const set = (k: string, v: any) => setForm((prev: any) => ({ ...prev, [k]: v }));

  if (loading) return (
    <div className="min-h-screen bg-surface-secondary/30 pt-4 px-4 space-y-3">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>
  );

  if (!device) return (
    <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
      Không tìm thấy thiết bị
    </div>
  );

  const d = device;

  // Extract form factor from componentsJson
  let formFactor: string | null = null;
  if (d.componentsJson) {
    try { const comp = JSON.parse(d.componentsJson); formFactor = comp.formFactor || null; } catch {}
  }

  return (
    <div className="min-h-screen bg-surface-secondary/30 pb-8">
      <div className="sticky top-0 z-10 bg-white border-b border-border">
        <div className="flex items-center justify-between h-12 px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1 -ml-1 text-gray-700"><ArrowLeft size={22} /></button>
            <h1 className="font-semibold text-base truncate">{d.manufacturer || ""} {d.modelName || "Thiết bị"}</h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={openEdit} className="p-2 text-gray-500"><Edit3 size={18} /></button>
            <button onClick={() => setDeleteOpen(true)} className="p-2 text-gray-500"><Trash2 size={18} /></button>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Header card */}
        <div className="bg-white rounded-xl p-4 shadow-xs border border-border">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl flex-shrink-0">{DEVICE_ICONS[d.deviceType] || "📦"}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-lg text-gray-900">{d.manufacturer || ""} {d.modelName || "Không tên"}</h2>
                <span className={cn("px-2 py-0.5 rounded text-[11px] font-medium", STATUS_COLORS[d.status] || "bg-gray-100 text-gray-600")}>{STATUS_LABELS[d.status] || d.status}</span>
                {d.condition && <span className={cn("px-2 py-0.5 rounded text-[11px] font-medium", CONDITION_COLORS[d.condition] || "bg-gray-100 text-gray-600")}>{CONDITION_LABELS[d.condition] || d.condition}</span>}
                <span className="px-2 py-0.5 rounded text-[11px] bg-gray-100 text-gray-600">{DEVICE_LABELS[d.deviceType] || d.deviceType}</span>
                {d.deviceType === "computer" && formFactor && (
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1",
                    formFactor === 'Laptop' ? 'bg-sky-100 text-sky-700' :
                    formFactor === 'AIO' ? 'bg-violet-100 text-violet-700' :
                    formFactor === 'Rack Mount' ? 'bg-amber-100 text-amber-700' :
                    formFactor === 'Tablet' ? 'bg-pink-100 text-pink-700' :
                    'bg-gray-100 text-gray-600'
                  )}>
                    {formFactor === 'Laptop' ? '💻' : formFactor === 'AIO' ? '🖥️' : formFactor === 'Rack Mount' ? '🗄️' : formFactor === 'Tablet' ? '📱' : '🖥️'}
                    {formFactor}
                  </span>
                )}
              </div>
              {d.serialNumber && <p className="text-xs text-gray-500 mt-1 font-mono">SN: {d.serialNumber}</p>}
            </div>
          </div>
        </div>

        {/* 3-column grid: Customer / Assignment / Collection */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-white rounded-xl p-4 shadow-xs border border-border">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Building2 size={14} className="text-violet-400" /> Khách hàng</h3>
            <div className="space-y-0.5">
              <InfoRow label="Tên" value={d.customer?.name} />
              <InfoRow label="Mã số" value={d.customer?.code} />
              <InfoRow label="Điện thoại" value={d.customer?.phone} />
              <InfoRow label="Email" value={d.customer?.email} />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-xs border border-border">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><User size={14} className="text-blue-400" /> Phân công</h3>
            <div className="space-y-0.5">
              <InfoRow label="Nhân viên" value={d.assignedTo ? `${d.assignedTo.lastName || ""} ${d.assignedTo.firstName || ""}`.trim() : "Chưa gán"} />
              <InfoRow label="Mã NV" value={d.assignedTo?.code} />
              <InfoRow label="Phòng ban" value={d.assignedTo?.department} />
              <InfoRow label="Chức vụ" value={d.assignedTo?.position} />
              <InfoRow label="Điện thoại" value={d.assignedTo?.phone} />
              <InfoRow label="Email" value={d.assignedTo?.email} />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-xs border border-border">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Calendar size={14} className="text-amber-400" /> Thu thập</h3>
            <div className="space-y-0.5">
              <InfoRow label="Ngày thu thập" value={d.collectedAt ? new Date(d.collectedAt).toLocaleDateString("vi-VN") : "-"} />
              <InfoRow label="Phiên" value={d.session?.id ? `#${d.session.id.slice(0, 8)}` : "-"} />
              <InfoRow label="Trạng thái phiên" value={d.session?.status} />
            </div>
          </div>
        </div>

        {/* Specs section — type-specific like GLPI */}
        <div className="bg-white rounded-xl p-4 shadow-xs border border-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Cpu size={14} className="text-cyan-400" /> Thông số kỹ thuật</h3>
          <DeviceSpecs device={d} />
        </div>

        {/* Components detail — only for computer (RAM sticks, disks, GPU, software, BIOS, network) */}
        {d.deviceType === "computer" && d.componentsJson && <ComponentsSection components={JSON.parse(d.componentsJson)} />}
        {/* Monitors: show resolution/size from componentsJson */}
        {d.deviceType === "monitor" && d.componentsJson && <MonitorDetail components={JSON.parse(d.componentsJson)} />}
        {/* Printers: show cartridge/page info from componentsJson */}
        {d.deviceType === "printer" && d.componentsJson && <PrinterDetail components={JSON.parse(d.componentsJson)} />}
        {/* Network devices: show ports/firmware from componentsJson */}
        {d.deviceType === "network" && d.componentsJson && <NetworkDetail components={JSON.parse(d.componentsJson)} />}
        {/* Phones: show firmware/line from componentsJson */}
        {d.deviceType === "phone" && d.componentsJson && <PhoneDetail components={JSON.parse(d.componentsJson)} />}

        {/* Notes */}
        {d.notes && (
          <div className="bg-white rounded-xl p-4 shadow-xs border border-border">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><FileText size={14} className="text-gray-400" /> Ghi chú</h3>
            <p className="text-xs text-gray-700 whitespace-pre-wrap">{d.notes}</p>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-black/30 animate-in">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-sm">Sửa thiết bị</h3>
              <button onClick={() => setEditOpen(false)} className="p-1 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              <Field label="Loại thiết bị">
                <select value={form.deviceType} onChange={(e) => set("deviceType", e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400">
                  {DEVICE_TYPES.map(t => <option key={t} value={t}>{DEVICE_ICONS[t]} {DEVICE_LABELS[t]}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nhãn hiệu"><input value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" /></Field>
                <Field label="Model"><input value={form.modelName} onChange={(e) => set("modelName", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Số serial"><input value={form.serialNumber} onChange={(e) => set("serialNumber", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" /></Field>
                <Field label="Mã tài sản"><input value={form.assetTag} onChange={(e) => set("assetTag", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="IP"><input value={form.ipAddress} onChange={(e) => set("ipAddress", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" /></Field>
                <Field label="MAC"><input value={form.macAddress} onChange={(e) => set("macAddress", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" /></Field>
              </div>
              {/* Type-specific fields — like GLPI */}
              {form.deviceType === "computer" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="CPU"><input value={form.cpu} onChange={(e) => set("cpu", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" /></Field>
                    <Field label="RAM"><input value={form.ram} onChange={(e) => set("ram", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" /></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Ổ đĩa"><input value={form.disk} onChange={(e) => set("disk", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" /></Field>
                    <Field label="Hệ điều hành"><input value={form.os} onChange={(e) => set("os", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" /></Field>
                  </div>
                </>
              )}
              {form.deviceType === "monitor" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Kích cỡ (inch)"><input value={form.cpu} onChange={(e) => set("cpu", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" /></Field>
                  <Field label="Độ phân giải"><input value={form.ram} onChange={(e) => set("ram", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" /></Field>
                </div>
              )}
              {form.deviceType === "printer" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Loại máy in (Laser/Ink)"><input value={form.cpu} onChange={(e) => set("cpu", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" /></Field>
                  <Field label="Số hộp mực"><input value={form.ram} onChange={(e) => set("ram", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" /></Field>
                </div>
              )}
              {form.deviceType === "network" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Loại (Switch/Router/AP)"><input value={form.cpu} onChange={(e) => set("cpu", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" /></Field>
                  <Field label="Firmware"><input value={form.ram} onChange={(e) => set("ram", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" /></Field>
                </div>
              )}
              {form.deviceType === "phone" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Firmware"><input value={form.cpu} onChange={(e) => set("cpu", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" /></Field>
                  <Field label="Số điện thoại"><input value={form.ram} onChange={(e) => set("ram", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" /></Field>
                </div>
              )}
              <Field label="Vị trí"><input value={form.locationDetail} onChange={(e) => set("locationDetail", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" /></Field>
              <Field label="Gán cho nhân viên">
                <select value={form.assignedToId} onChange={(e) => set("assignedToId", e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400">
                  <option value="">Chưa gán</option>
                  {(employeesByCustomer[d.customerId] || []).map((e: any) => (
                    <option key={e.id} value={e.id}>{e.lastName || ""} {e.firstName || ""} - {e.code || ""}</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Trạng thái">
                  <select value={form.status} onChange={(e) => set("status", e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400">
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Tình trạng">
                  <select value={form.condition} onChange={(e) => set("condition", e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400">
                    {Object.entries(CONDITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Số lượng"><input type="number" value={form.quantity} onChange={(e) => set("quantity", parseInt(e.target.value) || 1)} className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" /></Field>
              <Field label="Ghi chú"><textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400 resize-none" /></Field>
            </div>
            <div className="flex items-center gap-2 justify-end px-5 py-3 border-t border-gray-100">
              <button onClick={() => setEditOpen(false)} className="h-8 px-4 rounded-xl text-xs text-gray-600 hover:bg-gray-100">Hủy</button>
              <button onClick={handleEdit} className="h-8 px-4 rounded-xl bg-primary text-white text-xs font-medium">Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-in">
          <div className="bg-white rounded-2xl w-full max-w-sm mx-4 p-5 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><Trash2 size={20} className="text-red-500" /></div>
              <div>
                <h3 className="font-semibold text-sm">Xóa thiết bị</h3>
                <p className="text-xs text-gray-500 mt-0.5">Thao tác này không thể hoàn tác.</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-4">
              Bạn có chắc muốn xóa thiết bị <strong>{d.manufacturer || ""} {d.modelName || ""}</strong>?
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setDeleteOpen(false)} className="h-8 px-4 rounded-xl text-xs text-gray-600 hover:bg-gray-100">Hủy</button>
              <button onClick={handleDelete} className="h-8 px-4 rounded-xl bg-red-500 text-white text-xs font-medium">Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
