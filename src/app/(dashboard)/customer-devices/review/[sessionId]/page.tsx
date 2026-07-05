"use client";

import { use, useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, X, AlertTriangle, Monitor, Printer, HelpCircle } from "lucide-react";

/* ===== Types ===== */

type MatchResult = {
  found: boolean;
  existingDeviceId: string | null;
  method: "serial" | "uuid" | "mac" | "hostname_model" | "none";
  confidence: "high" | "medium" | "low";
  existingDevice: Record<string, unknown> | null;
};

type ReviewDevice = {
  parsed: Record<string, unknown>;
  match: MatchResult;
};

type ReviewData = {
  parsedAt: string;
  devices: ReviewDevice[];
  pendingParents: number;
};

type SessionInfo = {
  id: string;
  token: string;
  customerId: string;
  status: string;
  createdAt: string;
  address: { id: string; label: string | null; address: string | null } | null;
};

/* ===== Helpers ===== */

function deviceIcon(type: string) {
  if (type === "computer" || type === "desktop" || type === "laptop" || type === "server" || type === "aio" || type === "tablet") return <Monitor size={14} />;
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
  const map: Record<string, string> = {
    serial: "Số serial",
    uuid: "BIOS UUID",
    mac: "Địa chỉ MAC",
    hostname_model: "Tên máy + Model",
    none: "Không tìm thấy",
  };
  return map[method] || method;
}

function deviceTypeLabel(type: string): string {
  const map: Record<string, string> = {
    computer: "Máy tính",
    desktop: "Desktop",
    laptop: "Laptop",
    server: "Server",
    aio: "All-in-One",
    tablet: "Máy tính bảng",
    monitor: "Màn hình",
    printer: "Máy in",
    peripheral: "Thiết bị ngoại vi",
    network: "Thiết bị mạng",
  };
  return map[type] || type;
}

function fmt(val: unknown): string {
  if (val === null || val === undefined || val === "") return "—";
  return String(val);
}

/* ===== Device Comparison Row ===== */

