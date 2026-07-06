"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Monitor, Clock, CheckCircle, XCircle, AlertTriangle,
  ChevronRight, ChevronLeft, Eye, RefreshCw, Download,
  FileText, Server, Smartphone, Printer, HardDrive,
  Users, Building2, Calendar, Activity,
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

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-1">
              <Activity size={12} />
              <span>Agent Inventory</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cập nhật Agent</h1>
            <p className="text-sm text-gray-400 mt-1">Dữ liệu thiết bị gửi về từ khách hàng</p>
          </div>
          <button onClick={loadSubmissions} disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { key: "all", label: "Tổng số", count: stats.total, icon: FileText, color: "gray", active: filter === "all" },
            { key: "pending", label: "Chờ duyệt", count: stats.pending, icon: Clock, color: "purple", active: filter === "pending" },
            { key: "approved", label: "Đã duyệt", count: stats.approved, icon: CheckCircle, color: "green", active: filter === "approved" },
            { key: "rejected", label: "Từ chối", count: stats.rejected, icon: XCircle, color: "red", active: filter === "rejected" },
          ].map(s => {
            const Icon = s.icon;
            const activeStyle = s.active ? {
              gray: "border-gray-300 bg-white shadow-sm ring-1 ring-gray-200",
              purple: "border-purple-200 bg-purple-50 shadow-sm ring-1 ring-purple-200",
              green: "border-green-200 bg-green-50 shadow-sm ring-1 ring-green-200",
              red: "border-red-200 bg-red-50 shadow-sm ring-1 ring-red-200",
            }[s.color] : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm";

            return (
              <button key={s.key} onClick={() => handleFilterChange(s.key)}
                className={`relative rounded-xl border p-4 text-left transition-all ${activeStyle}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    s.active ? {
                      gray: "bg-gray-200 text-gray-600",
                      purple: "bg-purple-200 text-purple-600",
                      green: "bg-green-200 text-green-600",
                      red: "bg-red-200 text-red-600",
                    }[s.color] : "bg-gray-100 text-gray-400"
                  }`}>
                    <Icon size={16} />
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    s.active ? {
                      gray: "bg-gray-200 text-gray-700",
                      purple: "bg-purple-200 text-purple-700",
                      green: "bg-green-200 text-green-700",
                      red: "bg-red-200 text-red-700",
                    }[s.color] : "bg-gray-100 text-gray-400"
                  }`}>{s.label}</span>
                </div>
                <span className={`text-2xl font-bold tracking-tight ${
                  s.active ? {
                    gray: "text-gray-900",
                    purple: "text-purple-900",
                    green: "text-green-900",
                    red: "text-red-900",
                  }[s.color] : "text-gray-900"
                }`}>{s.count}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {/* ── List ── */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 rounded-xl bg-white border border-gray-100 animate-pulse flex items-center px-5">
                <div className="w-10 h-10 rounded-lg bg-gray-100 mr-4" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-gray-100 rounded" />
                  <div className="h-3 w-32 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Monitor size={28} className="text-gray-300" />
            </div>
            <h3 className="text-base font-semibold text-gray-700 mb-1">
              {filter === "all" ? "Chưa có dữ liệu" : "Không có dữ liệu"}
            </h3>
            <p className="text-sm text-gray-400">Tải Agent Script từ trang khách hàng để bắt đầu thu thập</p>
          </div>
        ) : (
          <>
            {/* Results summary */}
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-xs text-gray-400">
                Hiển thị <span className="font-medium text-gray-600">{submissions.length}</span> / <span className="font-medium text-gray-600">{total}</span> kết quả
              </p>
            </div>

            <div className="space-y-2">
              {submissions.map(s => (
                <SubmissionCard key={s.id} submission={s} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-5 pt-5 border-t border-gray-100">
                <p className="text-xs text-gray-400">Trang {page} / {totalPages}</p>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition">
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pn: number;
                    if (totalPages <= 5) pn = i + 1;
                    else if (page <= 3) pn = i + 1;
                    else if (page >= totalPages - 2) pn = totalPages - 4 + i;
                    else pn = page - 2 + i;
                    return (
                      <button key={pn} onClick={() => setPage(pn)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                          page === pn ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 bg-white border border-gray-200 hover:bg-gray-50"
                        }`}>{pn}</button>
                    );
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Instructions ── */}
        <div className="mt-8 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Download size={18} className="text-white/80" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Hướng dẫn triển khai Agent</h3>
              <p className="text-xs text-white/50">Các bước cài đặt Agent tại khách hàng</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { num: "01", title: "Chọn khách hàng", desc: "Tìm và chọn khách hàng cần thu thập trong danh sách" },
              { num: "02", title: "Tải Agent Script", desc: "Vào tab Agent, chọn chế độ thu thập và tải Script" },
              { num: "03", title: "Chạy trên máy khách", desc: "Thực thi file với quyền Administrator / root" },
              { num: "04", title: "Duyệt kết quả", desc: "Kết quả hiện tại đây để xem xét và xác nhận" },
            ].map(s => (
              <div key={s.num} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <span className="text-[11px] font-bold text-white/30 mt-0.5">{s.num}</span>
                <div>
                  <p className="text-xs font-semibold text-white/90">{s.title}</p>
                  <p className="text-[11px] text-white/50 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Submission Card ── */
const statusCfg: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  pending: {
    label: "Chờ duyệt", color: "text-purple-700", bg: "bg-purple-50", border: "border-l-purple-400",
    icon: (p: any) => <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center"><Clock size={15} className="text-purple-600" /></div>,
  },
  approved: {
    label: "Đã duyệt", color: "text-green-700", bg: "bg-green-50", border: "border-l-green-400",
    icon: (p: any) => <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center"><CheckCircle size={15} className="text-green-600" /></div>,
  },
  rejected: {
    label: "Từ chối", color: "text-red-700", bg: "bg-red-50", border: "border-l-red-400",
    icon: (p: any) => <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center"><XCircle size={15} className="text-red-500" /></div>,
  },
};

function SubmissionCard({ submission: s }: { submission: Submission }) {
  const cfg = statusCfg[s.status] || statusCfg.pending;
  const isPending = s.status === "pending";
  const isAutoUpdate = s.deviceCount === 0 && s.status === "approved";
  const Icon = cfg.icon;

  return (
    <Link
      href={isPending ? `/agent-updates/${s.id}` : `/customers/${s.customerId}`}
      className="group block"
    >
      <div className={`relative rounded-xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all overflow-hidden ${
        isPending ? "ring-1 ring-purple-100" : ""
      }`}>
        {/* Left accent */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
          s.status === "pending" ? "bg-gradient-to-b from-purple-400 to-purple-500"
          : s.status === "approved" ? "bg-gradient-to-b from-green-400 to-green-500"
          : s.status === "rejected" ? "bg-gradient-to-b from-red-400 to-red-500"
          : "bg-gradient-to-b from-gray-300 to-gray-400"
        }`} />

        <div className="flex items-center gap-4 pl-5 pr-5 py-4">
          {/* Icon */}
          <Icon />

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-sm font-semibold text-gray-900 truncate max-w-[280px]">
                {s.customerName || "Đã xóa"}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${cfg.color} ${cfg.bg}`}>
                {cfg.label}
              </span>
              {s.deviceCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                  <HardDrive size={11} />
                  {s.deviceCount} thiết bị
                </span>
              )}
              {isAutoUpdate && (
                <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                  <RefreshCw size={11} />
                  Tự động
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                <Building2 size={11} />
                {s.customerName || "Không xác định"}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                {new Date(s.createdAt).toLocaleDateString("vi-VN", {
                  day: "2-digit", month: "2-digit", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </div>
          </div>

          {/* Action */}
          <div className="shrink-0">
            {isPending ? (
              <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-medium group-hover:bg-gray-800 transition-all shadow-sm">
                <Eye size={13} />
                Xem & duyệt
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-gray-300 group-hover:text-gray-500 transition-colors">
                <span>Xem</span>
                <ChevronRight size={14} />
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
