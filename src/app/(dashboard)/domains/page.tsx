"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Globe, Calendar, User, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Domain = { id: string; name: string; dateExpiration: string | null; users: { name: string } | null; domaintypes: { name: string } | null; isActive: number | null; comment: string | null };

export default function DomainsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "loading" && !session?.user) router.replace("/login");
  }, [status, session]);

  useEffect(() => {
    fetch("/api/domains").then(r => r.json()).then(d => { setItems(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  if (status === "loading") return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-surface-secondary/30 pb-4">
      <div className="px-4 pt-3 pb-2 bg-white border-b border-border">
        <h1 className="text-base font-bold">Domain</h1>
        <p className="text-xs text-muted-foreground">Quản lý tên miền</p>
      </div>
      <div className="px-4 mt-3 space-y-2.5">
        {loading ? [1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)
        : items.length === 0 ? <div className="flex flex-col items-center py-16 text-muted-foreground"><Globe size={48} className="text-gray-300 mb-3" /><p>Chưa có domain</p></div>
        : items.map((item) => {
          const expired = item.dateExpiration && new Date(item.dateExpiration) < new Date();
          return (
            <div key={item.id} className="bg-white rounded-xl p-4 border border-border/50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0"><Globe size={20} className="text-indigo-600" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-medium text-sm">{item.name}</h3>
                    {expired && <Badge variant="warning" size="sm">Hết hạn</Badge>}
                    {item.isActive === 0 && <Badge variant="secondary" size="sm">Không hoạt động</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {item.domaintypes && <Badge variant="primary" size="sm">{item.domaintypes.name}</Badge>}
                    {item.dateExpiration && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar size={11} />{new Date(item.dateExpiration).toLocaleDateString("vi-VN")}</span>}
                    {item.users && <span className="flex items-center gap-1 text-xs text-muted-foreground"><User size={11} />{item.users.name}</span>}
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
