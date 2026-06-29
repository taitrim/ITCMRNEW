"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Wallet, Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Budget = { id: string; name: string; value: number | null; beginDate: string | null; endDate: string | null; locations: { name: string } | null; budgettypes: { name: string } | null; comment: string | null; };

export default function BudgetsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "loading" && !session?.user) router.replace("/login");
  }, [status, session]);

  useEffect(() => {
    fetch("/api/budgets").then(r => r.json()).then(d => { setItems(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  if (status === "loading") return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-surface-secondary/30 pb-4">
      <div className="px-4 pt-3 pb-2 bg-white border-b border-border">
        <h1 className="text-base font-bold">Ngân sách</h1>
        <p className="text-xs text-muted-foreground">Quản lý ngân sách</p>
      </div>
      <div className="px-4 mt-3 space-y-2.5">
        {loading ? [1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)
        : items.length === 0 ? <div className="flex flex-col items-center py-16 text-muted-foreground"><Wallet size={48} className="text-gray-300 mb-3" /><p>Chưa có ngân sách</p></div>
        : items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl p-4 border border-border/50">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0"><Wallet size={20} className="text-emerald-600" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-medium text-sm">{item.name}</h3>
                  {item.value != null && <span className="text-sm font-semibold text-emerald-600">{item.value.toLocaleString("vi-VN")}đ</span>}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {item.budgettypes && <Badge variant="primary" size="sm">{item.budgettypes.name}</Badge>}
                  {item.beginDate && <span className="flex items-center gap-1"><Calendar size={11} />{new Date(item.beginDate).toLocaleDateString("vi-VN")}</span>}
                  {item.locations && <span className="flex items-center gap-1"><MapPin size={11} />{item.locations.name}</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
