"use client";

import { use, useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Check, X, AlertTriangle, Monitor, Printer, HelpCircle,
  ChevronDown, ChevronRight, UserPlus, Users, FileText, Save,
  User, Briefcase, GraduationCap, AtSign, Phone,
  Plus, Search, Laptop, Server,
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
  device,
  index,
  checked,
  onToggle,
  employees,
  assignedEmployeeId,
  onAssignmentChange,
  onAddEmployee,
}: {
  device: ReviewDevice;
  index: number;
  checked: boolean;
  onToggle: () => void;
  employees: Employee[];
  assignedEmployeeId: string | null;
  onAssignmentChange: (empId: string | null) => void;
  onAddEmployee: () => void;
}) {
  const d = device.parsed;
  const match = device.match;
  const isUpdate = match.found;
  const type = (d.deviceType as string) || "computer";
  const isComputer = ["computer","desktop","laptop","server","aio","tablet"].includes(type);
  const [showSpecs, setShowSpecs] = useState(false);

  const assignedEmp = assignedEmployeeId ? employees.find(e => e.id === assignedEmployeeId) : null;

  return (
    <div className={`rounded-xl border transition-shadow ${
      checked ? "border-blue-300 shadow-sm bg-blue-50/30" : "border-gray-200 bg-white hover:shadow-sm"
    }`}>
      {/* Header row */}
      <div className="flex items-start gap-3 px-4 py-3">
        <input type="checkbox" checked={checked} onChange={onToggle}
          className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0" />

        {/* Icon + badges */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            isUpdate ? "bg-amber-100" : "bg-green-100"
          }`}>
            {deviceIcon(type, 16)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900 truncate max-w-[280px]">{fmt(d.name)}</span>
              <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{deviceTypeLabel(type)}</span>
              {isUpdate ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                  <RefreshCwIcon size={10} /> Cập nhật
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                  <Plus size={10} /> Mới
                </span>
              )}
              {isUpdate && match.confidence === "high" && (
                <span className="text-[10px] text-green-600">✓ Đã ghép</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-gray-400 truncate">
                {d.serialNumber ? <>Serial: {fmt(d.serialNumber)}</> : <>{d.manufacturer ? fmt(d.manufacturer) : ""} {d.modelName ? fmt(d.modelName) : ""}</>}
              </span>
            </div>
            {isUpdate && (
              <div className="mt-1 text-[10px] text-amber-600 bg-amber-50 rounded px-1.5 py-0.5 inline-block">
                Đã có trong danh sách — sẽ cập nhật thông tin
              </div>
            )}
          </div>
        </div>

        {/* Assignee + Expand */}
        <div className="flex items-center gap-2 shrink-0">
          {isComputer && (
            <EmployeeSelect
              employees={employees}
              value={assignedEmployeeId}
              onChange={onAssignmentChange}
              onAdd={onAddEmployee}
            />
          )}
          <button onClick={() => setShowSpecs(!showSpecs)}
            className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition">
            {showSpecs ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>

      {/* Specs comparison (expandable) */}
      {showSpecs && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50">
          {isComputer ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1.5">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
              <SpecItem label="Hãng" value={d.manufacturer} oldValue={match.existingDevice?.manufacturer} />
              <SpecItem label="Model" value={d.modelName} oldValue={match.existingDevice?.modelName} />
              <SpecItem label="Serial" value={d.serialNumber} oldValue={match.existingDevice?.serialNumber} />
            </div>
          )}

          {d.componentsJson ? (
            <div className="mt-2">
              <DeviceComponentsPanel componentsJson={String(d.componentsJson)} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function RefreshCwIcon({ size }: { size?: number }) {
  return (
    <svg width={size || 12} height={size || 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function SpecItem({ label, value, oldValue }: { label: string; value: unknown; oldValue: unknown }) {
  const newVal = fmt(value);
  const oldVal = fmt(oldValue);
  const changed = newVal !== oldVal && oldVal !== "—";

  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <span className="text-gray-400 w-10 shrink-0">{label}</span>
      <span className={`truncate ${changed ? "text-blue-600 font-medium" : "text-gray-600"}`}>{newVal}</span>
      {oldVal !== "—" && (
        <>
          <span className="text-gray-300 shrink-0">→</span>
          <span className={`truncate ${changed ? "text-amber-600 line-through" : "text-gray-400"}`}>{oldVal}</span>
        </>
      )}
    </div>
  );
}

/* ===== Employee Select ===== */
function EmployeeSelect({
  employees,
  value,
  onChange,
  onAdd,
}: {
  employees: Employee[];
  value: string | null;
  onChange: (id: string | null) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
      <div className="relative">
        <Users size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <select
          value={value || ""}
          onChange={e => onChange(e.target.value || null)}
          className="pl-7 pr-2 h-7 rounded-lg border border-gray-200 text-[11px] text-gray-600 bg-white hover:border-gray-300 focus:border-blue-300 focus:ring-1 focus:ring-blue-200 transition cursor-pointer appearance-none min-w-[120px]"
        >
          <option value="">Chưa gán</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.lastName} {emp.firstName}</option>
          ))}
        </select>
      </div>
      <button onClick={onAdd} title="Thêm nhân viên mới"
        className="w-7 h-7 rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition">
        <UserPlus size={12} />
      </button>
    </div>
  );
}

/* ===== Add Employee Modal ===== */
function AddEmployeeModal({
  customerId,
  onSave,
  onClose,
}: {
  customerId: string;
  onSave: (emp: Employee) => void;
  onClose: () => void;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Thêm nhân viên</h3>
        </div>
        <div className="p-4 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <InputField icon={<User size={13} />} placeholder="Họ" value={lastName} onChange={setLastName} />
            <InputField icon={<User size={13} />} placeholder="Tên *" value={firstName} onChange={setFirstName} />
          </div>
          <InputField icon={<AtSign size={13} />} placeholder="Email" value={email} onChange={setEmail} type="email" />
          <InputField icon={<Phone size={13} />} placeholder="Số điện thoại" value={phone} onChange={setPhone} type="tel" />
          <div className="grid grid-cols-2 gap-2">
            <InputField icon={<Briefcase size={13} />} placeholder="Chức vụ" value={position} onChange={setPosition} />
            <InputField icon={<GraduationCap size={13} />} placeholder="Phòng ban" value={department} onChange={setDepartment} />
          </div>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 transition">Huỷ</button>
          <button onClick={handleSubmit} disabled={!firstName.trim() || saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition">
            {saving ? "Đang lưu..." : "Thêm"}
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
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
      <input type={type || "text"} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        className="w-full pl-8 pr-3 h-9 rounded-lg border border-gray-200 text-xs text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:ring-1 focus:ring-blue-200 transition" />
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
          action: "approve",
          selectedDevices: selectedIds,
          assignments,
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

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-sm text-gray-400 animate-pulse">Đang tải...</div>
    </div>
  );

  if (error && !submission) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 text-center">{error}</div>
    </div>
  );

  if (result) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-lg">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
          result.status === "approved" ? "bg-green-100" : "bg-red-100"
        }`}>
          {result.status === "approved"
            ? <Check size={32} className="text-green-600" />
            : <X size={32} className="text-red-500" />}
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          {result.status === "approved" ? "Đã duyệt thành công" : "Đã từ chối"}
        </h2>
        {result.status === "approved" && (
          <p className="text-sm text-green-700 mb-1">Đã xác nhận <strong>{result.confirmedCount}</strong> thiết bị</p>
        )}
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => router.push(`/customers/${submission?.customerId}`)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition shadow-sm">
            <ArrowLeft size={14} /> Khách hàng
          </button>
          <button onClick={() => router.push("/agent-updates")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition">
            Danh sách
          </button>
        </div>
      </div>
    </div>
  );

  // Group devices by type
  const computerDevices = reviewData?.devices
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => ["computer","desktop","laptop","server","aio","tablet"].includes((d.parsed.deviceType as string) || "")) || [];
  const otherDevices = reviewData?.devices
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => !["computer","desktop","laptop","server","aio","tablet"].includes((d.parsed.deviceType as string) || "")) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-base font-semibold text-gray-900">Duyệt thiết bị</h1>
                <p className="text-[11px] text-gray-400">
                  {submission?.customerName && <>{submission.customerName} · </>}
                  {reviewData && <>{reviewData.devices.length} thiết bị</>}
                  {submission?.createdAt && <>({new Date(submission.createdAt).toLocaleString("vi-VN")})</>}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 bg-green-50 rounded-lg px-2.5 py-1.5">
                <Plus size={11} className="text-green-600" />
                <span className="text-green-700 font-medium">{stats.newCount}</span>
                <span className="text-green-500">Mới</span>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-50 rounded-lg px-2.5 py-1.5">
                <RefreshCwIcon size={11} />
                <span className="text-amber-700 font-medium">{stats.matched}</span>
                <span className="text-amber-500">Cập nhật</span>
              </div>
            </div>
          </div>

          {/* Selection controls */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-gray-500 hover:text-gray-700">
                <input type="checkbox" checked={selected.size === reviewData?.devices.length}
                  onChange={toggleAll}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                Chọn tất cả
              </label>
              <span className="text-gray-400">
                <strong className="text-gray-600">{selected.size}</strong>/{reviewData?.devices.length || 0} chọn
                {assignedCount > 0 && <> · <strong className="text-gray-600">{assignedCount}</strong> đã gán</>}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleReject} disabled={submitting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition disabled:opacity-50">
                <X size={12} /> Từ chối
              </button>
              <button onClick={handleApprove} disabled={selected.size === 0 || submitting}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition disabled:opacity-50 shadow-sm">
                {submitting ? "Đang xử lý..." : `Duyệt ${selected.size} thiết bị`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">{error}</div>
        )}

        {reviewData && (
          <>
            {/* Computers */}
            {computerDevices.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1 h-5 rounded-full bg-blue-500" />
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Máy tính</h2>
                  <span className="text-[10px] text-gray-300">{computerDevices.length} thiết bị</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {computerDevices.map(({ d, i }) => (
                    <DeviceCard
                      key={i} device={d} index={i} checked={selected.has(i)} onToggle={() => toggleDevice(i)}
                      employees={employees} assignedEmployeeId={assignments[i] ?? null}
                      onAssignmentChange={(empId) => handleAssignmentChange(i, empId)}
                      onAddEmployee={() => handleOpenAddEmployee(i)} />
                  ))}
                </div>
              </section>
            )}

            {/* Other devices */}
            {otherDevices.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1 h-5 rounded-full bg-amber-500" />
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Thiết bị khác</h2>
                  <span className="text-[10px] text-gray-300">{otherDevices.length} thiết bị</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {otherDevices.map(({ d, i }) => (
                    <DeviceCard
                      key={i} device={d} index={i} checked={selected.has(i)} onToggle={() => toggleDevice(i)}
                      employees={employees} assignedEmployeeId={null}
                      onAssignmentChange={() => {}}
                      onAddEmployee={() => {}} />
                  ))}
                </div>
              </section>
            )}

            {/* Pending parents warning */}
            {reviewData.pendingParents > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-800">
                  <strong>{reviewData.pendingParents} thiết bị</strong> chưa xác định được máy tính cha. Kiểm tra kỹ trước khi duyệt.
                </div>
              </div>
            )}
          </>
        )}

        {/* Bottom bar */}
        <div className="sticky bottom-4 z-10 bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span><strong className="text-gray-600">{selected.size}</strong>/{reviewData?.devices.length || 0} chọn</span>
            {assignedCount > 0 && <span><strong className="text-gray-600">{assignedCount}</strong> đã gán</span>}
            {stats.newCount > 0 && <span>+{stats.newCount} mới · {stats.matched} cập nhật</span>}
          </div>
          <button onClick={handleApprove} disabled={selected.size === 0 || submitting}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition shadow-sm">
            {submitting ? "Đang xử lý..." : <>Duyệt {selected.size} thiết bị <Check size={14} /></>}
          </button>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && submission?.customerId && (
        <AddEmployeeModal
          customerId={submission.customerId}
          onSave={handleEmployeeCreated}
          onClose={() => { setShowAddModal(false); setAddModalDeviceIdx(null); }} />
      )}
    </div>
  );
}
