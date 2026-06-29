"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shield, Calendar, Building2, MapPin, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Cert = { id: string; name: string; serial: string | null; dateExpiration: string | null; certificatetypes: { name: string } | null; manufacturers: { name: string } | null; users: { name: string } | null; locations: { name: string } | null; states: { name: string } | null; };

export default function CertificatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "loading" && !session?.user) router.replace("/login");
  }, [status, session]);

  useEffect(() => {
    fetch("/api/certificates").then(r => r.json()).then(d => { setItems(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  if (status === "loading") return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-surface-secondary/30 pb-4">
      <div className="px-4 pt-3 pb-2 bg-white border-b border-border">
        <h1 className="text-base font-bold">Chứng chỉ</h1>
        <p className="text-xs text-muted-foreground">Quản lý chứng chỉ số</p>
      </div>
      <div className="px-4 mt-3 space-y-2.5">
        {loading ? [1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)
        : items.length === 0 ? <div className="flex flex-col items-center py-16 text-muted-foreground"><Shield size={48} className="text-gray-300 mb-3" /><p>Chưa có chứng chỉ</p></div>
        : items.map((item) => {
          const expired = item.dateExpiration && new Date(item.dateExpiration) < new Date();
          return (
            <div key={item.id} className="bg-white rounded-xl p-4 border border-border/50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0"><Shield size={20} className="text-rose-600" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-medium text-sm">{item.name}</h3>
                    {expired && <Badge variant="warning" size="sm">Hết hạn</Badge>}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                    {item.certificatetypes && <Badge variant="primary" size="sm">{item.certificatetypes.name}</Badge>}
                    {item.manufacturers && <span className="flex items-center gap-1"><Building2 size={11} />{item.manufacturers.name}</span>}
                    {item.dateExpiration && <span className="flex items-center gap-1"><Calendar size={11} />{new Date(item.dateExpiration).toLocaleDateString("vi-VN")}</span>}
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
