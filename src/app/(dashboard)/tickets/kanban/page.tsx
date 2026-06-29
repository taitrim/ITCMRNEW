import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

const STATUS_MAP: Record<string, number> = { new: 1, assigned: 2, in_progress: 3, pending: 4, resolved: 5, closed: 6 };
const colLabel: Record<string, string> = {
  new: "Mới", assigned: "Đã phân công", in_progress: "Đang xử lý",
  pending: "Chờ", resolved: "Đã giải quyết", closed: "Đã đóng",
};
const colColor: Record<string, string> = {
  new: "bg-blue-100 border-blue-300", assigned: "bg-yellow-100 border-yellow-300",
  in_progress: "bg-orange-100 border-orange-300", pending: "bg-purple-100 border-purple-300",
  resolved: "bg-green-100 border-green-300", closed: "bg-gray-100 border-gray-300",
};
const PRIORITY_MAP: Record<number, string> = { 1: "bg-gray-200", 2: "bg-blue-200", 3: "bg-orange-200", 4: "bg-red-200", 5: "bg-red-300", 6: "bg-red-400" };
const PRIORITY_LABEL: Record<number, string> = { 1: "Rất thấp", 2: "Thấp", 3: "TB", 4: "Cao", 5: "Rất cao", 6: "Khẩn" };

const columns = Object.keys(STATUS_MAP);

export default async function KanbanPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");

  const tickets = await prisma.tickets.findMany({
    where: { entitiesId: session.user.organizationId, isDeleted: false },
    include: {
      ticketUsers: { include: { users: { select: { name: true } } }, where: { type: 1 } },
      itilcategories: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const grouped = columns.map((s) => ({
    status: s,
    label: colLabel[s],
    tickets: tickets.filter((t) => t.status === STATUS_MAP[s]),
  }));

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
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PRIORITY_MAP[t.priority ?? 2] ?? "bg-gray-200"}`}>
                      {PRIORITY_LABEL[t.priority ?? 2] ?? "TB"}
                    </span>
                    <span className="text-[10px] text-gray-400">{t.type === 1 ? "Sự cố" : "YC"}</span>
                  </div>
                  <p className="font-medium text-sm leading-tight">{t.name}</p>
                  {t.itilcategories && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                      {t.itilcategories.name}
                    </p>
                  )}
                  {t.ticketUsers?.[0]?.users && <p className="text-xs text-gray-400 mt-1">{t.ticketUsers[0].users.name}</p>}
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
