"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { HardDrive, Plus, Search, Edit3, Trash2, X, Filter, Building2, Monitor, CheckSquare, Square, Trash } from "lucide-react";
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

function groupDevices(devices: any[]) {
  const map = new Map<string, { customerName: string; customerId: string; employees: Map<string, { employeeId: string; employeeName: string; devices: any[] }> }>();
  for (const d of devices) {
    const cId = d.customerId;
    if (!map.has(cId)) {
      map.set(cId, { customerName: d.customer?.name || "Không tên", customerId: cId, employees: new Map() });
    }
    const group = map.get(cId)!;
    const eId = d.assignedTo?.id || "__unassigned__";
    if (!group.employees.has(eId)) {
      group.employees.set(eId, {
        employeeId: d.assignedTo?.id || "",
        employeeName: d.assignedTo ? `${d.assignedTo.firstName || ""} ${d.assignedTo.lastName || ""}`.trim() || d.assignedTo.code || "Không tên" : "Chưa gán",
        devices: [],
      });
    }
    group.employees.get(eId)!.devices.push(d);
  }
  const result: Array<{ customerName: string; customerId: string; employees: Array<{ employeeId: string; employeeName: string; employeeDevices: any[] }> }> = [];
  for (const group of map.values()) {
    result.push({ customerName: group.customerName, customerId: group.customerId, employees: Array.from(group.employees.values()).map(e => ({ ...e, employeeDevices: e.devices })) });
  }
  return result;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] text-gray-500">{label}</label>
      {children}
    </div>
  );
}

