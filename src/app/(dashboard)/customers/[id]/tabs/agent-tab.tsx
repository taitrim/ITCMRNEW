"use client";

import { useEffect, useState } from "react";
import { Download, Key, RefreshCw, Eye, EyeOff, Check, AlertCircle, Loader2, Clock, Monitor, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type AgentInfo = {
  agentKey: string;
  agentEnabled: boolean;
  name: string;
};

function detectOS(): string {
  if (typeof navigator === "undefined") return "windows";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("linux")) return "linux";
  if (ua.includes("mac") || ua.includes("darwin")) return "mac";
  return "windows";
}

export function AgentTab({ customerId }: { customerId: string }) {
  const [info, setInfo] = useState<AgentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [downloadMode, setDownloadMode] = useState<"glpi" | "simple">("glpi");
  const [downloadOS, setDownloadOS] = useState<string>(detectOS());

  const fetchInfo = () => {
    fetch(`/api/customers/${customerId}`)
      .then((r) => r.json())
      .then((d) => setInfo(d))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchInfo(); }, [customerId]);

  const regenerate = async () => {
    if (!confirm("Tạo key mới sẽ làm mất hiệu lực script Agent cũ. Tiếp tục?")) return;
    setRegenerating(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/customers/${customerId}/regenerate-key`, { method: "POST" });
      const d = await r.json();
      if (d.error) { setMsg({ type: "error", text: d.error }); return; }
      setMsg({ type: "success", text: "Đã tạo key mới!" });
      fetchInfo();
    } catch { setMsg({ type: "error", text: "Lỗi kết nối" }); }
    finally { setRegenerating(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={20} className="animate-spin text-gray-400" />
    </div>
  );

  if (!info) return (
    <p className="text-sm text-muted-foreground text-center pt-10">Không tải được thông tin</p>
  );

  const downloadUrl = `/api/agent-inventory/download/${customerId}?mode=${downloadMode}&os=${downloadOS}`;

  return (
    <div className="space-y-3">
      {/* Trạng thái Agent */}
      <div className="bg-white rounded-xl border border-border/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Cấu hình Agent</h3>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-medium",
            info.agentEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          )}>
            {info.agentEnabled ? "Đã bật" : "Đã tắt"}
          </span>
        </div>

        {/* Agent Key */}
        <div className="mb-3">
          <label className="text-[10px] text-gray-500 font-medium">Agent Key</label>
          <div className="flex items-center gap-1 mt-1">
            <div className="flex-1 flex items-center gap-2 h-8 px-2.5 rounded-lg border border-gray-200 bg-gray-50 font-mono text-xs">
              <Key size={12} className="text-gray-400 flex-shrink-0" />
              <span className="truncate text-gray-700">
                {showKey ? info.agentKey : `${info.agentKey.substring(0, 12)}••••••••`}
              </span>
            </div>
            <button
              onClick={() => setShowKey(!showKey)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              title={showKey ? "Ẩn key" : "Hiện key"}
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button
              onClick={regenerate}
              disabled={regenerating}
              className="flex items-center gap-1 h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50"
              title="Tạo key mới"
            >
              <RefreshCw size={12} className={regenerating ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Tạo mới</span>
            </button>
          </div>
        </div>

        {/* Thông báo */}
        {msg && (
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs",
            msg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
          )}>
            {msg.type === "success" ? <Check size={12} /> : <AlertCircle size={12} />}
            {msg.text}
          </div>
        )}
      </div>

      {/* Tải Script Agent */}
      <div className="bg-white rounded-xl border border-border/50 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Tải Agent Script</h3>
        <p className="text-[11px] text-muted-foreground mb-3">
          Script chạy trên máy tính tại khách hàng để thu thập thông tin thiết bị. Kết quả sẽ được gửi về CRM để xem xét.
        </p>

        {info.agentEnabled ? (
          <div className="space-y-3">
            {/* Chọn chế độ thu thập */}
            <div>
              <label className="text-[10px] text-gray-500 font-medium">Chế độ thu thập</label>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setDownloadMode("glpi")}
                  className={cn(
                    "flex-1 h-8 rounded-lg border text-xs font-medium transition-colors",
                    downloadMode === "glpi"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  )}
                >
                  Đầy đủ (GLPI Agent)
                </button>
                <button
                  onClick={() => setDownloadMode("simple")}
                  className={cn(
                    "flex-1 h-8 rounded-lg border text-xs font-medium transition-colors",
                    downloadMode === "simple"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  )}
                >
                  Nhanh (PowerShell)
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {downloadMode === "glpi"
                  ? "Tải GLPI Agent — đầy đủ (CPU, RAM, disk, network, software, users). Cần internet."
                  : "Chạy PowerShell — nhanh, không cần tải thêm. Ít thông tin hơn."}
              </p>
            </div>

            {/* Chọn hệ điều hành */}
            {downloadMode === "glpi" && (
              <div>
                <label className="text-[10px] text-gray-500 font-medium">Hệ điều hành máy đích</label>
                <div className="flex gap-2 mt-1">
                  {(["windows", "linux", "mac"] as const).map((o) => (
                    <button
                      key={o}
                      onClick={() => setDownloadOS(o)}
                      className={cn(
                        "h-8 px-3 rounded-lg border text-xs font-medium transition-colors",
                        downloadOS === o
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      )}
                    >
                      {o === "windows" ? "Windows" : o === "linux" ? "Linux" : "macOS"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Nút tải */}
            <a
              href={downloadUrl}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <Download size={14} />
              Tải Script
            </a>
            <p className="text-[10px] text-muted-foreground">
              {downloadMode === "glpi"
                ? "Script tự động tải GLPI Agent, chạy kiểm kê và gửi JSON về CRM."
                : "Chạy file .bat với quyền Administrator."}
            </p>
          </div>
        ) : (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
            Agent chưa được bật cho khách hàng này. Bật trong phần sửa thông tin để cho phép thu thập.
          </p>
        )}
      </div>

      {/* Hướng dẫn */}
      <div className="bg-white rounded-xl border border-border/50 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Hướng dẫn</h3>
        <ol className="space-y-1.5 text-xs text-gray-600 list-decimal list-inside">
          <li>Nhấn <strong>Tải Script</strong> để tải file script chạy trên máy khách</li>
          <li>Chép file <code className="bg-gray-100 px-1 rounded text-[10px]">.bat</code> hay <code className="bg-gray-100 px-1 rounded text-[10px]">.sh</code> sang máy cần thu thập</li>
          <li>Chạy với quyền <strong>Administrator</strong> (Windows) hoặc <strong>root</strong> (Linux/macOS)</li>
          <li>Chế độ <strong>Đầy đủ</strong>: Script tự động tải GLPI Agent, chạy kiểm kê và gửi JSON về CRM</li>
          <li>Chế độ <strong>Nhanh</strong>: Dùng PowerShell thuần, không cần tải thêm. Ít thông tin chi tiết hơn</li>
          <li>Kết quả hiện ở tab <strong>Cập nhật Agent</strong> để duyệt</li>
        </ol>
      </div>

      {/* Lịch sử thu thập */}
      <SubmissionHistory customerId={customerId} />
    </div>
  );
}

/* ===== Submission History ===== */
function SubmissionHistory({ customerId }: { customerId: string }) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/agent-inventory/submissions?customerId=${customerId}`)
      .then(r => r.json())
      .then(d => setSubmissions(d.data || []))
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) return null;

  if (submissions.length === 0) return null;

  const statusCfg: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: "Chờ duyệt", color: "text-purple-700", bg: "bg-purple-100" },
    approved: { label: "Đã duyệt", color: "text-green-700", bg: "bg-green-100" },
    rejected: { label: "Từ chối", color: "text-red-700", bg: "bg-red-100" },
  };

  return (
    <div className="bg-white rounded-xl border border-border/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock size={14} className="text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-900">Lịch sử thu thập</h3>
        <span className="text-[10px] text-gray-400 ml-auto">{submissions.length} lần</span>
      </div>

      <div className="space-y-1.5">
        {submissions.slice(0, 10).map((s: any) => {
          const cfg = statusCfg[s.status] || statusCfg.pending;
          return (
            <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                <Monitor size={13} className={cfg.color} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${cfg.color} ${cfg.bg}`}>
                    {cfg.label}
                  </span>
                  {s.deviceCount > 0 && (
                    <span className="text-[10px] text-gray-500">{s.deviceCount} thiết bị mới</span>
                  )}
                  {s.deviceCount === 0 && s.status === "approved" && (
                    <span className="text-[10px] text-blue-500">Tự động cập nhật</span>
                  )}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(s.createdAt).toLocaleDateString("vi-VN", {
                    day: "2-digit", month: "2-digit", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </div>
              </div>
              <ChevronRight size={13} className="text-gray-300" />
            </div>
          );
        })}
      </div>

      {submissions.length > 10 && (
        <div className="mt-2 text-center">
          <a href="/agent-updates" className="text-[10px] text-blue-600 hover:underline">
            Xem tất cả {submissions.length} lần thu thập →
          </a>
        </div>
      )}
    </div>
  );
}
