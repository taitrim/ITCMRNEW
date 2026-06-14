"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { FileText, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Contract = { id: string; name: string; contractType: string; cost: number | null; startDate: string | null; endDate: string | null; renewalType: string; supplier: { name: string } | null };

export default function ContractsPage() {
  const { data: session } = useSession();
  if (!session?.user) redirect("/login");

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/contracts").then(r => r.json()).then(d => { setContracts(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-surface-secondary/30 pb-4">
      <div className="px-4 pt-3 pb-2 bg-white border-b border-border">
        <h1 className="text-base font-bold">Hợp đồng</h1>
        <p className="text-xs text-muted-foreground">Quản lý hợp đồng dịch vụ</p>
      </div>
      <div className="px-4 mt-3 space-y-2.5">
        {contracts.length === 0 ? <div className="flex flex-col items-center py-16 text-muted-foreground"><FileText size={48} className="text-gray-300 mb-3" /><p>Chưa có hợp đồng</p></div>
        : contracts.map((c, i) => {
          const expired = c.endDate && new Date(c.endDate) < new Date();
          return (
            <div key={c.id} className={`animate-in-up bg-white rounded-xl p-4 shadow-xs border ${expired ? "border-orange-200" : "border-border"}`} style={{ animationDelay: `${i * 30}ms` }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0"><FileText size={20} className="text-blue-600" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-medium text-sm text-gray-900">{c.name}</h3>
                    {expired && <Badge variant="warning" size="sm">Hết hạn</Badge>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="primary" size="sm" className="capitalize">{c.contractType}</Badge>
                    {c.cost && <span className="text-xs text-muted-foreground">{c.cost.toLocaleString("vi-VN")}đ</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{c.supplier?.name}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
