"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Article = { id: string; title: string; content: string; category: string | null; tags: string | null; views: number; createdAt: string };

const categoryColors: Record<string, any> = { software: "primary", hardware: "warning", network: "info", general: "default" };

export default function KnowledgePage() {
  
  const { data: session, status } = useSession();

  const router = useRouter();

  useEffect(() => {

    if (status !== "loading" && !session?.user) router.replace("/login");

  }, [status, session]);

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("");

  useEffect(() => {
    fetch("/api/knowledge").then(r => r.json()).then(d => { setArticles(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (status === "loading") return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const filtered = articles.filter(a => {
    if (cat && a.category !== cat) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !(a.content || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const categories = [...new Set(articles.map(a => a.category).filter(Boolean))];

  return (
    <div className="min-h-screen bg-surface-secondary/30 pb-4">
      <div className="px-4 pt-3 pb-2 bg-white border-b border-border">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 text-sm rounded-full bg-gray-100 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-primary/20"
            placeholder="Tìm kiếm bài viết..." />
        </div>
        {categories.length > 0 && (
          <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar">
            <button onClick={() => setCat("")}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${!cat ? "bg-primary text-white" : "bg-gray-100 text-gray-500"}`}>Tất cả</button>
            {categories.map((c) => (
              <button key={c} onClick={() => setCat(c!)}
                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${cat === c ? "bg-primary text-white" : "bg-gray-100 text-gray-500"}`}>{c}</button>
            ))}
          </div>
        )}
      </div>
      <div className="px-4 mt-3 space-y-2.5">
        {loading ? Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-2/3" /><div className="h-3 bg-gray-200 rounded w-full" />
          </div>
        )) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-muted-foreground"><BookOpen size={48} className="text-gray-300 mb-3" /><p>Không có bài viết</p></div>
        ) : filtered.map((a, i) => (
          <div key={a.id} className="animate-in-up bg-white rounded-xl p-4 shadow-xs border border-border" style={{ animationDelay: `${i * 30}ms` }}>
            <div className="flex items-start justify-between mb-1">
              <Badge variant={(categoryColors[a.category ?? ""] || "default") as any} size="sm">{a.category}</Badge>
              <span className="text-[10px] text-muted-foreground">{a.views} lượt xem</span>
            </div>
            <h3 className="font-medium text-sm text-gray-900">{a.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content.slice(0, 150)}...</p>
          </div>
        ))}
      </div>
    </div>
  );
}
