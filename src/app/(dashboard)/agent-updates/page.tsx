"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Monitor, Clock, CheckCircle, XCircle, AlertTriangle,
  ChevronRight, Eye, RefreshCw, Download
} from "lucide-react";

/* ===== Types ===== */
type Submission = {
  id: string;
  customerId: string;
  customerName: string;
  status: string;
  deviceCount: number;
  createdAt: string;
};

/* ===== Status config ===== */
const statusCfg: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Chờ duyệt", color: "text-purple-700", bg: "bg-purple-100" },
  approved: { label: "Đã duyệt", color: "text-green-700", bg: "bg-green-100" },
  rejected: { label: "Từ chối", color: "text-red-700", bg: "bg-red-100" },
};

/* ===== Page ===== */
export default function AgentUpdatesPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agent-inventory/submissions");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setSubmissions(json.data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSubmissions(); }, []);

  // Filter
  const filtered = submissions.filter(s => {
    if (filter === "all") return true;
    return s.status === filter;
  });

  // Stats
  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === "pending").length,
    approved: submissions.filter(s => s.status === "approved").length,
    rejected: submissions.filter(s => s.status === "rejected").length,
    totalDevices: submissions.reduce((sum, s) => sum + s.deviceCount, 0),
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Cập nhật Agent</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Dữ liệu thiết bị gửi về từ Agent Script tại khách hàng
        </p>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-3 mb-4 text-xs">
        <button onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg transition ${filter === "all" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          Tất cả <span className="font-medium ml-1">{stats.total}</span>
        </button>
        <button onClick={() => setFilter("pending")}
          className={`px-3 py-1.5 rounded-lg transition ${filter === "pending" ? "bg-purple-600 text-white" : "bg-purple-50 text-purple-600 hover:bg-purple-100"}`}>
          Chờ duyệt <span className="font-medium ml-1">{stats.pending}</span>
        </button>
        <button onClick={() => setFilter("approved")}
          className={`px-3 py-1.5 rounded-lg transition ${filter === "approved" ? "bg-green-600 text-white" : "bg-green-50 text-green-600 hover:bg-green-100"}`}>
          Đã duyệt <span className="font-medium ml-1">{stats.approved}</span>
        </button>
        <button onClick={() => setFilter("rejected")}
          className={`px-3 py-1.5 rounded-lg transition ${filter === "rejected" ? "bg-red-600 text-white" : "bg-red-50 text-red-600 hover:bg-red-100"}`}>
          Từ chối <span className="font-medium ml-1">{stats.rejected}</span>
        </button>
        <div className="flex-1" />
        <button onClick={loadSubmissions} disabled={loading}
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
          {filter === "all"
            ? "Chưa có dữ liệu Agent nào. Tải script Agent từ trang chi tiết khách hàng."
            : "Không có dữ liệu ở trạng thái này"}
        </div>
      )}

      {/* Submissions list */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-1.5">
          {filtered.map(s => {
            const cfg = statusCfg[s.status] || statusCfg.pending;

            return (
              <Link
                key={s.id}
                href={s.status === "pending" ? `/agent-updates/${s.id}` : `/customers/${s.customerId}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-white hover:border-gray-300 transition group"
              >
                {/* Icon */}
                <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                  <Monitor size={15} className={cfg.color} />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-gray-900 truncate">
                      {s.customerName || "Đã xóa"}
                    </span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${cfg.color} ${cfg.bg}`}>
                      {cfg.label}
                    </span>
                    {s.deviceCount > 0 && (
                      <span className="text-[10px] text-gray-400">
                        {s.deviceCount} thiết bị
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                    <span>{new Date(s.createdAt).toLocaleDateString("vi-VN")}</span>
                  </div>
                </div>

                {/* Action */}
                <div className="shrink-0 flex items-center gap-2">
                  {s.status === "pending" ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-[11px] font-medium group-hover:bg-purple-700 transition">
                      <Eye size={12} />
                      Xem & duyệt
                    </span>
                  ) : (
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 p-4 rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center gap-2 mb-2">
          <Download size={16} className="text-primary" />
          <h3 className="text-sm font-semibold text-gray-900">Hướng dẫn triển khai Agent</h3>
        </div>
        <ol className="space-y-1 text-xs text-gray-500 list-decimal list-inside">
          <li>Vào trang <Link href="/customers" className="text-blue-600 hover:underline">Khách hàng</Link>, chọn khách hàng cần thu thập</li>
          <li>Vào tab <strong>Agent</strong>, nhấn <strong>Tải Script</strong></li>
          <li>Chạy file <code className="bg-gray-100 px-1 rounded text-[10px]">.bat</code> với quyền Administrator trên máy khách</li>
          <li>Dữ liệu hiện tại <strong>Chờ duyệt</strong> để xem xét và xác nhận</li>
        </ol>
      </div>
    </div>
  );
}
