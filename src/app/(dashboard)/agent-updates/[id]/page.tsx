"use client";

import { use, useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Check, X, AlertTriangle, Monitor, Printer, HelpCircle,
  ChevronDown, ChevronRight, UserPlus, Users, FileText,
  User, Briefcase, GraduationCap, AtSign, Phone,
  Plus, Search, Laptop, Server, RefreshCw,
} from "lucide-react";
import DeviceComponentsPanel from "@/components/DeviceComponentsPanel";

/* ===== Types ===== */
type MatchResult = {
  found: boolean;
  existingDeviceId: string | null;
  method: "serial" | "uuid" | "mac" | "hostname_model" | "none";
  confidence: "high" | "medium" | "low";
  existingDevice: Record<string, unknown> | null;
};
type ReviewDevice = { parsed: Record<string, unknown>; match: MatchResult };
type ReviewData = { parsedAt: string; devices: ReviewDevice[]; pendingParents: number };

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  department?: string | null;
};

/* ===== Helpers ===== */
function deviceIcon(type: string, size = 14) {
  const t = type.toLowerCase();
  if (["computer","desktop","laptop","server","aio","tablet"].includes(t)) {
    if (t === "laptop") return <Laptop size={size} />;
    if (t === "server") return <Server size={size} />;
    return <Monitor size={size} />;
  }
  if (t === "printer") return <Printer size={size} />;
  return <HelpCircle size={size} />;
}

function deviceTypeLabel(type: string): string {
  const map: Record<string, string> = {
    computer: "PC", desktop: "PC", laptop: "Laptop", server: "Server",
    aio: "AIO", tablet: "Tablet", monitor: "Màn hình", printer: "Máy in",
    peripheral: "Ngoại vi", network: "Mạng",
  };
  return map[type.toLowerCase()] || type;
}

function fmt(val: unknown): string {
  if (val === null || val === undefined || val === "") return "—";
  return String(val);
}

