"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Plus, Filter, Ticket, AlertCircle, MessageSquare, User, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusVariant: Record<string, any> = {
  new: "primary", assigned: "warning", in_progress: "warning", pending: "purple", resolved: "success", closed: "default",
};
const statusLabel: Record<string, string> = {
  new: "Mới", assigned: "Đã phân công", in_progress: "Đang xử lý", pending: "Chờ", resolved: "Đã giải quyết", closed: "Đã đóng",
};
const priorityColor: Record<string, string> = {
  low: "text-gray-400", medium: "text-blue-500", high: "text-orange-500", urgent: "text-red-500", critical: "text-red-600",
};

type TicketType = {
  id: string; title: string; type: string; status: string; priority: string; createdAt: string; description: string | null;
  assignedTo: { name: string } | null;
  category: { name: string; color: string | null } | null;
};

const filterTabs = [
  { value: "all", label: "Tất cả" },
  { value: "open", label: "Đang mở" },
  { value: "my", label: "Của tôi" },
  { value: "resolved", label: "Đã xong" },
];

export default function TicketsPage() {
  const { data: session } = useSession();
  if (!session?.user) redirect("/login");

  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    fetch("/api/tickets").then(r => r.json()).then(d => { setTickets(d); setLoading(false); });
  }, []);

  const filtered = tickets.filter((t) => {
    if (filter === "open") return !["resolved", "closed"].includes(t.status);
    if (filter === "my") return t.assignedTo?.name === session.user.name;
    if (filter === "resolved") return ["resolved", "closed"].includes(t.status);
    return true;
  }).filter((t) => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (search) return t.title.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const statusCounts = (status: string) => tickets.filter(t => t.status === status).length;

  return (
    <div className="min-h-screen bg-surface-secondary/30 pb-4">
      <div className="px-4 pt-3 pb-2 bg-white border-b border-border">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-sm rounded-full bg-gray-100 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-primary/20"
              placeholder="Tìm kiếm ticket..." />
          </div>
          <button onClick={() => setShowFilter(!showFilter)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <SlidersHorizontal size={18} />
          </button>
        </div>

        <div className="flex gap-1.5 mt-3 overflow-x-auto no-scrollbar">
          {filterTabs.map((t) => (
            <button key={t.value} onClick={() => setFilter(t.value)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                filter === t.value ? "bg-primary text-white" : "bg-gray-100 text-gray-600"
              )}
            >{t.label}</button>
          ))}
        </div>

        {showFilter && (
          <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar animate-in">
            <button onClick={() => setStatusFilter("")}
              className={cn("px-3 py-1 rounded-full text-xs whitespace-nowrap", !statusFilter ? "bg-primary text-white" : "bg-gray-100 text-gray-500")}>Tất cả</button>
            {Object.entries(statusLabel).map(([k, v]) => (
              <button key={k} onClick={() => setStatusFilter(k)}
                className={cn("px-3 py-1 rounded-full text-xs whitespace-nowrap", statusFilter === k ? "bg-primary text-white" : "bg-gray-100 text-gray-500")}>
                {v} ({statusCounts(k)})
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 mt-3 space-y-2.5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 space-y-2 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground animate-in">
            <Ticket size={48} className="text-gray-300 mb-3" />
            <p className="font-medium">Không có ticket nào</p>
            <p className="text-sm mt-1">Tạo ticket mới để bắt đầu</p>
          </div>
        ) : filtered.map((t, i) => (
          <Link key={t.id} href={`/tickets/${t.id}`} className="block animate-in-up" style={{ animationDelay: `${i * 30}ms` }}>
            <div className="bg-white rounded-xl p-4 shadow-xs border border-border active:scale-[0.98] transition-transform">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
                  t.type === "incident" ? "bg-red-50" : "bg-blue-50"
                )}>
                  {t.type === "incident" ? <AlertCircle size={18} className="text-red-500" /> : <MessageSquare size={18} className="text-blue-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={cn("w-2 h-2 rounded-full", priorityColor[t.priority]?.replace("text-", "bg-") || "bg-gray-400")} />
                    <Badge variant={statusVariant[t.status]} size="sm">{statusLabel[t.status]}</Badge>
                  </div>
                  <h3 className="font-medium text-sm text-gray-900 line-clamp-2 leading-snug">{t.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{t.description || ""}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {t.assignedTo && <span className="flex items-center gap-1"><User size={12} />{t.assignedTo.name}</span>}
                    <span>{new Date(t.createdAt).toLocaleDateString("vi-VN")}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300 mt-2 flex-shrink-0" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
