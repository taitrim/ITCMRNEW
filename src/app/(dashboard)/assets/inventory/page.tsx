"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { Box, Code, Monitor } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Agent = { id: string; name: string; deviceId: string; lastContact: string | null; lastIp: string | null; isActive: boolean; _count: { inventories: number } };

export default function InventoryPage() {
  const { data: session } = useSession();
  if (!session?.user) redirect("/login");

  const [agents, setAgents] = useState<Agent[]>([]);
  const [dynamicAssets, setDynamicAssets] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agent/inventory/list").then(r => r.json()).then(d => { setAgents(d.agents); setDynamicAssets(d.dynamicAssets); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-surface-secondary/30 pb-4">
      <div className="px-4 pt-3 pb-2 bg-white border-b border-border">
        <h1 className="text-base font-bold">Inventory Agent</h1>
        <p className="text-xs text-muted-foreground">Thu thập thông tin thiết bị từ xa</p>
      </div>

      <div className="px-4 mt-3 grid grid-cols-2 gap-2.5">
        <Card><CardContent className="flex items-center gap-3 py-3.5">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center"><Box size={20} className="text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Agent</p><p className="text-lg font-bold">{agents.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 py-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><Monitor size={20} className="text-emerald-600" /></div>
          <div><p className="text-xs text-muted-foreground">Tài sản động</p><p className="text-lg font-bold">{dynamicAssets}</p></div>
        </CardContent></Card>
      </div>

      <div className="px-4 mt-3 space-y-2.5">
        {agents.map((a, i) => (
          <div key={a.id} className="animate-in-up bg-white rounded-xl p-4 shadow-xs border border-border" style={{ animationDelay: `${i * 30}ms` }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center"><Code size={20} className="text-gray-600" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-medium text-sm text-gray-900">{a.name}</h3>
                  <Badge variant={a.isActive ? "success" : "default"} size="sm">{a.isActive ? "Hoạt động" : "Tắt"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{a.deviceId}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                  <span>{a._count.inventories} lần</span>
                  <span>•</span>
                  <span>{a.lastContact ? new Date(a.lastContact).toLocaleString("vi-VN") : "Chưa kết nối"}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {agents.length === 0 && (
          <div className="flex flex-col items-center py-16 text-muted-foreground">
            <Box size={48} className="text-gray-300 mb-3" />
            <p>Chưa có agent kết nối</p>
            <pre className="text-xs mt-2 bg-gray-100 px-3 py-2 rounded-lg">pwsh agent\inventory-agent.ps1</pre>
          </div>
        )}
      </div>
    </div>
  );
}
