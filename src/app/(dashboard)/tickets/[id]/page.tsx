"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, MessageSquare, Plus, Send, CheckCircle2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const statuses = ["new", "assigned", "in_progress", "pending", "resolved", "closed"];
const statusVariant: Record<string, any> = {
  new: "primary", assigned: "warning", in_progress: "warning", pending: "purple", resolved: "success", closed: "default",
};
const statusLabel: Record<string, string> = {
  new: "Mới", assigned: "Đã phân công", in_progress: "Đang xử lý", pending: "Chờ", resolved: "Đã giải quyết", closed: "Đã đóng",
};

type TicketData = {
  id: string; title: string; description: string | null; type: string; status: string; priority: string;
  createdAt: string; organizationId: string;
  assignedTo: { name: string; email: string } | null;
  createdBy: { name: string };
  category: { name: string; color: string | null } | null;
  followups: { id: string; content: string; isPrivate: boolean; createdAt: string; user: { name: string } }[];
  tasks: { id: string; content: string; state: string }[];
};

export default function TicketDetailPage() {
  
  const { data: session, status } = useSession();

  const router = useRouter();

  useEffect(() => {

    if (status !== "loading" && !session?.user) router.replace("/login");

  }, [status, session]);

  const params = useParams();
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [followupText, setFollowupText] = useState("");
  const [taskText, setTaskText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/tickets/${params.id}`).then(r => r.json()).then(d => {
      if (d.error) return;
      setTicket(d); setLoading(false);
    });
  }, [params.id]);

  if (status === "loading") return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const updateStatus = async (status: string) => {
    const res = await fetch(`/api/tickets/${params.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) { setTicket(prev => prev ? { ...prev, status } : prev); }
  };

  const addFollowup = async () => {
    if (!followupText.trim()) return;
    setSending(true);
    const res = await fetch(`/api/tickets/${params.id}/followups`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: followupText }),
    });
    if (res.ok) {
      const f = await res.json();
      setTicket(prev => prev ? { ...prev, followups: [{ ...f, user: { name: session?.user?.name || "" } }, ...prev.followups] } : prev);
      setFollowupText("");
    }
    setSending(false);
  };

  const addTask = async () => {
    if (!taskText.trim()) return;
    const res = await fetch(`/api/tickets/${params.id}/tasks`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: taskText }),
    });
    if (res.ok) {
      const task = await res.json();
      setTicket(prev => prev ? { ...prev, tasks: [...prev.tasks, task] } : prev);
      setTaskText("");
    }
  };

  const toggleTask = async (taskId: string, state: string) => {
    const newState = state === "done" ? "todo" : "done";
    setTicket(prev => prev ? { ...prev, tasks: prev.tasks.map(t => t.id === taskId ? { ...t, state: newState } : t) } : prev);
    await fetch(`/api/tasks/${taskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: newState }) });
  };

  if (loading) return (
    <div className="p-4 space-y-3 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
      <div className="h-32 bg-gray-200 rounded-xl" />
    </div>
  );

  if (!ticket) return <div className="p-4 text-center text-muted-foreground">Không tìm thấy ticket</div>;

  const currentIdx = statuses.indexOf(ticket.status);

  return (
    <div className="min-h-screen bg-white pb-4">
      <div className="flex items-center gap-3 px-4 h-12 border-b border-border sticky top-0 bg-white z-10">
        <Link href="/tickets" className="p-1 -ml-1 text-gray-700"><ArrowLeft size={22} /></Link>
        <h1 className="font-semibold text-base truncate">{ticket.title}</h1>
      </div>

      <div className="px-4 py-3 border-b border-border bg-gray-50/50">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {statuses.map((s, i) => (
            <button key={s} onClick={() => i > currentIdx ? null : updateStatus(s)}
              disabled={i > currentIdx}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                s === ticket.status ? "bg-primary text-white shadow-xs" :
                i < currentIdx ? "bg-emerald-100 text-emerald-700" :
                "bg-gray-100 text-gray-400"
              )}
            >{statusLabel[s]}</button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 space-y-1 text-xs text-muted-foreground border-b border-border flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-1"><User size={12} />{ticket.createdBy.name}</span>
        <span className="flex items-center gap-1"><Calendar size={12} />{new Date(ticket.createdAt).toLocaleString("vi-VN")}</span>
        {ticket.assignedTo && <span>Giao: {ticket.assignedTo.name}</span>}
        {ticket.category && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: ticket.category.color || "#ccc" }} />
            {ticket.category.name}
          </span>
        )}
      </div>

      {ticket.description && (
        <div className="px-4 py-4 border-b border-border">
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
        </div>
      )}

      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare size={16} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold text-gray-900">Theo dõi ({ticket.followups.length})</h3>
        </div>
        <div className="flex gap-2 mb-3">
          <input value={followupText} onChange={(e) => setFollowupText(e.target.value)}
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Thêm bình luận..." />
          <Button onClick={addFollowup} loading={sending} size="md"><Send size={16} /></Button>
        </div>
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {ticket.followups.map((f) => (
            <div key={f.id} className="flex gap-2.5 animate-in">
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0 mt-0.5">
                {f.user.name?.[0] || "?"}
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-900">{f.user.name}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(f.createdAt).toLocaleString("vi-VN")}</span>
                </div>
                <p className="text-sm text-gray-700 mt-0.5">{f.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Tasks ({ticket.tasks.length})</h3>
        <div className="space-y-2">
          {ticket.tasks.map((t) => (
            <label key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 cursor-pointer active:bg-gray-100 transition-colors">
              <input type="checkbox" checked={t.state === "done"} onChange={() => toggleTask(t.id, t.state)}
                className="w-5 h-5 rounded-full border-2 border-gray-300 accent-primary" />
              <span className={cn("text-sm flex-1", t.state === "done" && "line-through text-muted-foreground")}>{t.content}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <input value={taskText} onChange={(e) => setTaskText(e.target.value)}
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Thêm task..." />
          <Button onClick={addTask} variant="secondary"><Plus size={16} /></Button>
        </div>
      </div>
    </div>
  );
}
