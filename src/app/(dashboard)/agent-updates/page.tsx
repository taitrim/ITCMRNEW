"use client";

import { useState, useCallback, useEffect, use } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Monitor, Clock, CheckCircle, XCircle, HardDrive,
  ChevronRight, ChevronLeft, Eye, RefreshCw, Download,
  FileText, Activity, Server, Laptop, Printer,
  Users, Building2, Calendar, ArrowRight, X,
  Wifi, Database, Cpu, Box, MoreHorizontal,
  PieChart, User, Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PieChart as RePieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

/* ===== Types ===== */
type Submission = {
  id: string;
  customerId: string;
  customerName: string;
  customerLogo?: string | null;
  customerShortName?: string | null;
  status: string;
  deviceCount: number;
  createdAt: string;
  reviewedById?: string | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  devices?: { id: string; deviceType: string; manufacturer?: string; modelName?: string; serialNumber?: string }[];
};

const PAGE_SIZE = 12;

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

const DEVICE_TYPE_COLORS: Record<string, string> = {
  computer: "#3b82f6", laptop: "#8b5cf6", server: "#f97316",
  printer: "#22c55e", monitor: "#06b6d4", network: "#eab308",
  peripheral: "#ec4899", other: "#9ca3af",
};

const DEVICE_TYPE_LABELS: Record<string, string> = {
  computer: "PC", laptop: "Laptop", server: "Server",
  printer: "Máy in", monitor: "Màn hình", network: "Mạng",
  peripheral: "Ngoại vi", other: "Khác",
};

const deviceTypeIcons: Record<string, any> = {
  computer: Monitor, desktop: Monitor, laptop: Laptop, server: Server,
  printer: Printer, network: Wifi, peripheral: Box,
};

