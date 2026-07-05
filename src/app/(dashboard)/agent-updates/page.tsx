"use client";

import { use, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Monitor, Clock, CheckCircle, XCircle, AlertTriangle,
  ChevronRight, Eye, RefreshCw
} from "lucide-react";

/* ===== Types ===== */

type SessionSummary = {
  id: string;
  token: string;
  status: string;
  deviceCount: number;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  customerId: string;
  customer: { id: string; name: string; code: string } | null;
  address: { id: string; label: string | null } | null;
  _count: { devices: number };
};

/* ===== Status config ===== */

const statusCfg: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: "Chờ chạy", color: "text-amber-700", bg: "bg-amber-100", icon: Clock },
  active: { label: "Đang thu thập", color: "text-blue-700", bg: "bg-blue-100", icon: RefreshCw },
  data_received: { label: "Chờ duyệt", color: "text-purple-700", bg: "bg-purple-100", icon: Eye },
  completed: { label: "Hoàn tất", color: "text-green-700", bg: "bg-green-100", icon: CheckCircle },
  failed: { label: "Lỗi", color: "text-red-700", bg: "bg-red-100", icon: XCircle },
};

/* ===== Page ===== */

export default function AgentUpdatesPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agent-inventory/list");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setSessions(json.sessions || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSessions(); }, []);

  // Filter
  const filtered = sessions.filter(s => {
    if (filter === "all") return true;
    if (filter === "pending") return s.status === "pending";
    if (filter === "data_received") return s.status === "data_received";
    if (filter === "completed") return s.status === "completed";
    if (filter === "failed") return s.status === "failed";
    return true;
  });

  // Stats
  const stats = {
    total: sessions.length,
    pending: sessions.filter(s => s.status === "pending").length,
    data_received: sessions.filter(s => s.status === "data_received").length,
    completed: sessions.filter(s => s.status === "completed").length,
    failed: sessions.filter(s => s.status === "failed").length,
    totalDevices: sessions.reduce((sum, s) => sum + s.deviceCount + s._count.devices, 0),
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Cập nhật Agent</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Danh sách các phiên thu thập thiết bị từ GLPI Agent
        </p>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-3 mb-4 text-xs">
        <button onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg transition ${filter === "all" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          Tất cả <span className="font-medium ml-1">{stats.total}</span>
        </button>
        <button onClick={() => setFilter("data_received")}
          className={`px-3 py-1.5 rounded-lg transition ${filter === "data_received" ? "bg-purple-600 text-white" : "bg-purple-50 text-purple-600 hover:bg-purple-100"}`}>
          Chờ duyệt <span className="font-medium ml-1">{stats.data_received}</span>
        </button>
        <button onClick={() => setFilter("pending")}
          className={`px-3 py-1.5 rounded-lg transition ${filter === "pending" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-600 hover:bg-amber-100"}`}>
          Chờ chạy <span className="font-medium ml-1">{stats.pending}</span>
        </button>
        <button onClick={() => setFilter("completed")}
          className={`px-3 py-1.5 rounded-lg transition ${filter === "completed" ? "bg-green-600 text-white" : "bg-green-50 text-green-600 hover:bg-green-100"}`}>
          Hoàn tất <span className="font-medium ml-1">{stats.completed}</span>
        </button>
        <button onClick={() => setFilter("failed")}
          className={`px-3 py-1.5 rounded-lg transition ${filter === "failed" ? "bg-red-600 text-white" : "bg-red-50 text-red-600 hover:bg-red-100"}`}>
          Lỗi <span className="font-medium ml-1">{stats.failed}</span>
        </button>
        <div className="flex-1" />
        <button onClick={loadSessions} disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition disabled:opacity-50">
          <RefreshCw size={13} className={`inline mr-1 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12 text-xs text-gray-400">Đang tải...</div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-xs text-gray-400">
          {filter === "all" ? "Chưa có phiên thu thập nào" : `Không có phiên nào ở trạng thái này`}
        </div>
      )}

      {/* Sessions list */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-1.5">
          {filtered.map(s => {
            const cfg = statusCfg[s.status] || statusCfg.pending;
            const Icon = cfg.icon;
            const totalDevices = s.deviceCount + s._count.devices;
            const isReviewable = s.status === "data_received";

            return (
              <div key={s.id}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-white hover:border-gray-300 transition">
                {/* Icon */}
                <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={15} className={cfg.color} />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/customers/${s.customerId}`}
                      className="text-[13px] font-medium text-gray-900 hover:text-blue-600 truncate">
                      {s.customer?.name || s.customer?.code || "Đã xóa"}
                    </Link>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${cfg.color} ${cfg.bg}`}>
                      {cfg.label}
                    </span>
                    {totalDevices > 0 && (
                      <span className="text-[10px] text-gray-400">
                        {totalDevices} thiết bị
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                    <span>{new Date(s.createdAt).toLocaleDateString("vi-VN")}</span>
                    {s.completedAt && (
                      <>
                        <span>·</span>
                        <span>Hoàn tất {new Date(s.completedAt).toLocaleDateString("vi-VN")}</span>
                      </>
                    )}
                    {s.address?.label && (
                      <>
                        <span>·</span>
                        <span>{s.address.label}</span>
                      </>
                    )}
                  </div>
                  {s.status === "failed" && s.errorMessage && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-red-500">
                      <AlertTriangle size={10} />
                      {s.errorMessage}
                    </div>
                  )}
                </div>

                {/* Action */}
                <div className="shrink-0 flex items-center gap-2">
                  {isReviewable ? (
                    <Link href={`/customer-devices/review/${s.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-[11px] font-medium hover:bg-purple-700 transition">
                      <Eye size={12} />
                      Xem & duyệt
                    </Link>
                  ) : (
                    <Link href={`/customers/${s.customerId}`}
                      className="text-[11px] text-gray-400 hover:text-gray-600 transition">
                      <ChevronRight size={14} />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
