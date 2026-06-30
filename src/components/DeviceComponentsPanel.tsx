"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/* ===== Types — matches componentsJson from parseFlatInventory --full ===== */

interface CpuEntry { name: string; manufacturer?: string; speed?: number; core?: number; thread?: number; serial?: string; id?: string; }
interface OsInfo { full_name: string; version?: string; kernel_version?: string; build?: string; arch?: string; install_date?: string; boot_time?: string; timezone?: string; fqdn?: string; }
interface BiosInfo { manufacturer?: string; version?: string; date?: string; system_manufacturer?: string; system_model?: string; motherboard_manufacturer?: string; motherboard_model?: string; }
interface HwInfo { name?: string; chassis_type?: string; memory?: number; uuid?: string; defaultgateway?: string; dns?: string; lastloggeduser?: string; workgroup?: string; vmsystem?: string; }
interface MemorySlot { caption: string; numslots: number; capacity?: number | null; description?: string; manufacturer?: string; model?: string; serialnumber?: string; speed?: number | string | null; type?: string; }
interface PciSlot { description?: string; designation?: string; name?: string; status?: string; }
interface StorageEntry { model?: string; disksize?: number; interface?: string; type?: string; serial?: string; firmware?: string; manufacturer?: string; }
interface DriveEntry { letter?: string; label?: string; filesystem?: string; total?: number; free?: number; serial?: string; encrypt_status?: string; systemdrive?: boolean; }
interface VideoEntry { name?: string; chipset?: string; memory?: number; resolution?: string; pcislot?: string; }
interface MonitorEntry { caption?: string; manufacturer?: string; serial?: string; }
interface NetworkEntry { description?: string; mac?: string; ipaddress?: string; ipmask?: string; ipgateway?: string; ipdhcp?: string; ipsubnet?: string; speed?: string; status?: string; type?: string; virtualdev?: boolean; }
interface SoftwareEntry { name?: string; version?: string; publisher?: string; }
interface PrinterEntry { name?: string; driver?: string; port?: string; network?: boolean; shared?: boolean; status?: string; resolution?: string; }
interface AntivirusEntry { name?: string; company?: string; enabled?: boolean; uptodate?: boolean; base_version?: string; }
interface FirewallEntry { profile?: string; status?: string; }
interface SoundEntry { caption?: string; description?: string; manufacturer?: string; name?: string; }
interface ControllerEntry { caption?: string; manufacturer?: string; name?: string; type?: string; pcislot?: string; vendorid?: string; productid?: string; }
interface InputEntry { caption?: string; description?: string; name?: string; layout?: string; }
interface UsbEntry { caption?: string; manufacturer?: string; name?: string; serial?: string; vendorid?: string; productid?: string; }
interface PortEntry { caption?: string; description?: string; name?: string; type?: string; }

interface Components {
  cpus?: CpuEntry[];
  operatingsystem?: OsInfo;
  bios?: BiosInfo;
  hardware?: HwInfo;
  memories?: MemorySlot[];
  slots?: PciSlot[];
  storages?: StorageEntry[];
  drives?: DriveEntry[];
  videos?: VideoEntry[];
  monitors?: MonitorEntry[];
  networks?: NetworkEntry[];
  softwares?: SoftwareEntry[];
  printers?: PrinterEntry[];
  antivirus?: AntivirusEntry[];
  firewalls?: FirewallEntry[];
  sounds?: SoundEntry[];
  controllers?: ControllerEntry[];
  inputs?: InputEntry[];
  usbdevices?: UsbEntry[];
  ports?: PortEntry[];
  formFactor?: string;
  totalMemory?: number;
}

/* ===== Helpers ===== */

function fmtMb(mb: number): string {
  if (mb >= 1_048_576) return `${(mb / 1_048_576).toFixed(1)} TB`;
  if (mb >= 1024) return `${(mb / 1024).toFixed(0)} GB`;
  return `${Math.round(mb)} MB`;
}

function InfoRow({ label, value, mono }: { label: string; value?: string | number | null | boolean; mono?: boolean }) {
  const display = value == null || value === "" ? "-" : String(value);
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50">
      <span className="text-[11px] text-gray-400">{label}</span>
      <span className={cn("text-[11px] font-medium text-gray-800 max-w-[60%] text-right truncate", mono && "font-mono text-[10px]")}>{display}</span>
    </div>
  );
}

