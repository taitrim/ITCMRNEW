import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

const categoryIcon: Record<string, string> = {
  networking: "🌐", hardware: "💻", software: "💿", general: "📋",
};

export default async function KnowledgePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const articles = await prisma.knowledgeBaseArticle.findMany({
    where: { organizationId: session.user.organizationId! },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cơ sở kiến thức</h1>
        <span className="text-sm text-gray-400">{articles.length} bài viết</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <div key={a.id} className="rounded-xl border bg-white p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{categoryIcon[a.category as string] || "📄"}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{a.title}</h3>
                <p className="text-xs text-gray-400 mt-1 line-clamp-3 whitespace-pre-line">{a.content}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                  <span>{a.views} lượt xem</span>
                  {a.isPublic && <span className="text-green-600">Công khai</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
        {articles.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            Chưa có bài viết nào trong cơ sở kiến thức
          </div>
        )}
      </div>
    </div>
  );
}
