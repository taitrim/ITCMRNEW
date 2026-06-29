"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Ticket, Monitor, Users, CheckCircle2, Bell, AlertCircle, ArrowRight, Smile, Image, Video, ThumbsUp, MessageSquare, Share2, Clock, MoreHorizontal, Search, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

type Stats = {
  totalTickets: number; openTickets: number; resolvedTickets: number;
  totalAssets: number; totalUsers: number;
  ticketsByStatus: { status: string; count: number }[];
  assetsByType: { type: string; count: number }[];
  recentTickets: { id: string; title: string; status: string; priority: string; assignedTo: { name: string } | null; createdAt: string }[];
};

const statusLabel: Record<string, string> = { new: "Mới", assigned: "Đã phân công", in_progress: "Đang xử lý", pending: "Chờ", resolved: "Đã giải quyết", closed: "Đã đóng" };
const STATUS_COLORS = ["#3b82f6", "#eab308", "#f97316", "#a855f7", "#22c55e", "#9ca3af"];

const storyItems = [
  { label: "Ticket mới", icon: Ticket, gradient: "from-blue-500 to-cyan-500", href: "/tickets/create" },
  { label: "Tài sản", icon: Monitor, gradient: "from-emerald-500 to-teal-500", href: "/assets" },
  { label: "KH mới", icon: Users, gradient: "from-amber-500 to-orange-500", href: "/customers/create" },
  { label: "Tra cứu", icon: Search, gradient: "from-purple-500 to-pink-500", href: "/knowledge" },
  { label: "Charts", icon: Activity, gradient: "from-rose-500 to-red-500", href: "#charts" },
];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats").then(r => r.json()).then(d => { setStats(d); setLoading(false); });
  }, []);

  if (status === "loading") return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-surface-secondary/30 pb-4">
      {/* Compose bar - Facebook style */}
      <div className="bg-white border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
            {session.user.name?.[0]?.toUpperCase() || "U"}
          </div>
          <Link href="/tickets/create" className="flex-1 h-10 rounded-full bg-gray-100 flex items-center px-4 text-sm text-muted-foreground hover:bg-gray-200 transition-colors">
            Bạn đang gặp vấn đề gì?
          </Link>
        </div>
        <div className="flex items-center justify-around mt-3 pt-2 border-t border-gray-100">
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-blue-600"><Video size={16} className="text-red-500" /> Live</button>
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-emerald-600"><Image size={16} className="text-emerald-500" /> Ảnh</button>
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-amber-600"><Smile size={16} className="text-amber-500" /> Cảm xúc</button>
        </div>
      </div>

      {/* Story Carousel - Facebook style */}
      <div className="bg-white border-b border-border overflow-hidden">
        <div className="flex gap-3 p-4 overflow-x-auto no-scrollbar">
          <div className="flex-shrink-0 space-y-1.5 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-gray-300 to-gray-400 p-[3px]">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <Bell size={22} className="text-primary" />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">Thông báo</p>
          </div>
          {storyItems.map((s, i) => (
            <Link key={i} href={s.href} className="flex-shrink-0 space-y-1.5 text-center">
              <div className={cn("w-16 h-16 mx-auto rounded-full bg-gradient-to-br p-[3px]", s.gradient)}>
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  <div className={cn("w-12 h-12 rounded-full bg-gradient-to-br", s.gradient, "flex items-center justify-center text-white")}>
                    <s.icon size={20} />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="px-4 mt-3 grid grid-cols-2 gap-2.5">
        {[
          { icon: Ticket, label: "Ticket mở", value: stats?.openTickets ?? 0, color: "text-blue-600", bg: "bg-blue-50", change: null },
          { icon: CheckCircle2, label: "Đã xong", value: stats?.resolvedTickets ?? 0, color: "text-emerald-600", bg: "bg-emerald-50", change: null },
          { icon: Monitor, label: "Tài sản", value: stats?.totalAssets ?? 0, color: "text-purple-600", bg: "bg-purple-50", change: null },
          { icon: Users, label: "Người dùng", value: stats?.totalUsers ?? 0, color: "text-amber-600", bg: "bg-amber-50", change: null },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 py-3.5">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon size={20} className={s.color} />
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold text-gray-900 leading-tight">{loading ? "-" : s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="px-4 mt-3 space-y-3" id="charts">
        {stats && (
          <>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs font-semibold text-gray-900 mb-2">Ticket theo trạng thái</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={stats.ticketsByStatus}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="status" tickFormatter={(v) => statusLabel[v] || v} tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: any) => [v, "SL"]} labelFormatter={(v: any) => statusLabel[v] || v} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {stats.ticketsByStatus.map((_, i) => (<Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs font-semibold text-gray-900 mb-2">Tài sản theo loại</p>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={stats.assetsByType} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={60} innerRadius={30}>
                      {stats.assetsByType.map((_, i) => (<Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Feed: Recent Tickets - Facebook style */}
      <div className="px-4 mt-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900">Bảng tin hoạt động</h2>
          <Link href="/tickets" className="text-xs text-primary font-medium flex items-center gap-0.5">
            Xem tất cả <ArrowRight size={12} />
          </Link>
        </div>
        <div className="space-y-3">
          {(stats?.recentTickets ?? []).map((t, i) => (
            <Link key={t.id} href={`/tickets/${t.id}`} className="block">
              <div className="bg-white rounded-xl border border-border/50 overflow-hidden active:scale-[0.99] transition-transform">
                <div className="p-3.5 pb-2">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold",
                      parseInt(t.priority) >= 4 ? "bg-red-50 text-red-600" : parseInt(t.priority) >= 3 ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {(t.title || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold text-gray-900">{t.assignedTo?.name || "Hệ thống"}</span>
                        <span className="text-xs text-muted-foreground">đã tạo ticket</span>
                      </div>
                      <p className="text-sm font-medium text-gray-800 mt-0.5 line-clamp-2">{t.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={t.status === "resolved" || t.status === "closed" ? "success" : t.status === "in_progress" ? "warning" : "primary"} size="sm">
                          {statusLabel[t.status] || t.status}
                        </Badge>
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock size={10} />{t.createdAt ? new Date(t.createdAt).toLocaleDateString("vi-VN") : ""}
                        </span>
                      </div>
                    </div>
                    <button className="p-1 text-gray-300 hover:text-gray-500"><MoreHorizontal size={16} /></button>
                  </div>
                </div>
                <div className="flex items-center border-t border-gray-50 mx-3.5">
                  <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors">
                    <ThumbsUp size={14} /> Thích
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground hover:text-emerald-600 hover:bg-gray-50 rounded-lg transition-colors">
                    <MessageSquare size={14} /> Bình luận
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground hover:text-primary hover:bg-gray-50 rounded-lg transition-colors">
                    <Share2 size={14} /> Chia sẻ
                  </button>
                </div>
              </div>
            </Link>
          ))}
          {(!stats?.recentTickets || stats.recentTickets.length === 0) && (
            <div className="flex flex-col items-center py-10 text-muted-foreground">
              <Ticket size={36} className="text-gray-300 mb-2" />
              <p className="text-sm">Chưa có hoạt động nào</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
