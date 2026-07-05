"use client";

import { use, useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, X, AlertTriangle, Monitor, Printer, HelpCircle } from "lucide-react";

/* ===== Types (same as old review) ===== */
type MatchResult = {
  found: boolean;
  existingDeviceId: string | null;
  method: "serial" | "uuid" | "mac" | "hostname_model" | "none";
  confidence: "high" | "medium" | "low";
  existingDevice: Record<string, unknown> | null;
};
type ReviewDevice = { parsed: Record<string, unknown>; match: MatchResult };
type ReviewData = { parsedAt: string; devices: ReviewDevice[]; pendingParents: number };

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

/* ===== Comparison Row ===== */
function DeviceRow({ device, index, checked, onToggle }: {
  device: ReviewDevice; index: number; checked: boolean; onToggle: () => void;
}) {
  const { parsed, match } = device;
  const type = (parsed.deviceType as string) || "computer";
  const isComputer = ["computer","desktop","laptop","server","aio","tablet"].includes(type);

  return (
    <div className={`rounded-lg border ${checked ? "border-blue-300 bg-blue-50/40" : "border-gray-200 bg-white"}`}>
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
        </div>
        <div className="shrink-0">
          {match.found ? confidenceBadge(match.confidence) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-green-700 bg-green-100">Mới</span>
          )}
        </div>
      </div>

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ status: string; confirmedCount: number } | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agent-inventory/submissions/${id}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({ error: "Lỗi" }))).error || `HTTP ${res.status}`);
      const json = await res.json();
      setSubmission(json.data);
      const rd = json.data.reviewData;
      setReviewData(rd);

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

  // Approve
  const handleApprove = useCallback(async () => {
    if (!submission || !reviewData || selected.size === 0) return;
    setSubmitting(true);
    try {
      const deviceIds = Array.from(selected).map(i => String(reviewData.devices[i].parsed.deviceId || i));
      const res = await fetch(`/api/agent-inventory/submissions/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", selectedDevices: deviceIds }),
      });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      const json = await res.json();
      setResult(json.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }, [submission, reviewData, selected, id]);

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
          ({selected.size}/{reviewData?.devices.length || 0} đã chọn)
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
            .map(({ d, i }) => <DeviceRow key={i} device={d} index={i} checked={selected.has(i)} onToggle={() => toggleDevice(i)} />)}

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
            .map(({ d, i }) => <DeviceRow key={i} device={d} index={i} checked={selected.has(i)} onToggle={() => toggleDevice(i)} />)}
        </div>
      )}

      {/* Pending parents warning */}
      {reviewData && reviewData.pendingParents > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-800">
            <strong>{reviewData.pendingParents} thiết bị</strong> có thể chưa được gán đúng máy tính cha (parent).
          </div>
        </div>
      )}

      {/* Bottom */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-400">{selected.size} / {reviewData?.devices.length || 0} thiết bị chọn</span>
        <button onClick={handleApprove} disabled={selected.size === 0 || submitting}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 disabled:opacity-50 transition">
          {submitting ? "Đang xử lý..." : `Xác nhận ${selected.size} thiết bị`}
        </button>
      </div>
    </div>
  );
}
