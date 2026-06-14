import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Search, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function KnowledgePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const articles = await prisma.knowledgeBaseArticle.findMany({
    where: { organizationId: session.user.organizationId! },
    orderBy: { createdAt: "desc" },
  });

  const categoryColors: Record<string, string> = {
    software: "primary", hardware: "warning", network: "info", general: "default",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kiến thức</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Cơ sở tri thức IT</p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-white focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20 w-56" placeholder="Tìm kiếm bài viết..." />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <Card key={a.id} className="hover:shadow-md transition-all duration-200">
            <CardContent className="py-4 space-y-2">
              <div className="flex items-start justify-between">
                <Badge variant={(categoryColors[a.category ?? ""] || "default") as any} size="sm">{a.category}</Badge>
                <span className="text-xs text-muted-foreground">{a.views} lượt xem</span>
              </div>
              <h3 className="font-medium text-gray-900 text-sm leading-snug">{a.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{a.content.slice(0, 120)}...</p>
              <div className="flex items-center gap-2 pt-1 text-[10px] text-muted-foreground">
                <BookOpen size={12} />
                <span>{new Date(a.createdAt).toLocaleDateString("vi-VN")}</span>
                {a.tags && <span>• {a.tags}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
        {articles.length === 0 && (
          <div className="col-span-full flex flex-col items-center py-16 text-muted-foreground">
            <BookOpen size={40} className="mb-3 text-gray-300" />
            <p>Chưa có bài viết nào</p>
          </div>
        )}
      </div>
    </div>
  );
}
