"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Monitor, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusVariant: Record<string, any> = { in_use: "success", stored: "default", repair: "warning", retired: "danger", broken: "danger" };
const statusLabel: Record<string, string> = { in_use: "Đang dùng", stored: "Lưu kho", repair: "Đang sửa", retired: "Đã thanh lý", broken: "Hỏng" };
const typeIcon: Record<string, string> = { computer: "💻", monitor: "🖥️", printer: "🖨️", network: "🌐", phone: "📱", software: "💿", peripheral: "🎮", other: "📦" };
const assetTypes = ["computer", "monitor", "printer", "network", "phone", "software", "peripheral", "other"];

type AssetType = {
  id: string; name: string; assetType: string; serialNumber: string | null; status: string;
  manufacturer: { name: string } | null; location: { name: string } | null; assignedTo: { name: string } | null;
};

export default function AssetsPage() {
  
  const { data: session, status } = useSession();

  const router = useRouter();

  useEffect(() => {

    if (status !== "loading" && !session?.user) router.replace("/login");

  }, [status, session]);
  const [assets, setAssets] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  useEffect(() => {

    fetch("/api/assets").then(r => r.json()).then(d => { setAssets(d); setLoading(false); });

  }, []);

  if (status === "loading") return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const filtered = assets.filter(a => {
    if (typeFilter && a.assetType !== typeFilter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !(a.serialNumber || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-surface-secondary/30 pb-4">
      <div className="px-4 pt-3 pb-2 bg-white border-b border-border">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-sm rounded-full bg-gray-100 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-primary/20"
              placeholder="Tìm kiếm tài sản..." />
          </div>
          <button onClick={() => setShowFilter(!showFilter)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <SlidersHorizontal size={18} />
          </button>
        </div>
        {showFilter && (
          <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar animate-in">
            <button onClick={() => setTypeFilter("")}
              className={cn("px-3 py-1 rounded-full text-xs whitespace-nowrap", !typeFilter ? "bg-primary text-white" : "bg-gray-100 text-gray-500")}>Tất cả</button>
            {assetTypes.map((t) => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={cn("px-3 py-1 rounded-full text-xs whitespace-nowrap", typeFilter === t ? "bg-primary text-white" : "bg-gray-100 text-gray-500")}>
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 mt-3 space-y-2.5">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 space-y-2 animate-pulse">
            <div className="flex items-center gap-3"><div className="w-9 h-9 bg-gray-200 rounded-full" /><div className="flex-1 space-y-1.5"><div className="h-4 bg-gray-200 rounded w-2/3" /><div className="h-3 bg-gray-200 rounded w-1/3" /></div></div>
          </div>
        )) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-muted-foreground animate-in">
            <Monitor size={48} className="text-gray-300 mb-3" />
            <p className="font-medium">Không có tài sản</p>
          </div>
        ) : filtered.map((a, i) => (
          <Link key={a.id} href={`/assets/${a.id}`} className="block animate-in-up" style={{ animationDelay: `${i * 30}ms` }}>
            <div className="bg-white rounded-xl p-4 shadow-xs border border-border active:scale-[0.98] transition-transform">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-lg flex-shrink-0">{typeIcon[a.assetType] || "📦"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-medium text-sm text-gray-900">{a.name}</h3>
                    <Badge variant={statusVariant[a.status]} size="sm">{statusLabel[a.status]}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {a.manufacturer && <span>{a.manufacturer.name}</span>}
                    {a.serialNumber && <span className="ml-2 font-mono">SN: {a.serialNumber}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    {a.location && <span>{a.location.name}</span>}
                    {a.assignedTo && <span>• {a.assignedTo.name}</span>}
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300 mt-1 flex-shrink-0" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
