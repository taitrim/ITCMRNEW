"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Ticket, Monitor, Users, AlertCircle, TrendingUp, Clock, CheckCircle2, Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

type Stats = {
  totalTickets: number; openTickets: number; resolvedTickets: number;
  totalAssets: number; totalUsers: number; totalArticles: number;
  ticketsByStatus: { status: string; count: number }[];
  assetsByType: { type: string; count: number }[];
  recentTickets: { id: string; title: string; status: string; priority: string; assignedTo: { name: string } | null }[];
};

const statusLabel: Record<string, string> = {
  new: "Mới", assigned: "Đã phân công", in_progress: "Đang xử lý",
  pending: "Chờ", resolved: "Đã giải quyết", closed: "Đã đóng",
};

const priorityBadge: Record<string, string> = {
  low: "default", medium: "primary", high: "warning", urgent: "danger", critical: "danger"
};

const STATUS_COLORS = ["#3b82f6", "#eab308", "#f97316", "#a855f7", "#22c55e", "#9ca3af"];
const TYPE_COLORS = ["#6366f1", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];

export default function DashboardPage() {
  const { data: session } = useSession();
  if (!session?.user) redirect("/login");

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats").then(r => r.json()).then(d => { setStats(d); setLoading(false); });
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Chào mừng trở lại, {session.user.name}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock size={14} />
          <span>{new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Ticket, label: "Ticket đang mở", value: stats?.openTickets ?? 0, color: "text-primary", bg: "bg-primary-50" },
          { icon: CheckCircle2, label: "Đã giải quyết", value: stats?.resolvedTickets ?? 0, color: "text-emerald-600", bg: "bg-emerald-50" },
          { icon: Monitor, label: "Tổng tài sản", value: stats?.totalAssets ?? 0, color: "text-purple-600", bg: "bg-purple-50" },
          { icon: Users, label: "Người dùng", value: stats?.totalUsers ?? 0, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 py-5">
              <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon size={22} className={s.color} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900">{loading ? "-" : s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Ticket theo trạng thái</CardTitle>
            {stats && <Badge variant="primary">Tổng: {stats.totalTickets}</Badge>}
          </CardHeader>
          <CardContent>
            {stats ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.ticketsByStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="status" tickFormatter={(v) => statusLabel[v] || v} tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: any) => [v, "Số lượng"]} labelFormatter={(v: any) => statusLabel[v] || v} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {stats.ticketsByStatus.map((_, i) => (
                      <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[280px] flex items-center justify-center text-muted-foreground">Đang tải...</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tài sản theo loại</CardTitle>
            {stats && <Badge variant="primary">Tổng: {stats.totalAssets}</Badge>}
          </CardHeader>
          <CardContent>
            {stats ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={stats.assetsByType} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={90} innerRadius={50}
                    label={({ type, count }: any) => `${type}: ${count}`} labelLine={false}>
                    {stats.assetsByType.map((_, i) => (
                      <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-[280px] flex items-center justify-center text-muted-foreground">Đang tải...</div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ticket gần đây</CardTitle>
          <Badge variant="primary">{stats?.recentTickets?.length || 0} mới nhất</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {(stats?.recentTickets ?? []).map((t) => (
              <div key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    t.status === "resolved" || t.status === "closed" ? "bg-emerald-400" :
                    t.status === "in_progress" ? "bg-orange-400" :
                    t.status === "new" ? "bg-blue-400" : "bg-gray-400"
                  }`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.assignedTo?.name || "Chưa gán"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={(priorityBadge[t.priority] || "default") as any}>{t.priority}</Badge>
                  <Badge>{statusLabel[t.status] || t.status}</Badge>
                </div>
              </div>
            ))}
            {(!stats?.recentTickets || stats.recentTickets.length === 0) && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">Chưa có ticket nào</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