export default function CustomerDevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeesByCustomer, setEmployeesByCustomer] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [conditionFilter, setConditionFilter] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Bulk select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editDevice, setEditDevice] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteDevice, setDeleteDevice] = useState<any>(null);

  // Form state
  const [form, setForm] = useState<any>({
    customerId: "", deviceType: "computer", manufacturer: "", modelName: "", serialNumber: "",
    assetTag: "", ipAddress: "", macAddress: "", cpu: "", ram: "", disk: "", os: "",
    locationDetail: "", assignedToId: "", status: "active", condition: "good", quantity: 1, notes: "",
  });

  const fetchList = useCallback(() => {
    fetch("/api/customer-devices").then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : d?.data || [];
      setDevices(list);
      setLoading(false);
    });
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  useEffect(() => {
    fetch("/api/customers").then(r => r.json()).then(d => {
      setCustomers(Array.isArray(d) ? d : d?.data || []);
    });
  }, []);

  useEffect(() => {
    fetch("/api/customer-employees").then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : d?.data || [];
      setEmployees(list);
      const byCust: Record<string, any[]> = {};
      for (const e of list) {
        const cid = e.customerId || "__none__";
        if (!byCust[cid]) byCust[cid] = [];
        byCust[cid].push(e);
      }
      setEmployeesByCustomer(byCust);
    });
  }, []);

  const resetForm = () => {
    setForm({ customerId: "", deviceType: "computer", manufacturer: "", modelName: "", serialNumber: "",
      assetTag: "", ipAddress: "", macAddress: "", cpu: "", ram: "", disk: "", os: "",
      locationDetail: "", assignedToId: "", status: "active", condition: "good", quantity: 1, notes: "" });
  };

  const handleCreate = () => {
    fetch("/api/customer-devices", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).then(r => r.json()).then(() => { setCreateOpen(false); resetForm(); fetchList(); });
  };

  const openEdit = (d: any) => {
    setEditDevice(d);
    setForm({
      customerId: d.customerId || "",
      deviceType: d.deviceType || "computer",
      manufacturer: d.manufacturer || "",
      modelName: d.modelName || "",
      serialNumber: d.serialNumber || "",
      assetTag: d.assetTag || "",
      ipAddress: d.ipAddress || "",
      macAddress: d.macAddress || "",
      cpu: d.cpu || "",
      ram: d.ram || "",
      disk: d.disk || "",
      os: d.os || "",
      locationDetail: d.locationDetail || "",
      assignedToId: d.assignedToId || "",
      status: d.status || "active",
      condition: d.condition || "good",
      quantity: d.quantity || 1,
      notes: d.notes || "",
    });
    setEditOpen(true);
  };

  const handleEdit = () => {
    if (!editDevice) return;
    fetch(`/api/customer-devices/${editDevice.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).then(r => r.json()).then(() => { setEditOpen(false); setEditDevice(null); resetForm(); fetchList(); });
  };

  const openDelete = (d: any) => {
    setDeleteDevice(d);
    setDeleteOpen(true);
  };

  const handleDelete = () => {
    if (!deleteDevice) return;
    fetch(`/api/customer-devices/${deleteDevice.id}`, { method: "DELETE" })
      .then(() => { setDeleteOpen(false); setDeleteDevice(null); fetchList(); });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllInGroup = (employeeDevices: any[]) => {
    const ids = employeeDevices.map((d: any) => d.id);
    const allSelected = ids.every((id: string) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id: string) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id: string) => next.add(id));
        return next;
      });
    }
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    fetch("/api/customer-devices/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }).then(r => r.json()).then(() => {
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      fetchList();
    });
  };

  const set = (k: string, v: any) => setForm((prev: any) => ({ ...prev, [k]: v }));

  const filtered = devices.filter(d => {
    if (typeFilter && d.deviceType !== typeFilter) return false;
    if (statusFilter && d.status !== statusFilter) return false;
    if (conditionFilter && d.condition !== conditionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = `${d.manufacturer || ""} ${d.modelName || ""}`.toLowerCase();
      const sn = (d.serialNumber || "").toLowerCase();
      const emp = d.assignedTo ? `${d.assignedTo.firstName || ""} ${d.assignedTo.lastName || ""}`.toLowerCase() : "";
      if (!name.includes(q) && !sn.includes(q) && !emp.includes(q) && !(d.customer?.name || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const grouped = groupDevices(filtered);

  return (
    <div className="min-h-screen bg-surface-secondary/30 pb-4">
      <div className="px-4 pt-3 pb-2 bg-white border-b border-border">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-sm rounded-full bg-gray-100 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-primary/20"
              placeholder="Tìm kiếm thiết bị..." />
          </div>
          <button onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <Filter size={18} />
          </button>
          <button onClick={() => { resetForm(); setCreateOpen(true); }}
            className="h-10 px-4 flex items-center gap-1.5 rounded-xl bg-primary text-white text-sm font-medium shadow-xs">
            <Plus size={16} /> Thêm
          </button>
        </div>
        {showAdvanced && (
          <div className="mt-2 flex flex-wrap gap-2 animate-in">
            <input value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              placeholder="Lọc trạng thái..."
              className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" />
            <input value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)}
              placeholder="Lọc tình trạng..."
              className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" />
          </div>
        )}
        <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar">
          <button onClick={() => setTypeFilter("")}
            className={cn("px-3 py-1 rounded-full text-xs whitespace-nowrap", !typeFilter ? "bg-primary text-white" : "bg-gray-100 text-gray-500")}>Tất cả</button>
          {DEVICE_TYPES.map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={cn("px-3 py-1 rounded-full text-xs whitespace-nowrap", typeFilter === t ? "bg-primary text-white" : "bg-gray-100 text-gray-500")}>
              {DEVICE_ICONS[t]} {DEVICE_LABELS[t]}
            </button>
          ))}
        </div>
        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="mt-2 flex items-center gap-2 animate-in-up">
            <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
              Đã chọn {selectedIds.size} thiết bị
            </span>
            <button onClick={() => setSelectedIds(new Set())}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">
              Bỏ chọn
            </button>
            <button onClick={() => setBulkDeleteOpen(true)}
              className="ml-auto h-8 px-3 flex items-center gap-1.5 rounded-xl bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100">
              <Trash2 size={14} /> Xóa đã chọn
            </button>
          </div>
        )}
      </div>

      <div className="px-4 mt-3 space-y-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 space-y-2 animate-pulse">
            <div className="flex items-center gap-3"><div className="w-9 h-9 bg-gray-200 rounded-full" /><div className="flex-1 space-y-1.5"><div className="h-4 bg-gray-200 rounded w-2/3" /><div className="h-3 bg-gray-200 rounded w-1/3" /></div></div>
          </div>
        )) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-muted-foreground animate-in">
            <Monitor size={48} className="text-gray-300 mb-3" />
            <p className="font-medium">Không có thiết bị</p>
          </div>
        ) : grouped.map((group, gi) => (
          <div key={group.customerId} className="animate-in-up" style={{ animationDelay: `${gi * 30}ms` }}>
            <div className="flex items-center gap-2 mb-2">
              <Building2 size={16} className="text-gray-400" />
              <h2 className="font-semibold text-sm text-gray-800">{group.customerName}</h2>
              <span className="text-[10px] text-gray-400">({group.employees.reduce((s, e) => s + e.employeeDevices.length, 0)} thiết bị)</span>
            </div>
            <div className="space-y-2">
              {group.employees.map((emp) => (
                  <div key={emp.employeeId || "__unassigned__"}>
                    <div className="flex items-center gap-1.5 mb-1.5 ml-0.5">
                      <button onClick={() => selectAllInGroup(emp.employeeDevices)}
                        className="flex-shrink-0 text-gray-300 hover:text-primary transition-colors">
                        {emp.employeeDevices.every((d: any) => selectedIds.has(d.id))
                          ? <CheckSquare size={14} className="text-primary" />
                          : <Square size={14} />}
                      </button>
                      <span className="text-[11px] text-gray-500 font-medium">{emp.employeeName}</span>
                      <span className="text-[10px] text-gray-400">({emp.employeeDevices.length})</span>
                    </div>
                  <div className="space-y-1.5">
                    {emp.employeeDevices.map((d: any) => (
                      <div key={d.id} className="flex items-start gap-0">
                        {/* Checkbox */}
                        <button onClick={(e) => { e.preventDefault(); toggleSelect(d.id); }}
                          className="mt-2.5 mr-1.5 flex-shrink-0 text-gray-300 hover:text-primary transition-colors">
                          {selectedIds.has(d.id) ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} />}
                        </button>
                        <Link href={`/customer-devices/${d.id}`} className="block flex-1">
                        <div className="bg-white rounded-xl p-3 shadow-xs border border-border active:scale-[0.98] transition-transform">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-base flex-shrink-0">{DEVICE_ICONS[d.deviceType] || "📦"}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium text-sm text-gray-900">{d.manufacturer || ""} {d.modelName || ""}</span>
                                {d.deviceType === "computer" && (() => {
                                  try { const ff = d.componentsJson ? JSON.parse(d.componentsJson).formFactor : null; return ff ? <span className="text-[10px] text-gray-400 font-medium">· {ff}</span> : null; } catch { return null; }
                                })()}
                                <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", STATUS_COLORS[d.status] || "bg-gray-100 text-gray-600")}>{STATUS_LABELS[d.status] || d.status}</span>
                                {d.condition && <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", CONDITION_COLORS[d.condition] || "bg-gray-100 text-gray-600")}>{CONDITION_LABELS[d.condition] || d.condition}</span>}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
                                <span>{DEVICE_LABELS[d.deviceType] || d.deviceType}</span>
                                {d.serialNumber && <><span className="text-gray-300">|</span><span className="font-mono">SN: {d.serialNumber}</span></>}
                                {d.ipAddress && <><span className="text-gray-300">|</span><span>{d.ipAddress}</span></>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.preventDefault()}>
                              <button onClick={() => openEdit(d)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"><Edit3 size={14} /></button>
                              <button onClick={() => openDelete(d)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        </div>
                      </Link>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Create modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-black/30 animate-in">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-sm">Thêm thiết bị mới</h3>
              <button onClick={() => setCreateOpen(false)} className="p-1 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              <Field label="Khách hàng">
                <select value={form.customerId} onChange={(e) => set("customerId", e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400">
                  <option value="">Chọn khách hàng</option>
                  {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
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
              {form.deviceType === "computer" && (<>
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
              <Field label="Loại máy in"><input value={form.cpu} onChange={(e) => set("cpu", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" /></Field>
              <Field label="Số hộp mực"><input value={form.ram} onChange={(e) => set("ram", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" /></Field>
            </div>
          )}
          {form.deviceType === "network" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Loại (Switch/Router)"><input value={form.cpu} onChange={(e) => set("cpu", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" /></Field>
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
                  {(employeesByCustomer[form.customerId] || []).map((e: any) => (
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
              <button onClick={() => setCreateOpen(false)} className="h-8 px-4 rounded-xl text-xs text-gray-600 hover:bg-gray-100">Hủy</button>
              <button onClick={handleCreate} className="h-8 px-4 rounded-xl bg-primary text-white text-xs font-medium">Thêm</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-black/30 animate-in">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-sm">Sửa thiết bị</h3>
              <button onClick={() => { setEditOpen(false); setEditDevice(null); }} className="p-1 text-gray-400"><X size={18} /></button>
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
              {form.deviceType === "computer" && (<>
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
              <Field label="Loại máy in"><input value={form.cpu} onChange={(e) => set("cpu", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" /></Field>
              <Field label="Số hộp mực"><input value={form.ram} onChange={(e) => set("ram", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" /></Field>
            </div>
          )}
          {form.deviceType === "network" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Loại (Switch/Router)"><input value={form.cpu} onChange={(e) => set("cpu", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" /></Field>
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
                  {(employeesByCustomer[form.customerId] || []).map((e: any) => (
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
              <button onClick={() => { setEditOpen(false); setEditDevice(null); }} className="h-8 px-4 rounded-xl text-xs text-gray-600 hover:bg-gray-100">Hủy</button>
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
              Bạn có chắc muốn xóa thiết bị <strong>{deleteDevice?.manufacturer || ""} {deleteDevice?.modelName || ""}</strong>?
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => { setDeleteOpen(false); setDeleteDevice(null); }} className="h-8 px-4 rounded-xl text-xs text-gray-600 hover:bg-gray-100">Hủy</button>
              <button onClick={handleDelete} className="h-8 px-4 rounded-xl bg-red-500 text-white text-xs font-medium">Xóa</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete confirmation */}
      {bulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-in">
          <div className="bg-white rounded-2xl w-full max-w-sm mx-4 p-5 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><Trash2 size={20} className="text-red-500" /></div>
              <div>
                <h3 className="font-semibold text-sm">Xóa hàng loạt</h3>
                <p className="text-xs text-gray-500 mt-0.5">Thao tác này không thể hoàn tác.</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-4">
              Bạn có chắc muốn xóa <strong>{selectedIds.size} thiết bị</strong> đã chọn?
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setBulkDeleteOpen(false)} className="h-8 px-4 rounded-xl text-xs text-gray-600 hover:bg-gray-100">Hủy</button>
              <button onClick={handleBulkDelete} className="h-8 px-4 rounded-xl bg-red-500 text-white text-xs font-medium">Xóa {selectedIds.size} thiết bị</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