/* ===== Device Card ===== */
function DeviceCard({
  device, index, checked, onToggle,
  employees, assignedEmployeeId, onAssignmentChange, onAddEmployee,
}: {
  device: ReviewDevice; index: number; checked: boolean; onToggle: () => void;
  employees: Employee[]; assignedEmployeeId: string | null;
  onAssignmentChange: (empId: string | null) => void; onAddEmployee: () => void;
}) {
  const d = device.parsed;
  const match = device.match;
  const isUpdate = match.found;
  const type = (d.deviceType as string) || "computer";
  const isComputer = ["computer","desktop","laptop","server","aio","tablet"].includes(type);
  const [showSpecs, setShowSpecs] = useState(false);

  return (
    <div className={`group rounded-xl border transition-all duration-200 ${
      checked
        ? "border-blue-300 bg-blue-50/40 shadow-sm"
        : "border-gray-150 bg-white hover:border-gray-200 hover:shadow-sm"
    }`}>
      <div className="flex items-start gap-3 px-4 py-3.5">
        {/* Checkbox */}
        <input type="checkbox" checked={checked} onChange={onToggle}
          className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0" />

        {/* Left accent strip */}
        <div className={`shrink-0 w-1 self-stretch rounded-full mt-0.5 mb-0.5 ${
          isUpdate ? "bg-amber-400" : "bg-green-400"
        }`} />

        {/* Icon + info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
            isUpdate ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"
          }`}>
            {deviceIcon(type, 18)}
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900 truncate max-w-[260px]">{fmt(d.name)}</span>
              <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">{deviceTypeLabel(type)}</span>
              {isUpdate ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                  <RefreshCw size={10} /> Cập nhật
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                  <Plus size={10} /> Mới
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              {d.serialNumber
                ? <>Serial: <span className="font-mono text-gray-500">{fmt(d.serialNumber)}</span></>
                : <>{d.manufacturer ? fmt(d.manufacturer) : ""} {d.modelName ? fmt(d.modelName) : ""}</>}
            </div>
            {isUpdate && (
              <div className="inline-flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50/80 rounded-md px-2 py-0.5 border border-amber-200/50">
                <AlertTriangle size={10} />
                Đã có trong danh sách — sẽ cập nhật thông tin
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isComputer && (
            <EmployeeSelect
              employees={employees} value={assignedEmployeeId}
              onChange={onAssignmentChange} onAdd={onAddEmployee} />
          )}
          <button onClick={() => setShowSpecs(!showSpecs)}
            className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-all">
            {showSpecs ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>

      {/* Specs comparison */}
      {showSpecs ? (
        <div className="border-t border-gray-100 px-4 py-3.5 bg-gray-50/70">
          {isComputer ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-2">
              <SpecItem label="Hãng" value={d.manufacturer} oldValue={match.existingDevice?.manufacturer} />
              <SpecItem label="Model" value={d.modelName} oldValue={match.existingDevice?.modelName} />
              <SpecItem label="Serial" value={d.serialNumber} oldValue={match.existingDevice?.serialNumber} />
              <SpecItem label="IP" value={d.ipAddress} oldValue={match.existingDevice?.ipAddress} />
              <SpecItem label="MAC" value={d.macAddress} oldValue={match.existingDevice?.macAddress} />
              <SpecItem label="CPU" value={d.cpu} oldValue={match.existingDevice?.cpu} />
              <SpecItem label="RAM" value={d.ram} oldValue={match.existingDevice?.ram} />
              <SpecItem label="Ổ đĩa" value={d.disk} oldValue={match.existingDevice?.disk} />
              <SpecItem label="HĐH" value={d.os} oldValue={match.existingDevice?.os} />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-2">
              <SpecItem label="Hãng" value={d.manufacturer} oldValue={match.existingDevice?.manufacturer} />
              <SpecItem label="Model" value={d.modelName} oldValue={match.existingDevice?.modelName} />
              <SpecItem label="Serial" value={d.serialNumber} oldValue={match.existingDevice?.serialNumber} />
            </div>
          )}

          {d.componentsJson ? (
            <div className="mt-3 pt-3 border-t border-gray-200/60">
              <DeviceComponentsPanel componentsJson={String(d.componentsJson)} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SpecItem({ label, value, oldValue }: { label: string; value: unknown; oldValue: unknown }) {
  const newVal = fmt(value);
  const oldVal = fmt(oldValue);
  const changed = newVal !== oldVal && oldVal !== "—";

  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <span className="text-gray-400 w-10 shrink-0">{label}</span>
      {oldVal !== "—" && changed ? (
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-blue-600 font-medium truncate">{newVal}</span>
          <span className="text-gray-300 shrink-0">→</span>
          <span className="text-amber-500 line-through truncate">{oldVal}</span>
          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400" />
        </div>
      ) : (
        <span className={`truncate ${changed ? "text-blue-600 font-medium" : "text-gray-600"}`}>{newVal}</span>
      )}
    </div>
  );
}

/* ===== Employee Select ===== */
function EmployeeSelect({
  employees, value, onChange, onAdd,
}: {
  employees: Employee[]; value: string | null;
  onChange: (id: string | null) => void; onAdd: () => void;
}) {
  return (
    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
      <div className="relative">
        <Users size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <select value={value || ""} onChange={e => onChange(e.target.value || null)}
          className="pl-7 pr-2 h-7 rounded-lg border border-gray-200 text-[11px] text-gray-600 bg-white hover:border-gray-300 focus:border-blue-300 focus:ring-1 focus:ring-blue-200 transition cursor-pointer appearance-none min-w-[120px]">
          <option value="">Chưa gán</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.lastName} {emp.firstName}</option>
          ))}
        </select>
      </div>
      <button onClick={onAdd} title="Thêm nhân viên mới"
        className="w-7 h-7 rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all">
        <UserPlus size={12} />
      </button>
    </div>
  );
}

