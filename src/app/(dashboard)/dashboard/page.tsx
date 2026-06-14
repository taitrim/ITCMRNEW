"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Ticket, Monitor, Users, CheckCircle2, TrendingUp, Bell, AlertCircle, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

type Stats = {
  totalTickets: number; openTickets: number; resolvedTickets: number;
  totalAssets: number; totalUsers: number;
  ticketsByStatus: { status: string; count: number }[];
  assetsByType: { type: string; count: number }[];
  recentTickets: { id: string; title: string; status: string; priority: string; assignedTo: { name: string } | null }[];
};

const statusLabel: Record<string, string> = { new: "Mới", assigned: "Đã phân công", in_progress: "Đang xử lý", pending: "Chờ", resolved: "Đã giải quyết", closed: "Đã đóng" };
const STATUS_COLORS = ["#3b82f6", "#eab308", "#f97316", "#a855f7", "#22c55e", "#9ca3af"];

export default function DashboardPage() {
  const { data: session } = useSession();
  if (!session?.user) redirect("/login");

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats").then(r => r.json()).then(d => { setStats(d); setLoading(false); });
  }, []);

  const quickActions = [
    { href: "/tickets/create", label: "Tạo ticket", icon: Ticket, color: "bg-blue-500", textColor: "text-white" },
    { href: "/tickets?filter=my", label: "Ticket của tôi", icon: AlertCircle, color: "bg-orange-500", textColor: "text-white" },
    { href: "/assets", label: "Tài sản", icon: Monitor, color: "bg-emerald-500", textColor: "text-white" },
    { href: "/knowledge", label: "Tra cứu", icon: TrendingUp, color: "bg-purple-500", textColor: "text-white" },
  ];

  return (
    <div className="min-h-screen bg-surface-secondary/30 pb-4">
      {/* Stories-style action bar */}
      <div className="bg-white border-b border-border">
        <div className="flex gap-2 p-4 overflow-x-auto no-scrollbar">
          <div className="w-16 flex-shrink-0 space-y-1">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center text-white shadow-md">
              <Bell size={28} />
            </div>
            <p className="text-[10px] text-center text-muted-foreground">Thông báo</p>
          </div>
          {quickActions.map((a) => (
            <Link key={a.href} href={a.href} className="w-16 flex-shrink-0 space-y-1">
              <div className={`w-16 h-16 rounded-2xl ${a.color} flex items-center justify-center shadow-md ${a.textColor}`}>
                <a.icon size={26} />
              </div>
              <p className="text-[10px] text-center text-muted-foreground leading-tight">{a.label}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Welcome */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold text-gray-900">Xin chào, {session.user.name}</h1>
        <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      {/* Stat Cards - Facebook style */}
      <div className="px-4 grid grid-cols-2 gap-2.5">
        {[
          { icon: Ticket, label: "Ticket mở", value: stats?.openTickets ?? 0, color: "text-blue-600", bg: "bg-blue-50" },
          { icon: CheckCircle2, label: "Đã xong", value: stats?.resolvedTickets ?? 0, color: "text-emerald-600", bg: "bg-emerald-50" },
          { icon: Monitor, label: "Tài sản", value: stats?.totalAssets ?? 0, color: "text-purple-600", bg: "bg-purple-50" },
          { icon: Users, label: "Người dùng", value: stats?.totalUsers ?? 0, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 py-3.5">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon size={20} className={s.color} />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{loading ? "-" : s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="px-4 mt-3 space-y-3">
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

      {/* Recent Tickets - Facebook feed style */}
      <div className="px-4 mt-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900">Ticket gần đây</h2>
          <Link href="/tickets" className="text-xs text-primary font-medium flex items-center gap-0.5">
            Xem tất cả <ArrowRight size={12} />
          </Link>
        </div>
        <div className="space-y-2">
          {(stats?.recentTickets ?? []).map((t, i) => (
            <Link key={t.id} href={`/tickets/${t.id}`} className="block animate-in-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="bg-white rounded-xl p-3.5 shadow-xs border border-border active:scale-[0.98] transition-transform">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
                    t.priority === "high" || t.priority === "urgent" || t.priority === "critical" ? "bg-red-50" : "bg-blue-50"
                  )}>
                    <Ticket size={16} className={t.priority === "high" || t.priority === "urgent" || t.priority === "critical" ? "text-red-500" : "text-blue-500"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-1">{t.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={t.status === "resolved" || t.status === "closed" ? "success" : t.status === "in_progress" ? "warning" : "primary"} size="sm">
                        {statusLabel[t.status] || t.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{t.assignedTo?.name || "Chưa gán"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
          {(!stats?.recentTickets || stats.recentTickets.length === 0) && (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <Ticket size={32} className="text-gray-300 mb-2" />
              <p className="text-sm">Chưa có ticket nào</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
