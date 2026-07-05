"use client";

import { useEffect, useState } from "react";
import { Plus, Copy, Check, RefreshCw, Download, Clock, Package } from "lucide-react";
import { cn } from "@/lib/utils";

/* ===== Types ===== */
type Session = {
  id: string;
  token: string;
  status: "pending" | "active" | "data_received" | "completed" | "failed";
  deviceCount: number;
  collectedById: string | null;
  expiresAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  address: { id: string; label: string | null; address: string | null } | null;
  reviewData: string | null;
  _count: { devices: number };
};

let addressCache: Array<{ id: string; label: string | null; address: string | null; city: string | null }> = [];

/* ===== Main Component ===== */
export function SessionsTab({ customerId }: { customerId: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadSessions = () => {
    fetch(`/api/customers/${customerId}/collection-sessions`)
      .then(r => r.json())
      .then(d => { setSessions(Array.isArray(d) ? d : []); setLoading(false); });
    fetch(`/api/customers/${customerId}/addresses`)
      .then(r => r.json())
      .then(d => { addressCache = Array.isArray(d) ? d : []; });
  };

  useEffect(() => { loadSessions(); }, [customerId]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-700">Phiên thu thập thiết bị</h3>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 text-xs text-primary font-medium">
          <Plus size={14} />Tạo phiên mới
        </button>
      </div>

      {showCreate && (
        <CreateSessionForm
          customerId={customerId}
          addresses={addressCache}
          onDone={() => { setShowCreate(false); loadSessions(); }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-3xl">📋</span>
          <p className="text-sm text-gray-500 mt-2">Chưa có phiên thu thập nào</p>
          <p className="text-xs text-gray-400 mt-1">Tạo phiên mới để nhân viên chạy GLPI Agent trên máy khách</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map(s => (
            <SessionCard key={s.id} session={s} onRefresh={loadSessions} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ===== Create Session Form ===== */
function CreateSessionForm({ customerId, addresses, onDone, onCancel }: {
  customerId: string;
  addresses: Array<{ id: string; label: string | null; address: string | null; city: string | null }>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [addressId, setAddressId] = useState("");
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<Session | null>(null);
  const [selectedOs, setSelectedOs] = useState("auto");

  const create = async () => {
    setCreating(true);
    const res = await fetch(`/api/customers/${customerId}/collection-sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addressId: addressId || null }),
    });
    const data = await res.json();
    setCreating(false);
    if (!data.error) {
      setResult(data);
    }
  };

  if (result) {
    const serverUrl = typeof window !== "undefined" ? window.location.origin : "";
    const agentCmd = `glpi-agent --server ${serverUrl}/api/agent-inventory/${result.token} --json`;
    const scriptUrl = `${serverUrl}/api/agent-inventory/${result.token}/script${selectedOs !== "auto" ? `?os=${selectedOs}` : ""}`;

    const osOptions: Record<string, { label: string; file: string }> = {
      auto: { label: "Tự động (theo trình duyệt)", file: "" },
      windows: { label: "Windows", file: "thu-thap.bat" },
      linux: { label: "Linux", file: "thu-thap-linux.sh" },
      macos: { label: "macOS", file: "thu-thap-macos.sh" },
    };

    return (
      <div className="bg-white rounded-xl border border-border/50 mb-3 overflow-hidden">
        <div className="p-3.5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-green-600 text-xs">✓</span>
            </div>
            <h4 className="text-xs font-semibold text-gray-900">Phiên đã tạo thành công</h4>
          </div>

          <div className="bg-amber-50 rounded-lg p-3">
            <p className="text-[10px] text-amber-800 font-medium mb-1.5">Cách thực hiện</p>
            <ol className="text-[11px] text-amber-700 space-y-1 list-decimal list-inside">
              <li>Chọn hệ điều hành của máy khách bên dưới → bấm tải script</li>
              <li>Copy file script vào máy khách (USB / email / mạng nội bộ)</li>
              <li>Chạy file <strong>{osOptions[selectedOs]?.file || "script"}</strong> trên máy khách</li>
            </ol>
            <p className="text-[10px] text-amber-600 mt-1.5">
              Token hết hạn sau 24h. Mỗi token chỉ dùng được <strong>1 lần</strong>.
            </p>
          </div>

          <div>
            <label className="text-[10px] text-gray-500">Hệ điều hành máy khách</label>
            <select value={selectedOs} onChange={e => setSelectedOs(e.target.value)}
              className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400 mt-1">
              <option value="auto">Tự động (theo trình duyệt của bạn)</option>
              <option value="windows">Windows → thu-thap.bat</option>
              <option value="linux">Linux → thu-thap-linux.sh</option>
              <option value="macos">macOS → thu-thap-macos.sh</option>
            </select>
          </div>

          <a href={scriptUrl} download
            className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-600 transition">
            <Download size={16} />
            Tải {osOptions[selectedOs]?.file || "script"}
          </a>

          <details className="text-center">
            <summary className="text-[10px] text-gray-400 cursor-pointer hover:text-gray-600">
              Hoặc copy lệnh thủ công
            </summary>
            <div className="mt-2">
              <CopyField value={agentCmd} />
            </div>
          </details>

          <div className="flex items-center gap-2">
            <RefreshCw size={12} className="text-gray-400 animate-spin" />
            <span className="text-[10px] text-gray-500">Đang chờ GLPI Agent gửi inventory...</span>
          </div>

          <div className="flex gap-2">
            <button onClick={onDone}
              className="flex-1 h-8 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-600 transition">
              Xem danh sách phiên
            </button>
            <button onClick={() => setResult(null)}
              className="h-8 px-3 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition">
              Tạo phiên khác
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-border/50 mb-3 overflow-hidden">
      <div className="p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-gray-900">Tạo phiên thu thập mới</h4>
          <button onClick={onCancel} className="text-xs text-gray-500">Huỷ</button>
        </div>

        <div>
          <label className="text-[10px] text-gray-500">Địa chỉ khách hàng (nơi đặt thiết bị)</label>
          <select value={addressId} onChange={e => setAddressId(e.target.value)}
            className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400 mt-1">
            <option value="">— Tất cả địa chỉ —</option>
            {addresses.map((a: any) => (
              <option key={a.id} value={a.id}>
                {a.label ? `${a.label}${a.address ? ` - ${a.address}` : ""}` : a.address || a.id}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-amber-50 rounded-lg p-2.5">
          <p className="text-[10px] text-amber-700">
            Sau khi tạo, bạn sẽ nhận được lệnh để chạy GLPI Agent trên máy khách.
            Lệnh này chỉ dùng được <strong>1 lần</strong> và hết hạn sau 24h.
          </p>
        </div>

        <button onClick={create} disabled={creating}
          className="w-full h-8 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-600 disabled:opacity-50 transition flex items-center justify-center gap-1.5">
          {creating ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
          {creating ? "Đang tạo..." : "Tạo phiên"}
        </button>
      </div>
    </div>
  );
}

/* ===== Session Card ===== */
function SessionCard({ session, onRefresh }: { session: Session; onRefresh: () => void }) {
  const [copied, setCopied] = useState(false);
  const [selectedOs, setSelectedOs] = useState("auto");

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: "Chờ chạy", color: "text-amber-700", bg: "bg-amber-100" },
    active: { label: "Đang thu thập", color: "text-blue-700", bg: "bg-blue-100" },
    data_received: { label: "Chờ duyệt", color: "text-purple-700", bg: "bg-purple-100" },
    completed: { label: "Hoàn tất", color: "text-green-700", bg: "bg-green-100" },
    failed: { label: "Lỗi", color: "text-red-700", bg: "bg-red-100" },
  };
  const st = statusConfig[session.status] || statusConfig.pending;

  const serverUrl = typeof window !== "undefined" ? window.location.origin : "";
  const agentCmd = `glpi-agent --server ${serverUrl}/api/agent-inventory/${session.token} --json`;

  const copyCmd = () => {
    navigator.clipboard.writeText(agentCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl border border-border/50">
      <div className="p-3.5">
        <div className="flex items-start gap-3">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-base", st.bg)}>
            {session.status === "completed" ? "✅" : session.status === "failed" ? "❌" : "⏳"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", st.bg, st.color)}>
                {st.label}
              </span>
              <span className="text-[11px] text-gray-400">
                {session.createdAt ? new Date(session.createdAt).toLocaleString("vi-VN") : ""}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-gray-600">
              <span className="flex items-center gap-1">
                <Package size={12} className="text-gray-400" />
                {session.deviceCount || session._count.devices} thiết bị
              </span>
              {session.address && (
                <span className="flex items-center gap-1">
                  📌 {session.address.label || session.address.address}
                </span>
              )}
              {session.completedAt && (
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-gray-400" />
                  {new Date(session.completedAt).toLocaleString("vi-VN")}
                </span>
              )}
            </div>

            {session.token && session.status === "pending" && (
              <div className="mt-2 space-y-1.5">
                <div className="flex gap-1.5">
                  <select value={selectedOs} onChange={e => setSelectedOs(e.target.value)}
                    className="h-7 px-2 rounded-lg border border-gray-200 text-[10px] focus:outline-hidden focus:border-blue-400 flex-1 min-w-0">
                    <option value="auto">Tự động</option>
                    <option value="windows">Windows</option>
                    <option value="linux">Linux</option>
                    <option value="macos">macOS</option>
                  </select>
                  <a href={`${serverUrl}/api/agent-inventory/${session.token}/script${selectedOs !== "auto" ? `?os=${selectedOs}` : ""}`} download
                    className="flex items-center gap-1 h-7 px-3 rounded-lg bg-primary text-white text-[10px] font-medium hover:bg-primary-600 transition shrink-0">
                    <Download size={11} />
                    Tải
                  </a>
                  <a href={`${serverUrl}/api/agent-inventory/${session.token}/script${selectedOs !== "auto" ? `?os=${selectedOs}&mode=simple` : "?mode=simple"}`} download
                    className="flex items-center gap-1 h-7 px-3 rounded-lg bg-emerald-600 text-white text-[10px] font-medium hover:bg-emerald-700 transition shrink-0">
                    <Download size={11} />
                    Nhanh
                  </a>
                  <button onClick={copyCmd}
                    className="h-7 px-3 rounded-lg bg-gray-100 text-gray-500 text-[10px] hover:bg-gray-200 transition shrink-0">
                    <Copy size={11} className="inline mr-1" />
                    Lệnh
                  </button>
                </div>
              </div>
            )}

            {session.status === "data_received" && (
              <div className="mt-2">
                <a href={`/customer-devices/review/${session.id}`}
                  className="inline-flex items-center gap-1 h-7 px-3 rounded-lg bg-purple-600 text-white text-[10px] font-medium hover:bg-purple-700 transition">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  Xem &amp; duyệt
                </a>
              </div>
            )}

            {session.status === "pending" && session.expiresAt && (
              <p className="text-[10px] text-amber-600 mt-1.5">
                ⏰ Hết hạn: {new Date(session.expiresAt).toLocaleString("vi-VN")}
              </p>
            )}

            {session.errorMessage && (
              <p className="text-[10px] text-red-600 mt-1">{session.errorMessage}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== Copy Field ===== */
function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1">
      <code className="flex-1 block px-2 py-1.5 bg-white border border-gray-200 rounded text-[11px] font-mono text-gray-700 break-all leading-relaxed select-all">
        {value}
      </code>
      <button onClick={copy}
        className="shrink-0 w-7 h-7 rounded-lg bg-white border border-gray-200 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-gray-400 transition">
        {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
      </button>
    </div>
  );
}
