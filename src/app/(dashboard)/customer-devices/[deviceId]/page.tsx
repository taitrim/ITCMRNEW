"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Edit3, Trash2, Building2, User, Calendar, Cpu, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import DeviceComponentsPanel from "@/components/DeviceComponentsPanel";
import { EditDeviceModal, DeleteDeviceModal } from "@/components/DeviceModals";

const DEVICE_ICONS: Record<string, string> = {
  computer: "💻", monitor: "🖥️", printer: "🖨️", network: "🌐", phone: "📱",
  peripheral: "🎮", server: "🗄️", other: "📦",
  desktop: "🖥️", laptop: "💻", aio: "🖥️", tablet: "📱",
};
const DEVICE_LABELS: Record<string, string> = {
  computer: "Máy tính", monitor: "Màn hình", printer: "Máy in", network: "Mạng",
  phone: "Điện thoại", peripheral: "Ngoại vi", server: "Máy chủ", other: "Khác",
  desktop: "Desktop", laptop: "Laptop", aio: "AIO", tablet: "Tablet",
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

  if (t === "computer" || t === "desktop" || t === "laptop" || t === "aio" || t === "tablet" || t === "server") {
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
  let lastLoggedUser: string | null = null;
  if (d.componentsJson) {
    try {
      const comp = JSON.parse(d.componentsJson);
      formFactor = comp.formFactor || null;
      lastLoggedUser = comp.hardware?.lastloggeduser || null;
    } catch {}
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

        {/* Windows logged-in user badge */}
        {lastLoggedUser && (
          <div className="bg-white rounded-xl px-4 py-3 shadow-xs border border-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sm flex-shrink-0">👤</div>
            <div>
              <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">User đăng nhập Windows</div>
              <div className="text-sm font-semibold text-gray-800">{lastLoggedUser}</div>
            </div>
          </div>
        )}

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
              <InfoRow label="Người thu thập" value={d.collectedByUser ? (d.collectedByUser.name || [d.collectedByUser.firstname, d.collectedByUser.realname].filter(Boolean).join(" ")) : "-"} />
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

        {/* Components detail — GLPI-style tabbed panel */}
        {d.componentsJson && <DeviceComponentsPanel componentsJson={d.componentsJson} peripheralDevices={d.peripherals || []} />}

        {/* Parent device link (for monitors etc.) */}
        {d.parentDevice && (
          <div className="bg-white rounded-xl p-4 shadow-xs border border-border">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">🔗 Thiết bị gốc</h3>
            <div className="space-y-0.5">
              <InfoRow label="Loại" value={DEVICE_LABELS[d.parentDevice.deviceType] || d.parentDevice.deviceType} />
              <InfoRow label="Tên" value={`${d.parentDevice.manufacturer || ""} ${d.parentDevice.modelName || ""}`.trim() || "—"} />
            </div>
            <a href={`/customer-devices/${d.parentDevice.id}`} className="text-blue-600 hover:text-blue-800 text-xs mt-2 inline-block">Xem chi tiết thiết bị gốc →</a>
          </div>
        )}

        {/* Connected peripherals list (for computers) */}
        {d.peripherals && d.peripherals.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-xs border border-border">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">🔗 Thiết bị liên kết</h3>
            <div className="space-y-1">
              {d.peripherals.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between text-[11px] py-1 px-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span>{DEVICE_ICONS[p.deviceType] || "📦"}</span>
                    <span className="text-gray-700 font-medium">{p.modelName || p.manufacturer || "Thiết bị"}</span>
                    {p.serialNumber && <span className="text-gray-400 font-mono text-[10px]">SN: {p.serialNumber}</span>}
                  </div>
                  <a href={`/customer-devices/${p.id}`} className="text-blue-600 hover:text-blue-800 text-[10px]">Chi tiết →</a>
                </div>
              ))}
            </div>
          </div>
        )}

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
        <EditDeviceModal form={form} set={set} onSave={handleEdit} onClose={() => setEditOpen(false)} employees={employeesByCustomer} customerId={d.customerId} />
      )}

      {/* Delete confirmation */}
      {deleteOpen && (
        <DeleteDeviceModal deviceName={`${d.manufacturer || ""} ${d.modelName || ""}`.trim() || "Thiết bị"} onConfirm={handleDelete} onClose={() => setDeleteOpen(false)} />
      )}
    </div>
  );
}
