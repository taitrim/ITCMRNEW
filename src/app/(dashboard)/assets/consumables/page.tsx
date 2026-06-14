"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Consumable = { id: string; name: string; type: string; stock: number; alertThreshold: number; price: number | null };

export default function ConsumablesPage() {
  const { data: session } = useSession();
  if (!session?.user) redirect("/login");

  const [items, setItems] = useState<Consumable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/consumables").then(r => r.json()).then(d => { setItems(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-surface-secondary/30 pb-4">
      <div className="px-4 pt-3 pb-2 bg-white border-b border-border">
        <h1 className="text-base font-bold">Vật tư tiêu hao</h1>
        <p className="text-xs text-muted-foreground">Quản lý vật tư, linh kiện</p>
      </div>
      <div className="px-4 mt-3 space-y-2.5">
        {items.length === 0 ? <div className="flex flex-col items-center py-16 text-muted-foreground"><Printer size={48} className="text-gray-300 mb-3" /><p>Chưa có vật tư</p></div>
        : items.map((c, i) => {
          const low = c.stock <= c.alertThreshold;
          return (
            <div key={c.id} className={`animate-in-up bg-white rounded-xl p-4 shadow-xs border ${low ? "border-orange-200" : "border-border"}`} style={{ animationDelay: `${i * 30}ms` }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center"><Printer size={20} className="text-orange-600" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium text-sm text-gray-900">{c.name}</h3>
                      <Badge variant="default" size="sm" className="capitalize">{c.type}</Badge>
                    </div>
                    {low && <Badge variant="warning" size="sm">Sắp hết</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs mt-1">
                    <span className="text-muted-foreground">Tồn kho:</span>
                    <span className={`font-bold ${low ? "text-orange-600" : "text-gray-900"}`}>{c.stock}</span>
                    <span className="text-muted-foreground">Ngưỡng: {c.alertThreshold}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
