"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type License = { id: string; name: string; publisher: string | null; version: string | null; licenseType: string; maxUsers: number | null; cost: number | null; expirationDate: string | null; _count: { assignments: number } };

export default function LicensesPage() {
  
  const { data: session, status } = useSession();

  const router = useRouter();

  useEffect(() => {

    if (status !== "loading" && !session?.user) router.replace("/login");

  }, [status, session]);

  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/licenses").then(r => r.json()).then(d => { setLicenses(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (status === "loading") return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-surface-secondary/30 pb-4">
      <div className="px-4 pt-3 pb-2 bg-white border-b border-border">
        <h1 className="text-base font-bold">Bản quyền phần mềm</h1>
        <p className="text-xs text-muted-foreground">Quản lý giấy phép phần mềm</p>
      </div>
      <div className="px-4 mt-3 space-y-2.5">
        {licenses.length === 0 ? <div className="flex flex-col items-center py-16 text-muted-foreground"><KeyRound size={48} className="text-gray-300 mb-3" /><p>Chưa có bản quyền</p></div>
        : licenses.map((l, i) => (
          <div key={l.id} className="animate-in-up bg-white rounded-xl p-4 shadow-xs border border-border" style={{ animationDelay: `${i * 30}ms` }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center"><KeyRound size={20} className="text-purple-600" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-sm text-gray-900">{l.name}</h3>
                    <p className="text-xs text-muted-foreground">{l.publisher}{l.version ? ` v${l.version}` : ""}</p>
                  </div>
                  <Badge variant="purple" size="sm" className="capitalize flex-shrink-0">{l.licenseType}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span>Đã dùng: <strong>{l._count.assignments}</strong> / {l.maxUsers || "∞"}</span>
                  {l.cost && <span>• {l.cost.toLocaleString("vi-VN")}đ</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