function DeviceRow({
  device,
  index,
  checked,
  onToggle,
}: {
  device: ReviewDevice;
  index: number;
  checked: boolean;
  onToggle: () => void;
}) {
  const { parsed, match } = device;
  const type = (parsed.deviceType as string) || "computer";
  const isComputer = ["computer", "desktop", "laptop", "server", "aio", "tablet"].includes(type);

  return (
    <div className={`rounded-lg border ${checked ? "border-blue-300 bg-blue-50/40" : "border-gray-200 bg-white"}`}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-gray-100">
        <input type="checkbox" checked={checked} onChange={onToggle}
          className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0" />
        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
          {deviceIcon(type)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-gray-900 truncate">{fmt(parsed.name)}</span>
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">{deviceTypeLabel(type)}</span>
            {match.found && (
              <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">
                Đã có — {methodLabel(match.method)}
              </span>
            )}
          </div>
          {isComputer && (
            <div className="text-[10px] text-gray-400 mt-0.5">
              {fmt(parsed.serialNumber)}
            </div>
          )}
        </div>
        <div className="shrink-0">
          {match.found ? confidenceBadge(match.confidence) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-green-700 bg-green-100">Mới</span>
          )}
        </div>
      </div>

      {/* Body: Comparison */}
      <div className="px-3 py-2.5 space-y-1.5">
        {isComputer ? (
          /* Computer: show all specs */
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
          /* Non-computer: show limited fields */
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

export default function ReviewPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ message: string; created: number; updated: number; skipped: number } | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customer-devices/review/${sessionId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setSession(json.session);
      setReviewData(json.reviewData);

      // Auto-select un-matched devices
      const initialSelected = new Set<number>();
      json.reviewData.devices.forEach((_: any, i: number) => initialSelected.add(i));
      setSelected(initialSelected);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Load on mount
  useEffect(() => { loadData(); }, []);

  // Toggle selection
  const toggleDevice = useCallback((index: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  // Select all / deselect all
  const selectAll = useCallback(() => {
    if (!reviewData) return;
    setSelected(new Set(reviewData.devices.map((_, i) => i)));
  }, [reviewData]);

  const deselectAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    if (!reviewData) return { total: 0, matched: 0, new: 0 };
    const total = reviewData.devices.length;
    const matched = reviewData.devices.filter(d => d.match.found).length;
    return { total, matched, new: total - matched };
  }, [reviewData]);

  // Submit approval
  const handleApprove = useCallback(async () => {
    if (!session || !reviewData || selected.size === 0) return;
    setSubmitting(true);
    try {
      const deviceIds = Array.from(selected).map(i => `${i}`);
      const res = await fetch(`/api/agent-inventory/${session.token}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceIds }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Confirm failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setResult({ message: json.message, created: json.created, updated: json.updated, skipped: json.skipped });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }, [session, reviewData, selected]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-sm text-gray-400">Đang tải dữ liệu...</div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <Check size={24} className="text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-green-800 mb-1">Đã xác nhận thành công</h2>
          <p className="text-sm text-green-700">{result.message}</p>
          <div className="flex items-center justify-center gap-4 mt-3 text-sm">
            <span className="text-green-600">Tạo mới: <strong>{result.created}</strong></span>
            <span className="text-green-600">Cập nhật: <strong>{result.updated}</strong></span>
            <span className="text-gray-400">Bỏ qua: <strong>{result.skipped}</strong></span>
          </div>
          <button onClick={() => router.push(`/customers/${session?.customerId}`)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition">
            <ArrowLeft size={14} />
            Quay lại khách hàng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="mb-4">
        <button onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition mb-2">
          <ArrowLeft size={12} />
          Quay lại
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Duyệt thiết bị thu thập</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Kiểm tra thông tin trước khi cập nhật vào hệ thống
              {reviewData && <span> · {reviewData.devices.length} thiết bị</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-600">Mới: <strong>{stats.new}</strong></span>
            <span className="text-gray-300">|</span>
            <span className="text-amber-600">Đã có: <strong>{stats.matched}</strong></span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button onClick={selectAll}
            className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2">
            Chọn tất cả
          </button>
          <span className="text-gray-200">|</span>
          <button onClick={deselectAll}
            className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2">
            Bỏ chọn
          </button>
          <span className="text-xs text-gray-400 ml-1">
            ({selected.size}/{reviewData?.devices.length || 0} đã chọn)
          </span>
        </div>
        <button onClick={handleApprove} disabled={selected.size === 0 || submitting}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-medium
            hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
          {submitting ? "Đang xử lý..." : `Xác nhận ${selected.size} thiết bị`}
        </button>
      </div>

      {/* Device list */}
      {reviewData && (
        <div className="space-y-2">
          {/* Computers first */}
          {reviewData.devices
            .map((d, i) => ({ d, i }))
            .filter(({ d }) => {
              const t = (d.parsed.deviceType as string) || "";
              return ["computer", "desktop", "laptop", "server", "aio", "tablet"].includes(t);
            })
            .map(({ d, i }) => (
              <DeviceRow key={i} device={d} index={i} checked={selected.has(i)} onToggle={() => toggleDevice(i)} />
            ))}

          {/* Separator if there are child devices */}
          {reviewData.devices.some(d => {
            const t = (d.parsed.deviceType as string) || "";
            return !["computer", "desktop", "laptop", "server", "aio", "tablet"].includes(t);
          }) && (
            <div className="pt-2 pb-1">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-[10px] text-gray-300 font-medium tracking-wider uppercase">Thiết bị khác</span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>
            </div>
          )}

          {/* Non-computer devices */}
          {reviewData.devices
            .map((d, i) => ({ d, i }))
            .filter(({ d }) => {
              const t = (d.parsed.deviceType as string) || "";
              return !["computer", "desktop", "laptop", "server", "aio", "tablet"].includes(t);
            })
            .map(({ d, i }) => (
              <DeviceRow key={i} device={d} index={i} checked={selected.has(i)} onToggle={() => toggleDevice(i)} />
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

      {/* Bottom actions */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-gray-400">
          {selected.size} / {reviewData?.devices.length || 0} thiết bị được chọn
        </div>
        <button onClick={handleApprove} disabled={selected.size === 0 || submitting}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-medium
            hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
          {submitting ? "Đang xử lý..." : `Xác nhận ${selected.size} thiết bị`}
        </button>
      </div>
    </div>
  );
}
