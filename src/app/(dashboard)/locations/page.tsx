"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

type Location = { id: string; name: string; building: string | null; room: string | null; _count: { assets: number; users: number } };

export default function LocationsPage() {
  const { data: session } = useSession();
  if (!session?.user) redirect("/login");

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/locations").then(r => r.json()).then(d => { setLocations(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-surface-secondary/30 pb-4">
      <div className="px-4 pt-3 pb-2 bg-white border-b border-border">
        <h1 className="text-base font-bold">Vị trí</h1>
        <p className="text-xs text-muted-foreground">Quản lý địa điểm và văn phòng</p>
      </div>
      <div className="px-4 mt-3 space-y-2.5">
        {locations.length === 0 ? <div className="flex flex-col items-center py-16 text-muted-foreground"><MapPin size={48} className="text-gray-300 mb-3" /><p>Chưa có vị trí</p></div>
        : locations.map((l, i) => (
          <div key={l.id} className="animate-in-up bg-white rounded-xl p-4 shadow-xs border border-border" style={{ animationDelay: `${i * 30}ms` }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><MapPin size={20} className="text-amber-600" /></div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm text-gray-900">{l.name}</h3>
                <p className="text-xs text-muted-foreground">{l.building}{l.room ? ` - ${l.room}` : ""}</p>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                  <span>{l._count.assets} tài sản</span>
                  <span>{l._count.users} người dùng</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
