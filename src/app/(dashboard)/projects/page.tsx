"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FolderKanban, User, ListTodo, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Project = { id: string; name: string; code: string | null; priority: number | null; content: string | null; planStartDate: string | null; planEndDate: string | null; percentDone: number | null; projectstates: { name: string } | null; projecttypes: { name: string } | null; users: { name: string } | null; _count: { projecttasks: number }; };

const priorityLabel: Record<number, string> = { 1: "Rất thấp", 2: "Thấp", 3: "Trung bình", 4: "Cao", 5: "Rất cao", 6: "Khẩn" };
const priorityColor: Record<number, string> = { 1: "bg-gray-100 text-gray-600", 2: "bg-blue-50 text-blue-600", 3: "bg-green-50 text-green-600", 4: "bg-orange-50 text-orange-600", 5: "bg-red-50 text-red-600", 6: "bg-red-100 text-red-700" };

export default function ProjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "loading" && !session?.user) router.replace("/login");
  }, [status, session]);

  useEffect(() => {
    fetch("/api/projects").then(r => r.json()).then(d => { setItems(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  if (status === "loading") return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-surface-secondary/30 pb-4">
      <div className="px-4 pt-3 pb-2 bg-white border-b border-border">
        <h1 className="text-base font-bold">Dự án</h1>
        <p className="text-xs text-muted-foreground">Quản lý dự án</p>
      </div>
      <div className="px-4 mt-3 space-y-2.5">
        {loading ? [1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)
        : items.length === 0 ? <div className="flex flex-col items-center py-16 text-muted-foreground"><FolderKanban size={48} className="text-gray-300 mb-3" /><p>Chưa có dự án</p></div>
        : items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl p-4 border border-border/50">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0"><FolderKanban size={20} className="text-violet-600" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-medium text-sm">{item.name}</h3>
                  {item.code && <span className="text-[10px] text-muted-foreground">{item.code}</span>}
                  {item.projectstates && <Badge variant="secondary" size="sm">{item.projectstates.name}</Badge>}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {item.priority && <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", priorityColor[item.priority])}>{priorityLabel[item.priority]}</span>}
                  {item.projecttypes && <Badge variant="primary" size="sm">{item.projecttypes.name}</Badge>}
                  {item.percentDone != null && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${item.percentDone}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{item.percentDone}%</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  {item.users && <span className="flex items-center gap-1"><User size={11} />{item.users.name}</span>}
                  <span className="flex items-center gap-1"><ListTodo size={11} />{item._count.projecttasks} tasks</span>
                  {item.planEndDate && <span className="flex items-center gap-1"><Calendar size={11} />{new Date(item.planEndDate).toLocaleDateString("vi-VN")}</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