/* ===== Add Employee Modal ===== */
function AddEmployeeModal({
  customerId, onSave, onClose,
}: {
  customerId: string; onSave: (emp: Employee) => void; onClose: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!firstName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/customer-employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, firstName, lastName, email, phone, position, department }),
      });
      if (!res.ok) throw new Error("Lỗi");
      const emp = await res.json();
      onSave(emp);
    } catch {
      alert("Không thể thêm nhân viên");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Thêm nhân viên</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">Nhập thông tin nhân viên mới</p>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <InputField icon={<User size={13} />} placeholder="Họ" value={lastName} onChange={setLastName} />
            <InputField icon={<User size={13} />} placeholder="Tên *" value={firstName} onChange={setFirstName} />
          </div>
          <InputField icon={<AtSign size={13} />} placeholder="Email" value={email} onChange={setEmail} type="email" />
          <InputField icon={<Phone size={13} />} placeholder="Số điện thoại" value={phone} onChange={setPhone} type="tel" />
          <div className="grid grid-cols-2 gap-3">
            <InputField icon={<Briefcase size={13} />} placeholder="Chức vụ" value={position} onChange={setPosition} />
            <InputField icon={<GraduationCap size={13} />} placeholder="Phòng ban" value={department} onChange={setDepartment} />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs text-gray-500 hover:bg-gray-100 transition-all">Huỷ</button>
          <button onClick={handleSubmit} disabled={!firstName.trim() || saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 disabled:opacity-50 transition-all shadow-sm">
            {saving ? "Đang lưu..." : "Thêm nhân viên"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InputField({ icon, placeholder, value, onChange, type }: {
  icon: React.ReactNode; placeholder: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
      <input type={type || "text"} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        className="w-full pl-9 pr-3 h-10 rounded-xl border border-gray-200 text-xs text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:ring-1 focus:ring-blue-200 transition-all" />
    </div>
  );
}

/* ===== Page ===== */
export default function SubmissionReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [submission, setSubmission] = useState<any>(null);
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ status: string; confirmedCount: number } | null>(null);

  const [assignments, setAssignments] = useState<Record<number, string | null>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalDeviceIdx, setAddModalDeviceIdx] = useState<number | null>(null);

  // Load submission + employees
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const subRes = await fetch(`/api/agent-inventory/submissions/${id}`);
      if (!subRes.ok) throw new Error((await subRes.json().catch(() => ({ error: "Lỗi" }))).error || `HTTP ${subRes.status}`);
      const subJson = await subRes.json();
      setSubmission(subJson.data);
      const rd = subJson.data.reviewData;
      setReviewData(rd);

      if (subJson.data.customerId) {
        const empRes = await fetch(`/api/customer-employees?customerId=${subJson.data.customerId}`);
        if (empRes.ok) {
          const empJson = await empRes.json();
          setEmployees(Array.isArray(empJson) ? empJson : []);
        }
      }

      if (rd?.devices) {
        setSelected(new Set(rd.devices.map((_: any, i: number) => i)));
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleDevice = useCallback((index: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (!reviewData) return;
    if (selected.size === reviewData.devices.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(reviewData.devices.map((_: any, i: number) => i)));
    }
  }, [reviewData, selected]);

  const stats = useMemo(() => {
    if (!reviewData) return { total: 0, matched: 0, newCount: 0 };
    const total = reviewData.devices.length;
    const matched = reviewData.devices.filter(d => d.match.found).length;
    return { total, matched, newCount: total - matched };
  }, [reviewData]);

  const assignedCount = useMemo(() => {
    return Object.values(assignments).filter(Boolean).length;
  }, [assignments]);

  const handleAssignmentChange = useCallback((index: number, employeeId: string | null) => {
    setAssignments(prev => ({ ...prev, [index]: employeeId }));
  }, []);

  const handleOpenAddEmployee = useCallback((index: number) => {
    setAddModalDeviceIdx(index);
    setShowAddModal(true);
  }, []);

  const handleEmployeeCreated = useCallback((emp: Employee) => {
    setEmployees(prev => [...prev, emp]);
    if (addModalDeviceIdx !== null) {
      setAssignments(prev => ({ ...prev, [addModalDeviceIdx]: emp.id }));
    }
    setShowAddModal(false);
    setAddModalDeviceIdx(null);
  }, [addModalDeviceIdx]);

  const handleApprove = useCallback(async () => {
    if (!reviewData || selected.size === 0) return;
    setSubmitting(true);
    try {
      const selectedIds = Array.from(selected).map(i =>
        String(reviewData.devices[i]?.parsed?.deviceId || `${reviewData.devices[i]?.parsed?.name}_${i}`)
      );
      const res = await fetch(`/api/agent-inventory/submissions/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve", selectedDevices: selectedIds, assignments,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Lỗi");
      setResult({ status: "approved", confirmedCount: json.data?.confirmedCount || 0 });
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    } finally {
      setSubmitting(false);
    }
  }, [reviewData, selected, assignments, id]);

  const handleReject = useCallback(async () => {
    if (!confirm("Từ chối tất cả thiết bị trong đợt này?")) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/agent-inventory/submissions/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Lỗi");
      setResult({ status: "rejected", confirmedCount: 0 });
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    } finally {
      setSubmitting(false);
    }
  }, [id]);

  /* ── Loading ── */
  if (loading) return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-12 bg-white rounded-xl border border-gray-100 animate-pulse" />
        {[1,2,3].map(i => (
          <div key={i} className="h-20 bg-white rounded-xl border border-gray-100 animate-pulse flex items-center px-5">
            <div className="w-10 h-10 rounded-xl bg-gray-100 mr-3" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 bg-gray-100 rounded" />
              <div className="h-3 w-24 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (error && !submission) return (
    <div className="min-h-screen bg-[#f8f9fc] flex items-center justify-center px-4">
      <div className="max-w-sm w-full rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertTriangle size={32} className="text-red-400 mx-auto mb-3" />
        <p className="text-sm text-red-700">{error}</p>
      </div>
    </div>
  );

  /* ── Result screen ── */
  if (result) return (
    <div className="min-h-screen bg-[#f8f9fc] flex items-center justify-center px-4">
      <div className="max-w-sm w-full rounded-2xl bg-white p-8 text-center shadow-lg border border-gray-100">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm ${
          result.status === "approved" ? "bg-gradient-to-br from-green-400 to-green-500" : "bg-gradient-to-br from-red-400 to-red-500"
        }`}>
          {result.status === "approved"
            ? <Check size={28} className="text-white" />
            : <X size={28} className="text-white" />}
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          {result.status === "approved" ? "Đã duyệt thành công" : "Đã từ chối"}
        </h2>
        {result.status === "approved" && (
          <p className="text-sm text-green-700 mb-1">Đã xác nhận <strong>{result.confirmedCount}</strong> thiết bị</p>
        )}
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => router.push(`/customers/${submission?.customerId}`)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-all shadow-sm">
            <ArrowLeft size={14} /> Khách hàng
          </button>
          <button onClick={() => router.push("/agent-updates")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-gray-500 text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-all">
            Danh sách
          </button>
        </div>
      </div>
    </div>
  );

  // Group devices
  const computerDevices = reviewData?.devices
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => ["computer","desktop","laptop","server","aio","tablet"].includes((d.parsed.deviceType as string) || "")) || [];
  const otherDevices = reviewData?.devices
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => !["computer","desktop","laptop","server","aio","tablet"].includes((d.parsed.deviceType as string) || "")) || [];

  return (
    <div className="min-h-screen bg-[#f8f9fc]">

      {/* ═══ Header ═══ */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                <ArrowLeft size={18} />
              </button>
              <div>
                <div className="text-[11px] text-gray-400 tracking-wide uppercase">Duyệt thiết bị</div>
                <h1 className="text-base font-bold text-gray-900">
                  {submission?.customerName || "Đã xóa"}
                </h1>
              </div>
            </div>

            {/* Stats badges */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-green-50 rounded-xl px-3 py-1.5 border border-green-100">
                <Plus size={12} className="text-green-600" />
                <span className="text-sm font-bold text-green-700">{stats.newCount}</span>
                <span className="text-[11px] text-green-500">Mới</span>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-50 rounded-xl px-3 py-1.5 border border-amber-100">
                <RefreshCw size={12} className="text-amber-600" />
                <span className="text-sm font-bold text-amber-700">{stats.matched}</span>
                <span className="text-[11px] text-amber-500">Cập nhật</span>
              </div>
            </div>
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-gray-500 hover:text-gray-700 transition-colors">
                <input type="checkbox" checked={selected.size === reviewData?.devices.length}
                  onChange={toggleAll}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                Chọn tất cả
              </label>
              <span className="text-gray-400">
                <strong className="text-gray-600">{selected.size}</strong> / {reviewData?.devices.length || 0}
                {assignedCount > 0 ? <span className="ml-2">· Gán <strong className="text-gray-600">{assignedCount}</strong></span> : null}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleReject} disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-all disabled:opacity-50">
                <X size={13} /> Từ chối
              </button>
              <button onClick={handleApprove} disabled={selected.size === 0 || submitting}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-all disabled:opacity-50 shadow-sm">
                {submitting
                  ? "Đang xử lý..."
                  : <><Check size={13} /> Duyệt {selected.size} thiết bị</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Content ═══ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">{error}</div>
        )}

        {reviewData ? (
          <>
            {/* ── Computers ── */}
            {computerDevices.length > 0 ? (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Monitor size={15} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-700">Máy tính</h2>
                    <p className="text-[11px] text-gray-400">{computerDevices.length} thiết bị</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {computerDevices.map(({ d, i }) => (
                    <DeviceCard key={i} device={d} index={i} checked={selected.has(i)} onToggle={() => toggleDevice(i)}
                      employees={employees} assignedEmployeeId={assignments[i] ?? null}
                      onAssignmentChange={(empId) => handleAssignmentChange(i, empId)}
                      onAddEmployee={() => handleOpenAddEmployee(i)} />
                  ))}
                </div>
              </section>
            ) : null}

            {/* ── Other devices ── */}
            {otherDevices.length > 0 ? (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Printer size={15} className="text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-700">Thiết bị khác</h2>
                    <p className="text-[11px] text-gray-400">{otherDevices.length} thiết bị</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {otherDevices.map(({ d, i }) => (
                    <DeviceCard key={i} device={d} index={i} checked={selected.has(i)} onToggle={() => toggleDevice(i)}
                      employees={employees} assignedEmployeeId={null}
                      onAssignmentChange={() => {}} onAddEmployee={() => {}} />
                  ))}
                </div>
              </section>
            ) : null}

            {/* ── Pending parents warning ── */}
            {reviewData.pendingParents > 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertTriangle size={15} className="text-amber-600" />
                </div>
                <div className="text-xs text-amber-800">
                  <strong className="font-semibold">{reviewData.pendingParents} thiết bị</strong> chưa xác định được máy tính cha. Kiểm tra kỹ trước khi duyệt.
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {/* ── Bottom bar ── */}
        <div className="sticky bottom-4 z-10 bg-white/90 backdrop-blur-md rounded-2xl border border-gray-200/80 px-5 py-3.5 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-5 text-xs text-gray-400">
            <span><strong className="text-gray-600">{selected.size}</strong> / {reviewData?.devices.length || 0} chọn</span>
            {assignedCount > 0 ? <span><strong className="text-gray-600">{assignedCount}</strong> đã gán</span> : null}
            <span className="text-gray-300">·</span>
            <span className="text-green-600">+{stats.newCount} mới</span>
            <span className="text-amber-600">{stats.matched} cập nhật</span>
          </div>
          <button onClick={handleApprove} disabled={selected.size === 0 || submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-all shadow-sm">
            {submitting ? "Đang xử lý..." : <><Check size={15} /> Duyệt {selected.size} thiết bị</>}
          </button>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && submission?.customerId ? (
        <AddEmployeeModal
          customerId={submission.customerId}
          onSave={handleEmployeeCreated}
          onClose={() => { setShowAddModal(false); setAddModalDeviceIdx(null); }} />
      ) : null}
    </div>
  );
}