/* ===== Detail Modal ===== */
function DetailModal({ submission, onClose }: { submission: Submission | null; onClose: () => void }) {
  if (!submission) return null;
  const cfg = statusConfig[submission.status] || statusConfig.pending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            {submission.customerLogo ? (
              <div className="w-10 h-10 rounded-full overflow-hidden border border-border">
                <img src={submission.customerLogo} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-xs font-bold">
                {customerInitials(submission.customerName || "")}
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold text-gray-900">{submission.customerName || "Đã xóa"}</h3>
              <p className="text-[10px] text-muted-foreground">{submission.deviceCount} thiết bị</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {/* Status row */}
          <div className="flex items-center gap-2 text-xs">
            <Badge variant={cfg.badge} size="md">{cfg.label}</Badge>
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar size={11} />
              {new Date(submission.createdAt).toLocaleDateString("vi-VN", {
                day: "2-digit", month: "2-digit", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </span>
          </div>

          {/* Reviewer info */}
          {(submission.reviewedByName || submission.reviewedAt) && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground bg-gray-50 rounded-xl px-3 py-2">
              {submission.reviewedByName && (
                <span className="flex items-center gap-1.5">
                  <User size={12} />
                  {submission.reviewedByName}
                </span>
              )}
              {submission.reviewedAt && (
                <span className="flex items-center gap-1.5">
                  <Clock size={12} />
                  {new Date(submission.reviewedAt).toLocaleDateString("vi-VN", {
                    day: "2-digit", month: "2-digit", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          )}

          {/* Devices summary */}
          {submission.devices && submission.devices.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold text-gray-600 mb-2">Danh sách thiết bị</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {submission.devices.map((d, i) => {
                  const Icon = deviceTypeIcons[d.deviceType] || Box;
                  return (
                    <div key={d.id || i} className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-gray-50 text-xs">
                      <Icon size={12} className="text-gray-400" />
                      <span className="text-gray-700 font-medium">{d.manufacturer || ""} {d.modelName || ""}</span>
                      {d.serialNumber && <span className="text-muted-foreground">· {d.serialNumber.substring(0, 12)}</span>}
                      <Badge variant="default" size="sm">{DEVICE_TYPE_LABELS[d.deviceType] || d.deviceType}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">Không có thông tin thiết bị</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex justify-end">
          {submission.status === "pending" ? (
            <Link href={`/agent-updates/${submission.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-all shadow-xs">
              <Eye size={13} /> Xem & duyệt
            </Link>
          ) : (
            <button onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-muted-foreground hover:bg-gray-100 transition-all">
              Đóng
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== Page ===== */
export default function AgentUpdatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlFilter = searchParams.get("filter") || "all";

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>(urlFilter);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [deviceTypes, setDeviceTypes] = useState<{ type: string; count: number }[]>([]);
  const [detailTarget, setDetailTarget] = useState<Submission | null>(null);

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
      if (json.deviceTypes) setDeviceTypes(json.deviceTypes);
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
    // Sync URL
    const p = new URLSearchParams(window.location.search);
    if (newFilter === "all") p.delete("filter"); else p.set("filter", newFilter);
    const qs = p.toString();
    router.replace(`/agent-updates${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const hasPendingOverall = stats.pending > 0;
  const pendingPageSubmissions = submissions.filter(s => s.status === "pending");

  return (
    <div className="min-h-screen bg-surface-secondary/30 pb-6">

      {/* ═══ Header ═══ */}
      <div className="bg-white border-b border-border px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-full mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-xs">
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

      <div className="max-w-full px-4 sm:px-6 lg:px-8">

        {/* ═══ KPI Cards ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {[
            { label: "Tổng đợt", value: stats.total, icon: Database, color: "text-slate-600", bg: "bg-slate-50" },
            { label: "Chờ duyệt", value: stats.pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Đã duyệt", value: stats.approved, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Từ chối", value: stats.rejected, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
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

        {/* ═══ Main content ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-4">

          {/* ── Left (3/4): Pending feed + Guide ── */}
          <div className="lg:col-span-3 space-y-3">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-amber-500" />
                  <CardTitle>Đợt chờ duyệt</CardTitle>
                  {stats.pending > 0 && (
                    <Badge variant="warning" size="sm" className="ml-1">{stats.pending}</Badge>
                  )}
                </div>
                <button onClick={() => handleFilterChange("pending")}
                  className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline">
                  Xem tất cả <ArrowRight size={12} />
                </button>
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
                ) : !hasPendingOverall ? (
                  <div className="flex items-center gap-3 py-3 text-muted-foreground">
                    <CheckCircle size={18} className="text-emerald-400" />
                    <p className="text-xs">Tất cả đợt thu thập đã được xử lý</p>
                  </div>
                ) : pendingPageSubmissions.length === 0 && page > 1 ? (
                  <div className="flex items-center gap-3 py-3 text-muted-foreground">
                    <Clock size={18} className="text-amber-400" />
                    <p className="text-xs">Đợt chờ duyệt ở trang khác — <button onClick={() => { setPage(1); handleFilterChange("pending"); }} className="text-primary underline">về trang đầu</button></p>
                  </div>
                ) : pendingPageSubmissions.length === 0 ? (
                  <div className="flex items-center gap-3 py-3 text-muted-foreground">
                    <Clock size={18} className="text-amber-400" />
                    <p className="text-xs">Không có đợt chờ duyệt nào</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingPageSubmissions.slice(0, 5).map(s => (
                      <FeedItem key={s.id} submission={s} />
                    ))}
                    {stats.pending > 5 && (
                      <div className="text-center pt-1">
                        <button onClick={() => handleFilterChange("pending")} className="hover:underline">
                          <Badge variant="default" size="sm" className="cursor-pointer">
                            +{stats.pending - 5} đợt chờ khác
                          </Badge>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Guide */}
            <Card>
              <CardContent className="flex items-start gap-4 py-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shrink-0 shadow-xs">
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

          {/* ── Right (1/4): Chart + Quick actions ── */}
          <div className="space-y-3">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <PieChart size={15} className="text-slate-500" />
                  <CardTitle>Thiết bị</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-4 py-3">
                {deviceTypes.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4">Chưa có dữ liệu</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={140}>
                      <RePieChart>
                        <Pie data={deviceTypes} dataKey="count" nameKey="type"
                          cx="50%" cy="50%" outerRadius={52} innerRadius={26}>
                          {deviceTypes.map((dt, i) => (
                            <Cell key={i} fill={DEVICE_TYPE_COLORS[dt.type] || "#9ca3af"} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any, _name: any) => [v, "SL"]}
                          labelFormatter={(v: any) => DEVICE_TYPE_LABELS[v] || v} />
                      </RePieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-2">
                      {deviceTypes.slice(0, 5).map(dt => {
                        const Icon = deviceTypeIcons[dt.type] || Box;
                        return (
                          <div key={dt.type} className="flex items-center gap-2 text-[11px]">
                            <Icon size={11} style={{ color: DEVICE_TYPE_COLORS[dt.type] || "#9ca3af" }} />
                            <span className="text-gray-500 flex-1">{DEVICE_TYPE_LABELS[dt.type] || dt.type}</span>
                            <span className="font-semibold text-gray-700">{dt.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

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
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500" />
                </Link>
                <button onClick={() => handleFilterChange("pending")}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group text-left">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                    <Clock size={16} className="text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700">Duyệt đợt thu thập</p>
                    <p className="text-[10px] text-muted-foreground">{stats.pending} đợt đang chờ</p>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500" />
                </button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ═══ History: 3-column grid ═══ */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">Lịch sử đợt thu thập</h2>
              {total > 0 && (
                <span className="text-[10px] text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">{total}</span>
              )}
            </div>
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

          {error && (
            <div className="mb-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-xs text-red-700">{error}</div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-28 bg-white rounded-xl border border-border animate-pulse p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 bg-gray-100 rounded" />
                      <div className="h-2.5 w-20 bg-gray-50 rounded" />
                    </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {submissions.map(s => (
                  <HistoryCard key={s.id} submission={s} onClick={() => setDetailTarget(s)} />
                ))}
              </div>

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

      {/* Detail Modal */}
      <DetailModal submission={detailTarget} onClose={() => setDetailTarget(null)} />
    </div>
  );
}

/* ═══ Feed Item ═══ */
function FeedItem({ submission: s }: { submission: Submission }) {
  const cfg = statusConfig[s.status] || statusConfig.pending;

  return (
    <Link href={`/agent-updates/${s.id}`}
      className="block bg-amber-50/40 border border-amber-100 rounded-xl p-3 hover:bg-amber-50/70 transition-colors group">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs">
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

/* ═══ History Card ═══ */
function HistoryCard({ submission: s, onClick }: { submission: Submission; onClick: () => void }) {
  const cfg = statusConfig[s.status] || statusConfig.pending;
  const isPending = s.status === "pending";
  const initials = customerInitials(s.customerName || "??");
  const statusGrad = isPending ? "from-amber-400 to-orange-500"
    : s.status === "approved" ? "from-emerald-400 to-teal-500"
    : "from-red-400 to-rose-500";

  return (
    <button onClick={onClick} className="w-full text-left">
      <Card className={cn(
        "h-full transition-all duration-200 hover:shadow-sm group cursor-pointer",
        isPending && "ring-1 ring-amber-200"
      )}>
        <CardContent className="p-4 flex flex-col h-full">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {s.customerLogo ? (
                <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-border shadow-xs">
                  <img src={s.customerLogo} alt={s.customerName || ""}
                    className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-xs bg-gradient-to-br",
                  statusGrad
                )}>
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate max-w-[160px] group-hover:text-primary transition-colors">
                  {s.customerShortName || s.customerName || "Đã xóa"}
                </p>
                <p className="text-[10px] text-muted-foreground">{(s.devices?.length || s.deviceCount)} thiết bị</p>
              </div>
            </div>
            <Badge variant={cfg.badge} size="sm">{cfg.label}</Badge>
          </div>

          {/* Device type icons */}
          {s.devices && s.devices.length > 0 ? (
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              {s.devices.slice(0, 4).map((d: any, i: number) => {
                const Icon = deviceTypeIcons[d.deviceType] || Box;
                return (
                  <div key={i} className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center" title={d.deviceType}>
                    <Icon size={11} className="text-gray-400" />
                  </div>
                );
              })}
              {s.devices.length > 4 && (
                <span className="text-[10px] text-muted-foreground">+{s.devices.length - 4}</span>
              )}
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {/* Reviewer + date */}
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground min-w-0">
              <Calendar size={10} className="shrink-0" />
              <span className="truncate">
                {new Date(s.createdAt).toLocaleDateString("vi-VN", {
                  day: "2-digit", month: "2-digit", year: "numeric",
                })}
              </span>
              {s.reviewedByName && !isPending && (
                <span className="flex items-center gap-1 shrink-0">
                  <span className="text-gray-300">·</span>
                  <User size={10} />
                  {s.reviewedByName}
                </span>
              )}
            </div>
            <span className={cn(
              "inline-flex items-center gap-1 text-[11px] shrink-0",
              isPending ? "text-primary font-medium group-hover:underline" : "text-muted-foreground group-hover:text-gray-700 transition-colors"
            )}>
              {isPending ? <>Duyệt <ArrowRight size={11} /></> : <>Chi tiết <ChevronRight size={11} /></>}
            </span>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
