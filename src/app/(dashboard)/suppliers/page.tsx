"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Supplier = { id: string; name: string; supplierType: string; contactName: string | null; email: string | null; phone: string | null; _count: { contracts: number } };

export default function SuppliersPage() {
  
  const { data: session, status } = useSession();

  const router = useRouter();

  useEffect(() => {

    if (status !== "loading" && !session?.user) router.replace("/login");

  }, [status, session]);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/suppliers").then(r => r.json()).then(d => { setSuppliers(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (status === "loading") return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-surface-secondary/30 pb-4">
      <div className="px-4 pt-3 pb-2 bg-white border-b border-border">
        <h1 className="text-base font-bold">Nhà cung cấp</h1>
        <p className="text-xs text-muted-foreground">Đối tác dịch vụ và thiết bị</p>
      </div>
      <div className="px-4 mt-3 space-y-2.5">
        {suppliers.length === 0 ? <div className="flex flex-col items-center py-16 text-muted-foreground"><Building2 size={48} className="text-gray-300 mb-3" /><p>Chưa có nhà cung cấp</p></div>
        : suppliers.map((s, i) => (
          <div key={s.id} className="animate-in-up bg-white rounded-xl p-4 shadow-xs border border-border" style={{ animationDelay: `${i * 30}ms` }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center font-bold text-primary text-sm flex-shrink-0">{s.name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-medium text-sm text-gray-900">{s.name}</h3>
                  <Badge variant="primary" size="sm" className="capitalize">{s.supplierType}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{s.contactName || s.email || s.phone || ""}</p>
                <p className="text-[10px] text-muted-foreground">{s._count.contracts} hợp đồng</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
