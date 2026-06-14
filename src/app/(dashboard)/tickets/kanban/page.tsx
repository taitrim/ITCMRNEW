import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

const columns = ["new", "assigned", "in_progress", "pending", "resolved", "closed"];
const colLabel: Record<string, string> = {
  new: "Mới", assigned: "Đã phân công", in_progress: "Đang xử lý",
  pending: "Chờ", resolved: "Đã giải quyết", closed: "Đã đóng",
};
const colColor: Record<string, string> = {
  new: "bg-blue-100 border-blue-300", assigned: "bg-yellow-100 border-yellow-300",
  in_progress: "bg-orange-100 border-orange-300", pending: "bg-purple-100 border-purple-300",
  resolved: "bg-green-100 border-green-300", closed: "bg-gray-100 border-gray-300",
};
const priColor: Record<string, string> = {
  low: "bg-gray-200", medium: "bg-blue-200", high: "bg-orange-200", urgent: "bg-red-200", critical: "bg-red-300",
};

export default async function KanbanPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tickets = await prisma.ticket.findMany({
    where: { organizationId: session.user.organizationId!, isActive: true },
    include: { assignedTo: { select: { name: true } }, category: { select: { name: true, color: true } } },
    orderBy: { createdAt: "desc" },
  });

  const grouped = columns.map((s) => ({ status: s, label: colLabel[s], tickets: tickets.filter((t) => t.status === s) }));

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Kanban Board</h1>
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "70vh" }}>
        {grouped.map((col) => (
          <div key={col.status} className={`flex-shrink-0 w-72 rounded-xl border-2 ${colColor[col.status]} p-3`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">{col.label}</h3>
              <span className="text-xs bg-white/60 rounded-full px-2 py-0.5">{col.tickets.length}</span>
            </div>
            <div className="space-y-2">
              {col.tickets.map((t) => (
                <div key={t.id} className="rounded-lg bg-white p-3 shadow-sm text-sm">
                  <div className="flex items-center gap-1 mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${priColor[t.priority]} font-medium`}>
                      {t.priority === "low" ? "Thấp" : t.priority === "medium" ? "TB" : t.priority === "high" ? "Cao" : "Gấp"}
                    </span>
                    <span className="text-[10px] text-gray-400">{t.type === "incident" ? "Sự cố" : "YC"}</span>
                  </div>
                  <p className="font-medium text-sm leading-tight">{t.title}</p>
                  {t.category && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: t.category.color || "#ccc" }} />
                      {t.category.name}
                    </p>
                  )}
                  {t.assignedTo && <p className="text-xs text-gray-400 mt-1">{t.assignedTo.name}</p>}
                </div>
              ))}
              {col.tickets.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">Trống</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