function SectionCard({ icon, title, count, children }: { icon: string; title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-border/50 p-3">
      <h4 className="text-[11px] font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
        {icon} {title}
        {count != null && <span className="text-gray-400 font-normal">({count})</span>}
      </h4>
      {children}
    </div>
  );
}

/* ===== Tab definitions ===== */

const TABS = [
  { key: "overview", label: "Tổng quan", icon: "📊" },
  { key: "hardware", label: "Phần cứng", icon: "🔧" },
  { key: "os", label: "Hệ điều hành", icon: "🖥️" },
  { key: "storage", label: "Lưu trữ", icon: "💾" },
  { key: "network", label: "Mạng", icon: "🌐" },
  { key: "gpu", label: "VGA", icon: "🎮" },
  { key: "software", label: "Phần mềm", icon: "📦" },
  { key: "peripherals", label: "Ngoại vi", icon: "⌨️" },
  { key: "security", label: "Bảo mật", icon: "🛡️" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/* ===== Individual sections ===== */

function OverviewSection({ c }: { c: Components }) {
  const cpu = c.cpus?.[0];
  const totalDiskMb = c.storages?.reduce((s, d) => s + (d.disksize || 0), 0) || 0;
  const populatedSlots = c.memories?.filter(m => m.capacity && m.capacity > 0).length || 0;
  const totalSlots = c.memories?.length || 0;

  return (
    <SectionCard icon="📊" title="Tổng quan">
      {/* Form factor badge */}
      {c.formFactor && (
        <div className="mb-2 flex items-center gap-2">
          <span className="text-lg">{formFactorIcon(c.formFactor)}</span>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[11px] font-semibold",
            formFactorBadgeCls(c.formFactor),
          )}>{c.formFactor}</span>
          {c.hardware?.vmsystem && c.hardware.vmsystem !== "Physical" && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700">
              {c.hardware.vmsystem}
            </span>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-gray-400 text-[10px] mb-0.5">CPU</div>
          <div className="text-gray-800 font-semibold text-[11px] truncate">{cpu?.name || "?"}</div>
          <div className="text-gray-500 text-[10px]">{cpu?.speed ? `${cpu.speed} MHz · ${cpu.core || "?"} cores` : ""}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-gray-400 text-[10px] mb-0.5">RAM</div>
          <div className="text-gray-800 font-semibold text-[11px]">{c.totalMemory ? fmtMb(c.totalMemory) : "?"}</div>
          <div className="text-gray-500 text-[10px]">{totalSlots > 0 ? `${populatedSlots}/${totalSlots} slot` : ""}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-gray-400 text-[10px] mb-0.5">Ổ đĩa</div>
          <div className="text-gray-800 font-semibold text-[11px]">{totalDiskMb > 0 ? fmtMb(totalDiskMb) : "?"}</div>
          <div className="text-gray-500 text-[10px]">{c.storages?.length || 0} ổ</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-gray-400 text-[10px] mb-0.5">Hệ điều hành</div>
          <div className="text-gray-800 font-semibold text-[11px] truncate">{c.operatingsystem?.full_name || "?"}</div>
          <div className="text-gray-500 text-[10px]">{c.operatingsystem?.arch || ""}</div>
        </div>
      </div>
    </SectionCard>
  );
}

/** Icon mapping for form factor — matches GLPI asset type icons */
function formFactorIcon(ff: string): string {
  const f = ff.toLowerCase();
  if (f === 'laptop' || f === 'notebook') return '💻';
  if (f === 'desktop' || f === 'mini pc') return '🖥️';
  if (f === 'aio' || f === 'all-in-one') return '🖥️';
  if (f === 'server' || f === 'rack mount') return '🗄️';
  if (f === 'tablet') return '📱';
  if (f === 'convertible' || f === 'detachable') return '💻';
  return '🖥️';
}

/** Tailwind badge classes per form factor */
function formFactorBadgeCls(ff: string): string {
  const f = ff.toLowerCase();
  if (f === 'laptop' || f === 'notebook') return 'bg-blue-100 text-blue-700';
  if (f === 'desktop' || f === 'mini pc') return 'bg-gray-100 text-gray-700';
  if (f === 'aio' || f === 'all-in-one') return 'bg-indigo-100 text-indigo-700';
  if (f === 'server' || f === 'rack mount') return 'bg-orange-100 text-orange-700';
  if (f === 'tablet') return 'bg-purple-100 text-purple-700';
  return 'bg-gray-100 text-gray-700';
}

function BiosSection({ bios }: { bios: BiosInfo }) {
  return (
    <SectionCard icon="🔌" title="BIOS">
      <div className="grid grid-cols-2 gap-x-4">
        <InfoRow label="Hãng BIOS" value={bios.manufacturer} />
        <InfoRow label="Phiên bản" value={bios.version} />
        <InfoRow label="Ngày BIOS" value={bios.date} />
        <InfoRow label="Hãng hệ thống" value={bios.system_manufacturer} />
        <InfoRow label="Model hệ thống" value={bios.system_model} />
        <InfoRow label="Hãng mainboard" value={bios.motherboard_manufacturer} />
        <InfoRow label="Model mainboard" value={bios.motherboard_model} />
      </div>
    </SectionCard>
  );
}

function OsSection({ os }: { os: OsInfo }) {
  return (
    <SectionCard icon="🖥️" title="Hệ điều hành">
      <div className="grid grid-cols-2 gap-x-4">
        <InfoRow label="Tên" value={os.full_name} />
        <InfoRow label="Phiên bản" value={os.version} />
        <InfoRow label="Kernel" value={os.kernel_version} />
        <InfoRow label="Kiến trúc" value={os.arch} />
        <InfoRow label="FQDN" value={os.fqdn} mono />
        <InfoRow label="Timezone" value={os.timezone} />
        <InfoRow label="Ngày cài đặt" value={os.install_date} />
        <InfoRow label="Boot time" value={os.boot_time} />
      </div>
    </SectionCard>
  );
}

function CpuSection({ cpus }: { cpus: CpuEntry[] }) {
  return (
    <SectionCard icon="🧮" title="Bộ xử lý" count={cpus.length}>
      <div className="space-y-1.5">
        {cpus.map((cpu, i) => (
          <div key={i} className="text-[11px] py-1.5 px-2 bg-gray-50 rounded-lg space-y-0.5">
            <div className="font-medium text-gray-800">{cpu.name || `CPU ${i + 1}`}</div>
            <div className="flex gap-3 text-gray-500 flex-wrap">
              {cpu.manufacturer && <span>{cpu.manufacturer}</span>}
              {cpu.speed && <span>{cpu.speed} MHz</span>}
              {cpu.core && <span>{cpu.core} core</span>}
              {cpu.thread && <span>{cpu.thread} thread</span>}
              {cpu.serial && <span className="font-mono text-[10px]">SN: {cpu.serial}</span>}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function MemorySection({ memories, totalMemory }: { memories: MemorySlot[]; totalMemory?: number }) {
  // Count populated vs empty slots (slot has capacity > 0 → populated)
  const populated = memories.filter(m => m.capacity && m.capacity > 0);
  const empty = memories.filter(m => !m.capacity || m.capacity === 0);
  const totalFromSlots = populated.reduce((sum, m) => sum + (m.capacity || 0), 0);

  return (
    <SectionCard icon="🧠" title="RAM" count={memories.length}>
      {totalMemory != null && (
        <div className="mb-2 px-2 py-1 bg-blue-50 rounded-lg text-[11px] flex justify-between">
          <span className="text-gray-500">Tổng RAM (hardware)</span>
          <span className="text-blue-700 font-semibold">{fmtMb(totalMemory)}</span>
        </div>
      )}
      {totalFromSlots > 0 && (
        <div className="mb-2 px-2 py-1 bg-green-50 rounded-lg text-[11px] flex justify-between">
          <span className="text-gray-500">Tổng theo slot</span>
          <span className="text-green-700 font-semibold">{fmtMb(totalFromSlots)}</span>
          <span className="text-gray-400 ml-2">({populated.length} thanh / {memories.length} slot)</span>
        </div>
      )}
      <div className="space-y-1">
        {memories.map((m, i) => {
          const isPopulated = m.capacity && m.capacity > 0;
          return (
            <div key={i} className={cn(
              "flex items-center justify-between text-[11px] py-1.5 px-2 rounded-lg",
              isPopulated ? "bg-blue-50" : "bg-gray-50",
            )}>
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn("flex-shrink-0 text-xs", isPopulated ? "" : "opacity-40")}>
                  {isPopulated ? "🟦" : "⬜"}
                </span>
                <div className="min-w-0">
                  <div className={cn("font-medium truncate", isPopulated ? "text-gray-800" : "text-gray-400")}>
                    {m.caption || `Slot ${i + 1}`}
                  </div>
                  {isPopulated && (
                    <div className="text-[10px] text-gray-500 truncate">
                      {[
                        m.type,
                        m.speed ? `${m.speed} MHz` : "",
                        m.manufacturer,
                        m.model,
                      ].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2 text-right">
                {isPopulated ? (
                  <span className="text-blue-700 font-semibold">{fmtMb(m.capacity!)}</span>
                ) : (
                  <span className="text-gray-300 italic">Trống</span>
                )}
                <span className="text-gray-300 text-[10px]">#{m.numslots || i + 1}</span>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

function StorageSection({ storages }: { storages: StorageEntry[] }) {
  return (
    <SectionCard icon="💾" title="Ổ cứng" count={storages.length}>
      <div className="space-y-1.5">
        {storages.map((s, i) => {
          const isSsd = s.type?.toUpperCase().includes("SSD");
          const isNvme = s.interface?.toUpperCase().includes("NVME") || s.model?.toUpperCase().includes("NVME");
          return (
            <div key={i} className="flex items-center justify-between text-[11px] py-1.5 px-2 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex-shrink-0">{isSsd || isNvme ? "⚡" : "🔵"}</span>
                <span className="text-gray-700 font-medium truncate">{s.model || `Đĩa ${i + 1}`}</span>
              </div>
              <span className="text-gray-500 flex-shrink-0 ml-2 text-right">
                {s.disksize ? fmtMb(s.disksize) : "?"}
                {s.type && <span className="font-semibold text-gray-600 ml-1">{s.type}</span>}
                {s.interface && <span className="ml-1">· {s.interface}</span>}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] px-1">
        <span className="text-gray-400">Tổng:</span>
        <span className="text-gray-700 font-medium">
          {fmtMb(storages.reduce((s, d) => s + (d.disksize || 0), 0))}
          {" — "}{storages.length} ổ
          ({storages.filter(d => d.type?.toUpperCase().includes("SSD") || d.interface?.toUpperCase().includes("NVME")).length} SSD)
        </span>
      </div>
    </SectionCard>
  );
}

function DrivesSection({ drives }: { drives: DriveEntry[] }) {
  return (
    <SectionCard icon="📂" title="Phân vùng" count={drives.length}>
      <div className="space-y-1.5">
        {drives.map((d, i) => {
          const usagePct = d.total && d.free != null ? Math.round(((d.total - d.free) / d.total) * 100) : null;
          return (
            <div key={i} className="text-[11px] py-1.5 px-2 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">{d.letter || "?"}: {d.label || ""}</span>
                <span className="text-gray-500">{d.total ? fmtMb(d.total) : "?"} — {d.free != null ? `${fmtMb(d.free)} trống` : ""}</span>
              </div>
              {usagePct != null && (
                <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", usagePct > 90 ? "bg-red-400" : usagePct > 70 ? "bg-amber-400" : "bg-green-400")} style={{ width: `${usagePct}%` }} />
                </div>
              )}
              <div className="flex gap-2 text-gray-400 text-[10px] mt-0.5">
                {d.filesystem && <span>{d.filesystem}</span>}
                {d.encrypt_status && <span>🔒 {d.encrypt_status}</span>}
                {d.systemdrive && <span>⭐ System</span>}
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

function VideoSection({ videos }: { videos: VideoEntry[] }) {
  return (
    <SectionCard icon="🎮" title="VGA" count={videos.length}>
      <div className="space-y-1.5">
        {videos.map((v, i) => (
          <div key={i} className="flex items-center justify-between text-[11px] py-1.5 px-2 bg-gray-50 rounded-lg">
            <span className="text-gray-700 font-medium truncate">{v.name || v.chipset || `GPU ${i + 1}`}</span>
            <span className="text-gray-500 flex-shrink-0 ml-2 text-right">
              {v.memory ? <span className="font-medium">{fmtMb(v.memory)}</span> : ""}
              {v.resolution && <span className="ml-1">· {v.resolution}</span>}
              {v.pcislot && <span className="ml-1 text-[10px]">PCI:{v.pcislot}</span>}
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function NetworkSection({ networks }: { networks: NetworkEntry[] }) {
  return (
    <SectionCard icon="🌐" title="Mạng" count={networks.length}>
      <div className="space-y-1.5">
        {networks.map((n, i) => (
          <div key={i} className="text-[11px] py-1.5 px-2 bg-gray-50 rounded-lg space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-gray-700 font-medium truncate">{n.description || `Adapter ${i + 1}`}</span>
              <span className="text-gray-500 flex items-center gap-1">
                {n.status === "up" ? <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> : <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                {n.status || ""}
                {n.virtualdev && <span className="text-[10px] text-gray-400">(VM)</span>}
              </span>
            </div>
            <div className="flex gap-3 text-gray-500 flex-wrap">
              {n.ipaddress && <span className="font-mono text-[10px]">{n.ipaddress}</span>}
              {n.mac && <span className="font-mono text-[10px]">{n.mac}</span>}
              {n.speed && <span>{n.speed}</span>}
            </div>
            {(n.ipgateway || n.ipdhcp || n.ipmask) && (
              <div className="flex gap-3 text-[10px] text-gray-400 flex-wrap">
                {n.ipmask && <span>Mask: {n.ipmask}</span>}
                {n.ipgateway && <span>GW: {n.ipgateway}</span>}
                {n.ipdhcp && <span>DHCP: {n.ipdhcp}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function MonitorsSection({ monitors }: { monitors: MonitorEntry[] }) {
  return (
    <SectionCard icon="🖥️" title="Màn hình" count={monitors.length}>
      <div className="space-y-1">
        {monitors.map((m, i) => (
          <div key={i} className="flex items-center justify-between text-[11px] py-1 px-2 bg-gray-50 rounded-lg">
            <span className="text-gray-700 font-medium">{m.caption || `Màn ${i + 1}`}</span>
            <span className="text-gray-500">{m.manufacturer || ""}{m.serial ? ` · SN: ${m.serial}` : ""}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function SoftwareSection({ softwares }: { softwares: SoftwareEntry[] }) {
  return (
    <SectionCard icon="📦" title="Phần mềm" count={softwares.length}>
      <div className="max-h-64 overflow-y-auto space-y-1">
        {softwares.map((s, i) => (
          <div key={i} className="flex items-center justify-between text-[11px] py-1 px-2 bg-gray-50 rounded-lg">
            <span className="text-gray-700 truncate max-w-[60%]">{s.name}</span>
            <span className="text-gray-400 ml-2 whitespace-nowrap">{s.version || ""}{s.publisher ? ` · ${s.publisher}` : ""}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function PrintersSection({ printers }: { printers: PrinterEntry[] }) {
  return (
    <SectionCard icon="🖨️" title="Máy in" count={printers.length}>
      <div className="space-y-1.5">
        {printers.map((p, i) => (
          <div key={i} className="text-[11px] py-1.5 px-2 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-700 font-medium">{p.name || `Máy in ${i + 1}`}</span>
              <span className="text-gray-500">{p.status || ""} {p.network ? "(Mạng)" : "(Local)"}</span>
            </div>
            <div className="flex gap-3 text-[10px] text-gray-400 mt-0.5">
              {p.driver && <span>Driver: {p.driver}</span>}
              {p.port && <span>Port: {p.port}</span>}
              {p.shared && <span>Chia sẻ</span>}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function SecuritySection({ antivirus, firewalls }: { antivirus: AntivirusEntry[]; firewalls: FirewallEntry[] }) {
  return (
    <SectionCard icon="🛡️" title="Bảo mật">
      {antivirus.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] text-gray-400 font-medium mb-1">Antivirus</div>
          {antivirus.map((a, i) => (
            <div key={i} className="flex items-center justify-between text-[11px] py-1 px-2 bg-gray-50 rounded-lg mb-1">
              <div>
                <span className="text-gray-700 font-medium">{a.name || "?"}</span>
                {a.company && <span className="text-gray-400 ml-1">· {a.company}</span>}
              </div>
              <span className="flex items-center gap-1">
                {a.enabled ? <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> : <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                <span className={a.enabled && a.uptodate ? "text-green-600" : "text-red-600"}>
                  {a.enabled ? (a.uptodate ? "Cập nhật" : "Cũ") : "Tắt"}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
      {firewalls.length > 0 && (
        <div>
          <div className="text-[10px] text-gray-400 font-medium mb-1">Tường lửa</div>
          {firewalls.map((f, i) => (
            <div key={i} className="flex items-center justify-between text-[11px] py-1 px-2 bg-gray-50 rounded-lg mb-1">
              <span className="text-gray-700">{f.profile || `Profile ${i + 1}`}</span>
              <span className={f.status?.toLowerCase().includes("on") || f.status?.toLowerCase().includes("enabled") ? "text-green-600" : "text-red-600"}>
                {f.status || "?"}
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function ControllersSection({ controllers }: { controllers: ControllerEntry[] }) {
  return (
    <SectionCard icon="🔧" title="Controller" count={controllers.length}>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {controllers.map((c, i) => (
          <div key={i} className="flex items-center justify-between text-[11px] py-1 px-2 bg-gray-50 rounded-lg">
            <div className="min-w-0">
              <span className="text-gray-700 font-medium truncate block">{c.caption || c.name || `Controller ${i + 1}`}</span>
              {c.manufacturer && <span className="text-[10px] text-gray-400">{c.manufacturer}</span>}
            </div>
            <span className="text-gray-400 text-[10px] ml-2 whitespace-nowrap">{c.type || ""} {c.pcislot ? `PCI:${c.pcislot}` : ""}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function SoundSection({ sounds }: { sounds: SoundEntry[] }) {
  return (
    <SectionCard icon="🔊" title="Âm thanh" count={sounds.length}>
      <div className="space-y-1">
        {sounds.map((s, i) => (
          <div key={i} className="flex items-center justify-between text-[11px] py-1 px-2 bg-gray-50 rounded-lg">
            <span className="text-gray-700 font-medium truncate">{s.name || s.caption || `Âm thanh ${i + 1}`}</span>
            <span className="text-gray-400 text-[10px]">{s.manufacturer || ""}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function InputsSection({ inputs }: { inputs: InputEntry[] }) {
  return (
    <SectionCard icon="⌨️" title="Thiết bị nhập" count={inputs.length}>
      <div className="space-y-1">
        {inputs.map((inp, i) => (
          <div key={i} className="flex items-center justify-between text-[11px] py-1 px-2 bg-gray-50 rounded-lg">
            <span className="text-gray-700 font-medium truncate">{inp.caption || inp.name || `TB ${i + 1}`}</span>
            <span className="text-gray-400 text-[10px]">{inp.layout || inp.description || ""}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function UsbSection({ usbdevices }: { usbdevices: UsbEntry[] }) {
  return (
    <SectionCard icon="🔌" title="USB" count={usbdevices.length}>
      <div className="space-y-1">
        {usbdevices.map((u, i) => (
          <div key={i} className="text-[11px] py-1 px-2 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-700 font-medium truncate">{u.name || u.caption || `USB ${i + 1}`}</span>
              <span className="text-gray-400 text-[10px]">{u.manufacturer || ""}</span>
            </div>
            {(u.vendorid || u.productid) && (
              <div className="text-[10px] text-gray-400 mt-0.5">VID: {u.vendorid || "?"} PID: {u.productid || "?"}</div>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function SlotsSection({ slots }: { slots: PciSlot[] }) {
  return (
    <SectionCard icon="🔲" title="PCI Slot" count={slots.length}>
      <div className="space-y-1">
        {slots.map((s, i) => (
          <div key={i} className="flex items-center justify-between text-[11px] py-1 px-2 bg-gray-50 rounded-lg">
            <span className="text-gray-700 font-medium">{s.name || s.designation || `Slot ${i + 1}`}</span>
            <span className="text-gray-400 text-[10px]">{s.status || ""}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function PortsSection({ ports }: { ports: PortEntry[] }) {
  return (
    <SectionCard icon="🔗" title="Cổng" count={ports.length}>
      <div className="space-y-1">
        {ports.map((p, i) => (
          <div key={i} className="flex items-center justify-between text-[11px] py-1 px-2 bg-gray-50 rounded-lg">
            <span className="text-gray-700 font-medium">{p.name || p.caption || `Cổng ${i + 1}`}</span>
            <span className="text-gray-400 text-[10px]">{p.type || ""}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ===== Main export: Tabbed GLPI-style device detail ===== */

export default function DeviceComponentsPanel({ componentsJson }: { componentsJson: string }) {
  const c: Components = JSON.parse(componentsJson);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const hasHw = !!c.bios || !!c.hardware || (c.cpus?.length || 0) > 0;
  const hasOs = !!c.operatingsystem;
  const hasStorages = (c.storages?.length || 0) > 0 || (c.drives?.length || 0) > 0;
  const hasNetwork = (c.networks?.length || 0) > 0;
  const hasGpu = (c.videos?.length || 0) > 0;
  const hasSoftware = (c.softwares?.length || 0) > 0;
  const hasPeriph = (c.monitors?.length || 0) > 0 || (c.printers?.length || 0) > 0 || (c.sounds?.length || 0) > 0 || (c.controllers?.length || 0) > 0 || (c.inputs?.length || 0) > 0 || (c.usbdevices?.length || 0) > 0 || (c.slots?.length || 0) > 0 || (c.ports?.length || 0) > 0 || (c.memories?.length || 0) > 0;
  const hasSecurity = (c.antivirus?.length || 0) > 0 || (c.firewalls?.length || 0) > 0;

  const visibleTabs = TABS.filter(t => {
    if (t.key === "overview") return true;
    if (t.key === "hardware") return hasHw;
    if (t.key === "os") return hasOs;
    if (t.key === "storage") return hasStorages;
    if (t.key === "network") return hasNetwork;
    if (t.key === "gpu") return hasGpu;
    if (t.key === "software") return hasSoftware;
    if (t.key === "peripherals") return hasPeriph;
    if (t.key === "security") return hasSecurity;
    return false;
  });

  return (
    <div className="space-y-3">
      {/* Tab bar */}
      <div className="bg-white rounded-xl border border-border/50 p-1 flex gap-1 overflow-x-auto">
        {visibleTabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={cn("px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors", activeTab === t.key ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100")}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-3">
        {activeTab === "overview" && (
          <><OverviewSection c={c} />{c.bios && <BiosSection bios={c.bios} />}</>
        )}
        {activeTab === "hardware" && (
          <>
            {c.hardware && (
              <SectionCard icon="🖥️" title="Phần cứng">
                <div className="grid grid-cols-2 gap-x-4">
                  <InfoRow label="Tên máy" value={c.hardware.name} />
                  <InfoRow label="Form factor" value={c.formFactor || c.hardware.chassis_type} />
                  <InfoRow label="UUID" value={c.hardware.uuid} mono />
                  <InfoRow label="Workgroup" value={c.hardware.workgroup} />
                  <InfoRow label="Gateway" value={c.hardware.defaultgateway} />
                  <InfoRow label="DNS" value={c.hardware.dns} />
                  <InfoRow label="User đăng nhập cuối" value={c.hardware.lastloggeduser} />
                  {c.hardware.vmsystem && <InfoRow label="Hệ thống VM" value={c.hardware.vmsystem} />}
                </div>
              </SectionCard>
            )}
            {c.cpus && c.cpus.length > 0 && <CpuSection cpus={c.cpus} />}
            {c.memories && c.memories.length > 0 && <MemorySection memories={c.memories} totalMemory={c.totalMemory} />}
            {c.bios && <BiosSection bios={c.bios} />}
          </>
        )}
        {activeTab === "os" && c.operatingsystem && <OsSection os={c.operatingsystem} />}
        {activeTab === "storage" && (
          <>{c.storages && c.storages.length > 0 && <StorageSection storages={c.storages} />}{c.drives && c.drives.length > 0 && <DrivesSection drives={c.drives} />}</>
        )}
        {activeTab === "network" && c.networks && <NetworkSection networks={c.networks} />}
        {activeTab === "gpu" && c.videos && <VideoSection videos={c.videos} />}
        {activeTab === "software" && c.softwares && <SoftwareSection softwares={c.softwares} />}
        {activeTab === "peripherals" && (
          <>
            {c.monitors && c.monitors.length > 0 && <MonitorsSection monitors={c.monitors} />}
            {c.printers && c.printers.length > 0 && <PrintersSection printers={c.printers} />}
            {c.sounds && c.sounds.length > 0 && <SoundSection sounds={c.sounds} />}
            {c.controllers && c.controllers.length > 0 && <ControllersSection controllers={c.controllers} />}
            {c.inputs && c.inputs.length > 0 && <InputsSection inputs={c.inputs} />}
            {c.usbdevices && c.usbdevices.length > 0 && <UsbSection usbdevices={c.usbdevices} />}
            {c.slots && c.slots.length > 0 && <SlotsSection slots={c.slots} />}
            {c.ports && c.ports.length > 0 && <PortsSection ports={c.ports} />}
          </>
        )}
        {activeTab === "security" && c.antivirus && c.firewalls && <SecuritySection antivirus={c.antivirus} firewalls={c.firewalls} />}
      </div>
    </div>
  );
}
