"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Monitor, Clock, CheckCircle, XCircle, HardDrive,
  ChevronRight, ChevronLeft, Eye, RefreshCw, Download,
  FileText, Activity, Server, Laptop, Printer,
  Users, Building2, Calendar, ArrowRight,
  Wifi, Database, Cpu, Box, MoreHorizontal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ===== Types ===== */
type Submission = {
  id: string;
  customerId: string;
  customerName: string;
  status: string;
  deviceCount: number;
  createdAt: string;
};

const PAGE_SIZE = 15;

/* ===== Helpers ===== */
const statusConfig: Record<string, { label: string; badge: "warning" | "success" | "danger" }> = {
  pending:  { label: "Chờ duyệt", badge: "warning" },
  approved: { label: "Đã duyệt",  badge: "success" },
  rejected: { label: "Từ chối",   badge: "danger"  },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

function customerInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name[0] || "?").toUpperCase();
}

const deviceTypeIcons: Record<string, any> = {
  computer: Monitor, desktop: Monitor, laptop: Laptop, server: Server,
  printer: Printer, network: Wifi, peripheral: Box,
};

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

  const pendingSubmissions = submissions.filter(s => s.status === "pending");

  return (
    <div className="min-h-screen bg-surface-secondary/30 pb-6">

      {/* ═══ Top Banner / Header ═══ */}
      <div className="bg-white border-b border-border px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-sm">
                <Activity size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 tracking-tight">Agent Inventory</h1>
                <p className="text-xs text-muted-foreground">Giám sát và duyệt dữ liệu thu thập từ thiết bị khách hàng</p>
              </div>
            </div>
            <button onClick={loadSubmissions} disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50">
              <RefreshCw size={14} className={cn(loading && "animate-spin")} />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* ═══ KPI Cards ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {[
            { label: "Tổng đợt", value: stats.total, icon: Database, color: "text-slate-600", bg: "bg-slate-50", accent: "border-l-slate-400" },
            { label: "Chờ duyệt", value: stats.pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", accent: "border-l-amber-400" },
            { label: "Đã duyệt", value: stats.approved, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", accent: "border-l-emerald-400" },
            { label: "Từ chối", value: stats.rejected, icon: XCircle, color: "text-red-600", bg: "bg-red-50", accent: "border-l-red-400" },
          ].map(k => (
            <Card key={k.label}>
              <CardContent className="flex items-center gap-3 py-3.5">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", k.bg)}>
                  <k.icon size={20} className={k.color} />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 leading-tight">{k.value}</p>
                  <p className="text-[10px] text-muted-foreground">{k.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ═══ Main content: 2-column layout ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">

          {/* ── Left: Pending submissions (feed-style) ── */}
          <div className="lg:col-span-2 space-y-3">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-amber-500" />
                  <CardTitle>Đợt chờ duyệt</CardTitle>
                  {stats.pending > 0 && (
                    <Badge variant="warning" size="sm" className="ml-1">{stats.pending}</Badge>
                  )}
                </div>
                <Link href={`/agent-updates?filter=pending`}
                  className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline">
                  Xem tất cả <ArrowRight size={12} />
                </Link>
              </CardHeader>
              <CardContent className="px-4 py-3">
                {loading ? (
                  <div className="space-y-3">
                    {[1,2].map(i => (
                      <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="w-10 h-10 rounded-full bg-gray-100" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 w-40 bg-gray-100 rounded" />
                          <div className="h-2.5 w-24 bg-gray-50 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : pendingSubmissions.length === 0 ? (
                  <div className="flex items-center gap-3 py-3 text-muted-foreground">
                    <CheckCircle size={18} className="text-emerald-400" />
                    <p className="text-xs">Tất cả đợt thu thập đã được xử lý</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingSubmissions.slice(0, 5).map(s => (
                      <FeedItem key={s.id} submission={s} />
                    ))}
                    {pendingSubmissions.length > 5 && (
                      <div className="text-center pt-1">
                        <Badge variant="default" size="sm">
                          +{pendingSubmissions.length - 5} đợt chờ khác
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Guide / Quick start ── */}
            <Card>
              <CardContent className="flex items-start gap-4 py-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shrink-0 shadow-sm">
                  <Download size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Triển khai Agent Script</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tải Agent Script từ trang chi tiết khách hàng, chạy trên máy cần thu thập để gửi dữ liệu về hệ thống
                  </p>
                </div>
                <Badge variant="info" size="sm" className="shrink-0">Hướng dẫn</Badge>
              </CardContent>
            </Card>
          </div>

          {/* ── Right: Overview widget ── */}
          <div className="space-y-3">
            {/* Status breakdown */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity size={15} className="text-slate-500" />
                  <CardTitle>Tổng quan</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-4 py-3 space-y-3">
                <div className="space-y-2">
                  {[
                    { label: "Chờ duyệt", value: stats.pending, pct: stats.total ? Math.round(stats.pending / stats.total * 100) : 0, color: "bg-amber-500" },
                    { label: "Đã duyệt", value: stats.approved, pct: stats.total ? Math.round(stats.approved / stats.total * 100) : 0, color: "bg-emerald-500" },
                    { label: "Từ chối", value: stats.rejected, pct: stats.total ? Math.round(stats.rejected / stats.total * 100) : 0, color: "bg-red-500" },
                  ].map(row => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-semibold text-gray-700">{row.value}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all duration-500", row.color)} style={{ width: `${row.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick actions */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Cpu size={15} className="text-slate-500" />
                  <CardTitle>Xử lý nhanh</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-4 py-3 space-y-2">
                <Link href="/customers"
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
                  <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                    <Users size={16} className="text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700">Danh sách khách hàng</p>
                    <p className="text-[10px] text-muted-foreground">Chọn KH để tải Agent Script</p>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                </Link>
                <Link href="/agent-updates?filter=pending"
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                    <Clock size={16} className="text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700">Duyệt đợt thu thập</p>
                    <p className="text-[10px] text-muted-foreground">{stats.pending} đợt đang chờ</p>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ═══ Submissions list ═══ */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">Lịch sử đợt thu thập</h2>
              {total > 0 && (
                <span className="text-[10px] text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">{total}</span>
              )}
            </div>

            {/* Filter chips */}
            <div className="flex items-center gap-1">
              {[
                { key: "all", label: "Tất cả" },
                { key: "pending", label: "Chờ duyệt" },
                { key: "approved", label: "Đã duyệt" },
                { key: "rejected", label: "Từ chối" },
              ].map(f => (
                <button key={f.key} onClick={() => handleFilterChange(f.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all",
                    filter === f.key
                      ? "bg-gray-900 text-white shadow-xs"
                      : "text-muted-foreground hover:text-gray-700 hover:bg-gray-100"
                  )}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-xs text-red-700">{error}</div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="space-y-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-16 bg-white rounded-xl border border-border animate-pulse flex items-center px-4">
                  <div className="w-9 h-9 rounded-full bg-gray-100 mr-3" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-40 bg-gray-100 rounded" />
                    <div className="h-2.5 w-24 bg-gray-50 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : submissions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-10 text-muted-foreground">
                <HardDrive size={36} className="text-gray-300 mb-2" />
                <p className="text-sm font-medium text-gray-600">Chưa có dữ liệu</p>
                <p className="text-xs mt-0.5">Tải Agent Script từ trang khách hàng để bắt đầu thu thập</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-1.5">
                {submissions.map(s => (
                  <SubmissionRow key={s.id} submission={s} />
                ))}
              </div>

              {/* ── Pagination ── */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Trang {page} / {totalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs text-muted-foreground bg-white border border-border hover:bg-gray-50 disabled:opacity-30 transition-all">
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
                          className={cn(
                            "w-8 h-8 rounded-lg text-xs font-medium transition-all",
                            page === pn ? "bg-gray-900 text-white shadow-xs" : "text-muted-foreground bg-white border border-border hover:bg-gray-50"
                          )}>{pn}</button>
                      );
                    })}
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs text-muted-foreground bg-white border border-border hover:bg-gray-50 disabled:opacity-30 transition-all">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ Feed Item (for pending section) ═══ */
function FeedItem({ submission: s }: { submission: Submission }) {
  const cfg = statusConfig[s.status] || statusConfig.pending;

  return (
    <Link href={`/agent-updates/${s.id}`}
      className="block bg-amber-50/40 border border-amber-100 rounded-xl p-3 hover:bg-amber-50/70 transition-colors group">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
          {customerInitials(s.customerName || "??")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">{s.customerName || "Đã xóa"}</span>
            <span className="text-xs text-muted-foreground">đã gửi</span>
            <Badge variant="info" size="sm">{s.deviceCount} thiết bị</Badge>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={cfg.badge} size="sm">{cfg.label}</Badge>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock size={10} /> {timeAgo(s.createdAt)}
            </span>
          </div>
        </div>
        <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-all shadow-xs">
          <Eye size={12} /> Duyệt
        </div>
      </div>
    </Link>
  );
}

/* ═══ Submission Row (for full list) ═══ */
function SubmissionRow({ submission: s }: { submission: Submission }) {
  const cfg = statusConfig[s.status] || statusConfig.pending;
  const isPending = s.status === "pending";

  return (
    <Link href={isPending ? `/agent-updates/${s.id}` : `/customers/${s.customerId}`}
      className="block bg-white border border-border rounded-xl hover:border-gray-200 hover:shadow-sm transition-all">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
          {customerInitials(s.customerName || "??")}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 truncate max-w-[240px]">{s.customerName || "Đã xóa"}</span>
            <Badge variant={cfg.badge} size="sm">{cfg.label}</Badge>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-gray-50 px-2 py-0.5 rounded-full">
              <HardDrive size={10} />
              {s.deviceCount} tb
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 size={10} />
              {s.customerName || "Không xác định"}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Calendar size={10} />
              {new Date(s.createdAt).toLocaleDateString("vi-VN", {
                day: "2-digit", month: "2-digit", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* Action */}
        {isPending ? (
          <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-900 text-white text-[11px] font-medium shadow-xs">
            <Eye size={13} /> Duyệt
          </div>
        ) : (
          <div className="text-muted-foreground">
            <MoreHorizontal size={16} />
          </div>
        )}
      </div>
    </Link>
  );
}
