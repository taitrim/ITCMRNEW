"use client";

import { use, useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Check, X, AlertTriangle, Monitor, Printer, HelpCircle,
  ChevronDown, ChevronRight, UserPlus, Users, FileText
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
function deviceIcon(type: string) {
  if (["computer","desktop","laptop","server","aio","tablet"].includes(type)) return <Monitor size={14} />;
  if (type === "printer") return <Printer size={14} />;
  return <HelpCircle size={14} />;
}

function confidenceBadge(level: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    high: { label: "Cao", color: "text-green-700", bg: "bg-green-100" },
    medium: { label: "TB", color: "text-amber-700", bg: "bg-amber-100" },
    low: { label: "Thấp", color: "text-gray-500", bg: "bg-gray-100" },
  };
  const c = map[level] || map.low;
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${c.color} ${c.bg}`}>{c.label}</span>;
}

function methodLabel(method: string): string {
  const map: Record<string, string> = { serial: "Số serial", uuid: "BIOS UUID", mac: "Địa chỉ MAC", hostname_model: "Tên máy + Model", none: "Không tìm thấy" };
  return map[method] || method;
}

function deviceTypeLabel(type: string): string {
  const map: Record<string, string> = {
    computer: "Máy tính", desktop: "Desktop", laptop: "Laptop", server: "Server",
    aio: "All-in-One", tablet: "Máy tính bảng", monitor: "Màn hình", printer: "Máy in",
    peripheral: "Ngoại vi", network: "Thiết bị mạng",
  };
  return map[type] || type;
}

function fmt(val: unknown): string {
  if (val === null || val === undefined || val === "") return "—";
  return String(val);
}

/* ===== New Employee Inline Form ===== */
function NewEmployeeForm({
  onSave,
  onCancel,
}: {
  onSave: (data: { firstName: string; lastName: string; email?: string; phone?: string; position?: string; department?: string }) => void;
  onCancel: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");

  return (
    <div className="mt-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-[10px] text-gray-400">Tên</label>
          <input value={firstName} onChange={e => setFirstName(e.target.value)}
            className="w-full px-2 py-1 text-[11px] border border-gray-200 rounded focus:outline-none focus:border-blue-400" />
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-gray-400">Họ</label>
          <input value={lastName} onChange={e => setLastName(e.target.value)}
            className="w-full px-2 py-1 text-[11px] border border-gray-200 rounded focus:outline-none focus:border-blue-400" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-[10px] text-gray-400">Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)}
            className="w-full px-2 py-1 text-[11px] border border-gray-200 rounded focus:outline-none focus:border-blue-400" />
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-gray-400">SĐT</label>
          <input value={phone} onChange={e => setPhone(e.target.value)}
            className="w-full px-2 py-1 text-[11px] border border-gray-200 rounded focus:outline-none focus:border-blue-400" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-[10px] text-gray-400">Chức vụ</label>
          <input value={position} onChange={e => setPosition(e.target.value)}
            className="w-full px-2 py-1 text-[11px] border border-gray-200 rounded focus:outline-none focus:border-blue-400" />
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-gray-400">Phòng ban</label>
          <input value={department} onChange={e => setDepartment(e.target.value)}
            className="w-full px-2 py-1 text-[11px] border border-gray-200 rounded focus:outline-none focus:border-blue-400" />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <button onClick={onCancel}
          className="px-2.5 py-1 text-[10px] text-gray-500 hover:text-gray-700">Huỷ</button>
        <button onClick={() => onSave({ firstName, lastName, email: email || undefined, phone: phone || undefined, position: position || undefined, department: department || undefined })}
          disabled={!firstName}
          className="px-2.5 py-1 text-[10px] font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50">
          Tạo & gán
        </button>
      </div>
    </div>
  );
}

/* ===== Printer Detail Panel ===== */
function PrinterDetailPanel({ componentsJson }: { componentsJson: string }) {
  let data: any = null;
  try { data = JSON.parse(componentsJson); } catch { return null; }
  if (!data) return null;

  // Use _extracted data from enhanced parser, fallback to raw fields
  const ext = data._extracted;
  const name = data.name || "";
  const manufacturer = ext?.manufacturer || data.manufacturer || "";
  const modelName = ext?.modelName || data.model || "";
  const serial = data.serial || "";
  const port = data.port || "";
  const driver = ext?.driver || data.driver || "";
  const isColor = ext?.isColor ?? data.color ?? null;
  const isDuplex = ext?.isDuplex ?? data.duplex ?? null;
  const resolution = ext?.resolution || data.resolution || "";
  const pageTotal = ext?.pageTotal ?? data.pages_total ?? data.pages ?? null;
  const isNetwork = data.network === true;
  const isShared = data.shared === true;
  const status = data.status || "";
  const location = data.location || "";

  return (
    <div className="space-y-2 text-[11px]">
      {/* Header */}
      <div className="flex items-center gap-2 text-gray-700 font-medium">
        <Printer size={14} />
        <span>{manufacturer ? `${manufacturer} ${modelName}` : name}</span>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 bg-gray-50 rounded-lg p-3">
        <DetailRow label="Tên máy in" value={name} />
        {serial && <DetailRow label="Serial" value={serial} />}
        {manufacturer && <DetailRow label="Hãng" value={manufacturer} />}
        {modelName && <DetailRow label="Model" value={modelName} />}
        {port && <DetailRow label="Cổng" value={port} />}
        {driver && <DetailRow label="Driver" value={driver.replace(/\\n/g, "; ")} />}
        {status && <DetailRow label="Trạng thái" value={status} />}
        {location && <DetailRow label="Vị trí" value={location} />}
        <DetailRow label="Màu sắc" value={isColor === true ? "Có" : isColor === false ? "Không" : "—"} />
        <DetailRow label="In 2 mặt" value={isDuplex === true ? "Có" : isDuplex === false ? "Không" : "—"} />
        {resolution && <DetailRow label="Độ phân giải" value={`${resolution} dpi`} />}
        {pageTotal !== null && pageTotal !== undefined && (
          <DetailRow label="Đã in" value={`${Number(pageTotal).toLocaleString()} trang`} />
        )}
        <DetailRow label="Kết nối" value={isNetwork ? "Mạng" : "Cục bộ"} />
        {isShared && <DetailRow label="Chia sẻ" value="Có" />}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-gray-400 w-20 shrink-0">{label}</span>
      <span className="text-gray-700 truncate">{value}</span>
    </div>
  );
}

/* ===== Employee Assignment UI ===== */
function EmployeeAssignment({
  deviceId,
  deviceName,
  employees,
  assignedEmployeeId,
  newEmployeeFirstName,
  onChange,
  onStartNew,
  onCancelNew,
  onNewEmployeeSave,
  showNewForm,
}: {
  deviceId: string;
  deviceName: string;
  employees: Employee[];
  assignedEmployeeId: string | null;
  newEmployeeFirstName: string | null;
  onChange: (employeeId: string | null) => void;
  onStartNew: () => void;
  onCancelNew: () => void;
  onNewEmployeeSave: (data: { firstName: string; lastName: string; email?: string; phone?: string; position?: string; department?: string }) => void;
  showNewForm: boolean;
}) {
  return (
    <div className="border-t border-gray-100 px-3 py-2">
      <div className="flex items-center gap-2">
        <Users size={12} className="text-gray-400 shrink-0" />
        <span className="text-[10px] text-gray-400 w-14 shrink-0">Gán cho</span>
        <select
          value={assignedEmployeeId || ""}
          onChange={e => onChange(e.target.value || null)}
          className="flex-1 px-2 py-1 text-[11px] border border-gray-200 rounded bg-white focus:outline-none focus:border-blue-400"
        >
          <option value="">— Chưa gán —</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>
              {emp.lastName} {emp.firstName}{emp.position ? ` (${emp.position})` : ""}
            </option>
          ))}
        </select>
        <button onClick={onStartNew}
          className="px-2 py-1 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition flex items-center gap-1">
          <UserPlus size={11} /> NV mới
        </button>
      </div>

      {newEmployeeFirstName && (
        <div className="mt-1.5 text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded">
          <Check size={10} className="inline mr-1" />
          Sẽ tạo nhân viên: <strong>{newEmployeeFirstName}</strong>
        </div>
      )}

      {showNewForm && (
        <NewEmployeeForm onSave={onNewEmployeeSave} onCancel={onCancelNew} />
      )}
    </div>
  );
}

/* ===== Device Row ===== */
function DeviceRow({
  device, index, checked, onToggle,
  employees, assignedEmployeeId, newEmployeeInfo,
  showNewForm, onAssignmentChange, onStartNewEmployee, onCancelNewEmployee, onNewEmployeeSave,
}: {
  device: ReviewDevice; index: number; checked: boolean; onToggle: () => void;
  employees: Employee[];
  assignedEmployeeId: string | null;
  newEmployeeInfo: { firstName: string } | null;
  showNewForm: boolean;
  onAssignmentChange: (employeeId: string | null) => void;
  onStartNewEmployee: () => void;
  onCancelNewEmployee: () => void;
  onNewEmployeeSave: (data: { firstName: string; lastName: string; email?: string; phone?: string; position?: string; department?: string }) => void;
}) {
  const { parsed, match } = device;
  const type = (parsed.deviceType as string) || "computer";
  const isComputer = ["computer","desktop","laptop","server","aio","tablet"].includes(type);
  const [showFullInv, setShowFullInv] = useState(false);
  const componentsJson = parsed.componentsJson as string | undefined;
  const deviceId = String(parsed.deviceId || index);

  const employeeLabel = assignedEmployeeId
    ? employees.find(e => e.id === assignedEmployeeId)
      ? `${employees.find(e => e.id === assignedEmployeeId)!.lastName} ${employees.find(e => e.id === assignedEmployeeId)!.firstName}`
      : "Đã chọn"
    : newEmployeeInfo ? `Mới: ${newEmployeeInfo.firstName}` : null;

  return (
    <div className={`rounded-lg border ${checked ? "border-blue-300 bg-blue-50/40" : "border-gray-200 bg-white"}`}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-gray-100">
        <input type="checkbox" checked={checked} onChange={onToggle}
          className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0" />
        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">{deviceIcon(type)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-gray-900 truncate">{fmt(parsed.name)}</span>
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">{deviceTypeLabel(type)}</span>
            <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">Agent</span>
            {match.found && (
              <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">
                Đã có — {methodLabel(match.method)}
              </span>
            )}
          </div>
          {isComputer && <div className="text-[10px] text-gray-400 mt-0.5">{fmt(parsed.serialNumber)}</div>}
          {employeeLabel && (
            <div className="text-[10px] text-blue-600 mt-0.5">
              <Users size={10} className="inline mr-0.5" />
              {employeeLabel}
            </div>
          )}
        </div>
        <div className="shrink-0">
          {match.found ? confidenceBadge(match.confidence) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-green-700 bg-green-100">Mới</span>
          )}
        </div>
      </div>

      {/* Specs */}
      <div className="px-3 py-2.5 space-y-1.5">
        {isComputer ? (
          <>
            <SpecRow label="Hãng" left={parsed.manufacturer} right={match.existingDevice?.manufacturer} />
            <SpecRow label="Model" left={parsed.modelName} right={match.existingDevice?.modelName} />
            <SpecRow label="Serial" left={parsed.serialNumber} right={match.existingDevice?.serialNumber} />
            <SpecRow label="IP" left={parsed.ipAddress} right={match.existingDevice?.ipAddress} />
            <SpecRow label="MAC" left={parsed.macAddress} right={match.existingDevice?.macAddress} />
            <SpecRow label="CPU" left={parsed.cpu} right={match.existingDevice?.cpu} />
            <SpecRow label="RAM" left={parsed.ram} right={match.existingDevice?.ram} />
            <SpecRow label="Ổ đĩa" left={parsed.disk} right={match.existingDevice?.disk} />
            <SpecRow label="HĐH" left={parsed.os} right={match.existingDevice?.os} />
          </>
        ) : (
          <>
            <SpecRow label="Hãng" left={parsed.manufacturer} right={match.existingDevice?.manufacturer} />
            <SpecRow label="Model" left={parsed.modelName} right={match.existingDevice?.modelName} />
            <SpecRow label="Serial" left={parsed.serialNumber} right={match.existingDevice?.serialNumber} />
          </>
        )}
      </div>

      {/* Components / Printer details */}
      {componentsJson && type === "printer" && (
        <div className="border-t border-gray-100">
          <button onClick={() => setShowFullInv(!showFullInv)}
            className="flex items-center gap-1.5 w-full px-3 py-2 text-[11px] text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors">
            {showFullInv ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {showFullInv ? "Ẩn chi tiết máy in" : "Xem chi tiết máy in"}
          </button>
          {showFullInv && (
            <div className="px-3 pb-3">
              <PrinterDetailPanel componentsJson={componentsJson} />
            </div>
          )}
        </div>
      )}
      {componentsJson && isComputer && (
        <div className="border-t border-gray-100">
          <button onClick={() => setShowFullInv(!showFullInv)}
            className="flex items-center gap-1.5 w-full px-3 py-2 text-[11px] text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors">
            {showFullInv ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {showFullInv ? "Ẩn chi tiết linh kiện" : "Xem chi tiết linh kiện đầy đủ"}
          </button>
          {showFullInv && (
            <div className="px-3 pb-3">
              <DeviceComponentsPanel componentsJson={componentsJson} />
            </div>
          )}
        </div>
      )}

      {/* Employee Assignment */}
      {checked && (
        <EmployeeAssignment
          deviceId={deviceId}
          deviceName={fmt(parsed.name)}
          employees={employees}
          assignedEmployeeId={assignedEmployeeId}
          newEmployeeFirstName={newEmployeeInfo?.firstName || null}
          onChange={onAssignmentChange}
          onStartNew={onStartNewEmployee}
          onCancelNew={onCancelNewEmployee}
          onNewEmployeeSave={onNewEmployeeSave}
          showNewForm={showNewForm}
        />
      )}
    </div>
  );
}

function SpecRow({ label, left, right }: { label: string; left: unknown; right: unknown }) {
  const l = fmt(left);
  const r = fmt(right);
  const changed = l !== r && right !== null && right !== undefined && right !== "";
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-400 w-10 shrink-0">{label}</span>
      <span className={`text-[11px] flex-1 min-w-0 truncate ${changed ? "text-blue-600" : "text-gray-600"}`}>{l}</span>
      {right !== null && right !== undefined && right !== "" && (
        <>
          <span className="text-[10px] text-gray-300">→</span>
          <span className={`text-[11px] flex-1 min-w-0 truncate ${changed ? "text-amber-600 line-through" : "text-gray-400"}`}>{r}</span>
        </>
      )}
      <div className="w-4 shrink-0 flex items-center justify-center">
        {changed ? <X size={10} className="text-amber-500" /> : l === r ? <Check size={10} className="text-green-400" /> : null}
      </div>
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

  // Assignment state: deviceIndex -> assigned employee id | null
  const [assignments, setAssignments] = useState<Record<number, string | null>>({});
  // New employee state: deviceIndex -> employee data to create
  const [newEmployees, setNewEmployees] = useState<Record<number, {
    firstName: string; lastName: string; email?: string; phone?: string; position?: string; department?: string;
  }>>({});
  // Which device index is showing the new employee form
  const [showNewFormFor, setShowNewFormFor] = useState<number | null>(null);

  // Load submission + employees
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subRes] = await Promise.all([
        fetch(`/api/agent-inventory/submissions/${id}`),
      ]);
      if (!subRes.ok) throw new Error((await subRes.json().catch(() => ({ error: "Lỗi" }))).error || `HTTP ${subRes.status}`);
      const subJson = await subRes.json();
      setSubmission(subJson.data);
      const rd = subJson.data.reviewData;
      setReviewData(rd);

      // Load employees for this customer
      if (subJson.data.customerId) {
        const empRes = await fetch(`/api/customer-employees?customerId=${subJson.data.customerId}`);
        if (empRes.ok) {
          const empJson = await empRes.json();
          setEmployees(empJson.data || []);
        }
      }

      // Auto-select all devices
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

  const stats = useMemo(() => {
    if (!reviewData) return { total: 0, matched: 0, new: 0 };
    const total = reviewData.devices.length;
    const matched = reviewData.devices.filter(d => d.match.found).length;
    return { total, matched, new: total - matched };
  }, [reviewData]);

  // Assignment handlers
  const handleAssignmentChange = useCallback((index: number, employeeId: string | null) => {
    setAssignments(prev => ({ ...prev, [index]: employeeId }));
    // If switching back to existing employee, clear new employee data for this device
    if (employeeId) {
      setNewEmployees(prev => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    }
  }, []);

  const handleStartNewEmployee = useCallback((index: number) => {
    setShowNewFormFor(index);
  }, []);

  const handleCancelNewEmployee = useCallback(() => {
    setShowNewFormFor(null);
  }, []);

  const handleNewEmployeeSave = useCallback((index: number, data: {
    firstName: string; lastName: string; email?: string; phone?: string; position?: string; department?: string;
  }) => {
    setNewEmployees(prev => ({ ...prev, [index]: data }));
    setAssignments(prev => ({ ...prev, [index]: null })); // Clear existing assignment
    setShowNewFormFor(null);
  }, []);

  // Approve — send assignments + newEmployees
  const handleApprove = useCallback(async () => {
    if (!submission || !reviewData || selected.size === 0) return;
    setSubmitting(true);
    try {
      const deviceIds = Array.from(selected).map(i => String(reviewData.devices[i].parsed.deviceId || i));

      // Build assignments map using deviceId strings
      const assignmentsMap: Record<string, string | null> = {};
      const newEmployeesMap: Record<string, {
        firstName: string; lastName: string; email?: string; phone?: string; position?: string; department?: string;
      }> = {};

      for (const i of selected) {
        const devId = String(reviewData.devices[i].parsed.deviceId || i);

        // If there's a new employee for this device, include in newEmployees
        if (newEmployees[i]) {
          newEmployeesMap[devId] = newEmployees[i];
        } else if (assignments[i] !== undefined) {
          assignmentsMap[devId] = assignments[i];
        }
      }

      const body: Record<string, unknown> = { action: "approve", selectedDevices: deviceIds };
      if (Object.keys(assignmentsMap).length > 0) body.assignments = assignmentsMap;
      if (Object.keys(newEmployeesMap).length > 0) body.newEmployees = newEmployeesMap;

      const res = await fetch(`/api/agent-inventory/submissions/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      const json = await res.json();
      setResult(json.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }, [submission, reviewData, selected, id, assignments, newEmployees]);

  // Reject
  const handleReject = useCallback(async () => {
    if (!confirm("Từ chối toàn bộ dữ liệu này?")) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/agent-inventory/submissions/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      const json = await res.json();
      setResult(json.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }, [id]);

  // Count assignments
  const assignedCount = useMemo(() => {
    let count = 0;
    for (const i of selected) {
      if (assignments[i] || newEmployees[i]) count++;
    }
    return count;
  }, [selected, assignments, newEmployees]);

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="text-sm text-gray-400">Đang tải...</div></div>;

  if (error && !submission) return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
    </div>
  );

  if (result) return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
          {result.status === "approved" ? <Check size={24} className="text-green-600" /> : <X size={24} className="text-red-500" />}
        </div>
        <h2 className="text-lg font-semibold text-green-800 mb-1">
          {result.status === "approved" ? "Đã duyệt thành công" : "Đã từ chối"}
        </h2>
        {result.status === "approved" && (
          <p className="text-sm text-green-700">Đã xác nhận {result.confirmedCount} thiết bị</p>
        )}
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={() => router.push(`/customers/${submission?.customerId}`)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition">
            <ArrowLeft size={14} /> Quay lại khách hàng
          </button>
          <button onClick={() => router.push("/agent-updates")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition">
            Danh sách
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="mb-4">
        <button onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition mb-2">
          <ArrowLeft size={12} /> Quay lại
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Duyệt thiết bị từ Agent</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {submission?.customerName && <>Khách hàng: <strong>{submission.customerName}</strong> · </>}
              {reviewData && <>{reviewData.devices.length} thiết bị</>}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-600">Mới: <strong>{stats.new}</strong></span>
            <span className="text-gray-300">|</span>
            <span className="text-amber-600">Đã có: <strong>{stats.matched}</strong></span>
          </div>
        </div>
      </div>

      {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}

      {/* Controls */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400">
          ({selected.size}/{reviewData?.devices.length || 0} đã chọn
          {assignedCount > 0 && <> · {assignedCount} đã gán</>})
        </span>
        <div className="flex items-center gap-2">
          <button onClick={handleReject} disabled={submitting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition disabled:opacity-50">
            <X size={12} /> Từ chối tất cả
          </button>
          <button onClick={handleApprove} disabled={selected.size === 0 || submitting}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 disabled:opacity-50 transition">
            {submitting ? "Đang xử lý..." : `Xác nhận ${selected.size} thiết bị`}
          </button>
        </div>
      </div>

      {/* Device list */}
      {reviewData && (
        <div className="space-y-2">
          {/* Computers first */}
          {reviewData.devices
            .map((d, i) => ({ d, i }))
            .filter(({ d }) => ["computer","desktop","laptop","server","aio","tablet"].includes((d.parsed.deviceType as string) || ""))
            .map(({ d, i }) => (
              <DeviceRow
                key={i} device={d} index={i} checked={selected.has(i)} onToggle={() => toggleDevice(i)}
                employees={employees}
                assignedEmployeeId={assignments[i] ?? null}
                newEmployeeInfo={newEmployees[i] ? { firstName: newEmployees[i].firstName } : null}
                showNewForm={showNewFormFor === i}
                onAssignmentChange={(empId) => handleAssignmentChange(i, empId)}
                onStartNewEmployee={() => handleStartNewEmployee(i)}
                onCancelNewEmployee={handleCancelNewEmployee}
                onNewEmployeeSave={(data) => handleNewEmployeeSave(i, data)}
              />
            ))}

          {/* Separator */}
          {reviewData.devices.some(d => !["computer","desktop","laptop","server","aio","tablet"].includes((d.parsed.deviceType as string) || "")) && (
            <div className="pt-2 pb-1">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-[10px] text-gray-300 font-medium tracking-wider uppercase">Thiết bị khác</span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>
            </div>
          )}

          {/* Non-computer */}
          {reviewData.devices
            .map((d, i) => ({ d, i }))
            .filter(({ d }) => !["computer","desktop","laptop","server","aio","tablet"].includes((d.parsed.deviceType as string) || ""))
            .map(({ d, i }) => (
              <DeviceRow
                key={i} device={d} index={i} checked={selected.has(i)} onToggle={() => toggleDevice(i)}
                employees={employees}
                assignedEmployeeId={assignments[i] ?? null}
                newEmployeeInfo={newEmployees[i] ? { firstName: newEmployees[i].firstName } : null}
                showNewForm={showNewFormFor === i}
                onAssignmentChange={(empId) => handleAssignmentChange(i, empId)}
                onStartNewEmployee={() => handleStartNewEmployee(i)}
                onCancelNewEmployee={handleCancelNewEmployee}
                onNewEmployeeSave={(data) => handleNewEmployeeSave(i, data)}
              />
            ))}
        </div>
      )}

      {/* Pending parents warning */}
      {reviewData && reviewData.pendingParents > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-800">
            <strong>{reviewData.pendingParents} thiết bị</strong> có thể chưa được gán đúng máy tính cha (parent).
            Kiểm tra kỹ trước khi xác nhận.
          </div>
        </div>
      )}

      {/* Bottom */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {selected.size} / {reviewData?.devices.length || 0} thiết bị chọn
          {assignedCount > 0 && <> · {assignedCount} đã gán</>}
        </span>
        <button onClick={handleApprove} disabled={selected.size === 0 || submitting}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 disabled:opacity-50 transition">
          {submitting ? "Đang xử lý..." : `Xác nhận ${selected.size} thiết bị`}
        </button>
      </div>
    </div>
  );
}
