"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Monitor, Clock, CheckCircle, XCircle, AlertTriangle,
  ChevronRight, ChevronLeft, Eye, RefreshCw, Download,
  Filter, List, RefreshCwIcon,
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

const PAGE_SIZE = 20;

/* ===== Page ===== */
export default function AgentUpdatesPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (filter !== "all") params.set("status", filter);
      const res = await fetch(`/api/agent-inventory/submissions?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setSubmissions(json.data || []);
      setTotalPages(json.meta?.totalPages || 1);
      setTotal(json.meta?.total || 0);
      if (json.stats) setStats(json.stats);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { loadSubmissions(); }, [loadSubmissions]);

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setPage(1);
  };

  const statFilters = [
    { key: "all", label: "Tất cả", count: stats.total, active: filter === "all", color: "gray" },
    { key: "pending", label: "Chờ duyệt", count: stats.pending, active: filter === "pending", color: "purple" },
    { key: "approved", label: "Đã duyệt", count: stats.approved, active: filter === "approved", color: "green" },
    { key: "rejected", label: "Từ chối", count: stats.rejected, active: filter === "rejected", color: "red" },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Cập nhật Agent</h1>
          <p className="text-sm text-gray-400 mt-1">
            Dữ liệu thiết bị gửi về từ Agent Script tại khách hàng
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {statFilters.map(s => (
            <button key={s.key} onClick={() => handleFilterChange(s.key)}
              className={`relative rounded-xl border p-4 text-left transition-all ${
                s.active
                  ? s.color === "purple" ? "border-purple-200 bg-purple-50 ring-1 ring-purple-200"
                    : s.color === "green" ? "border-green-200 bg-green-50 ring-1 ring-green-200"
                    : s.color === "red" ? "border-red-200 bg-red-50 ring-1 ring-red-200"
                    : "border-gray-300 bg-white ring-1 ring-gray-300"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
              }`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[11px] font-medium ${
                  s.active
                    ? s.color === "purple" ? "text-purple-700"
                      : s.color === "green" ? "text-green-700"
                      : s.color === "red" ? "text-red-700"
                      : "text-gray-700"
                    : "text-gray-500"
                }`}>{s.label}</span>
                <div className={`w-2 h-2 rounded-full ${
                  s.color === "purple" ? "bg-purple-400"
                    : s.color === "green" ? "bg-green-400"
                    : s.color === "red" ? "bg-red-400"
                    : "bg-gray-400"
                }`} />
              </div>
              <span className={`text-2xl font-bold ${
                s.active
                  ? s.color === "purple" ? "text-purple-800"
                    : s.color === "green" ? "text-green-800"
                    : s.color === "red" ? "text-red-800"
                    : "text-gray-900"
                  : "text-gray-900"
              }`}>{s.count}</span>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <List size={13} />
            <span>Hiện <strong className="text-gray-600">{submissions.length}</strong> / {total} kết quả</span>
          </div>
          <button onClick={loadSubmissions} disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-500 hover:bg-gray-50 transition disabled:opacity-50">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">{error}</div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-20 bg-white rounded-xl border border-gray-200 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && submissions.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Monitor size={20} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-500 font-medium">
              {filter === "all" ? "Chưa có dữ liệu Agent" : "Không có dữ liệu ở trạng thái này"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Tải script Agent từ trang chi tiết khách hàng để bắt đầu
            </p>
          </div>
        )}

        {/* Submissions list */}
        {!loading && submissions.length > 0 && (
          <>
            <div className="space-y-2">
              {submissions.map(s => (
                <SubmissionRow key={s.id} submission={s} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-5">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition">
                  <ChevronLeft size={13} /> Trước
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pn: number;
                  if (totalPages <= 7) pn = i + 1;
                  else if (page <= 4) pn = i + 1;
                  else if (page >= totalPages - 3) pn = totalPages - 6 + i;
                  else pn = page - 3 + i;
                  return (
                    <button key={pn} onClick={() => setPage(pn)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                        page === pn ? "bg-gray-900 text-white" : "text-gray-500 bg-white border border-gray-200 hover:bg-gray-50"
                      }`}>{pn}</button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition">
                  Sau <ChevronRight size={13} />
                </button>
              </div>
            )}
          </>
        )}

        {/* Instructions */}
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Download size={15} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Hướng dẫn triển khai Agent</h3>
              <p className="text-[11px] text-gray-400">Các bước cài đặt Agent tại khách hàng</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { step: "1", title: "Chọn khách hàng", desc: "Vào trang Khách hàng, chọn khách hàng cần thu thập" },
              { step: "2", title: "Tải Script", desc: "Vào tab Agent, chọn chế độ và tải Script" },
              { step: "3", title: "Chạy trên máy khách", desc: "Chạy file .bat với quyền Administrator" },
              { step: "4", title: "Duyệt kết quả", desc: "Dữ liệu hiện tại Cập nhật Agent để xem xét" },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">{s.step}</div>
                <div>
                  <p className="text-xs font-semibold text-gray-700">{s.title}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== Submission Row ===== */
const statusStyle: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending: { label: "Chờ duyệt", color: "text-purple-700", bg: "bg-purple-100", dot: "bg-purple-500" },
  approved: { label: "Đã duyệt", color: "text-green-700", bg: "bg-green-100", dot: "bg-green-500" },
  rejected: { label: "Từ chối", color: "text-red-700", bg: "bg-red-100", dot: "bg-red-500" },
};

function SubmissionRow({ submission: s }: { submission: Submission }) {
  const cfg = statusStyle[s.status] || statusStyle.pending;
  const isPending = s.status === "pending";
  const isAutoUpdate = s.deviceCount === 0 && s.status === "approved";

  return (
    <Link
      href={isPending ? `/agent-updates/${s.id}` : `/customers/${s.customerId}`}
      className="group block rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
          <Monitor size={18} className={cfg.color} />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 truncate max-w-[300px]">
              {s.customerName || "Đã xóa"}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${cfg.color} ${cfg.bg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
            {s.deviceCount > 0 && (
              <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {s.deviceCount} thiết bị
              </span>
            )}
            {isAutoUpdate && (
              <span className="text-[11px] text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                Tự động
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
            <Clock size={11} />
            <span>{new Date(s.createdAt).toLocaleDateString("vi-VN", {
              day: "2-digit", month: "2-digit", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}</span>
          </div>
        </div>

        {/* Action */}
        <div className="shrink-0">
          {isPending ? (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-medium group-hover:bg-gray-800 transition shadow-sm">
              <Eye size={13} /> Duyệt
            </span>
          ) : (
            <div className="flex items-center gap-1 text-xs text-gray-300 group-hover:text-gray-500 transition">
              <span>Chi tiết</span>
              <ChevronRight size={14} />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
