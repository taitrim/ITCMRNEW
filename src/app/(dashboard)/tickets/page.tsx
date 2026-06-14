import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";

const statusBadge = (s: string) => {
  const colors: Record<string, string> = {
    new: "bg-blue-100 text-blue-700", assigned: "bg-yellow-100 text-yellow-700",
    in_progress: "bg-orange-100 text-orange-700", pending: "bg-purple-100 text-purple-700",
    resolved: "bg-green-100 text-green-700", closed: "bg-gray-100 text-gray-500",
  };
  return colors[s] || "bg-gray-100 text-gray-600";
};

const priorityBadge = (p: string) => {
  const colors: Record<string, string> = {
    low: "bg-gray-100 text-gray-600", medium: "bg-blue-100 text-blue-700",
    high: "bg-orange-100 text-orange-700", urgent: "bg-red-100 text-red-700", critical: "bg-red-100 text-red-700",
  };
  return colors[p] || "bg-gray-100 text-gray-600";
};

const statusLabel: Record<string, string> = {
  new: "Mới", assigned: "Đã phân công", in_progress: "Đang xử lý",
  pending: "Chờ", resolved: "Đã giải quyết", closed: "Đã đóng",
};

const priorityLabel: Record<string, string> = {
  low: "Thấp", medium: "Trung bình", high: "Cao", urgent: "Gấp", critical: "Nguy kịch",
};

export default async function TicketsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tickets = await prisma.ticket.findMany({
    where: { organizationId: session.user.organizationId!, isActive: true },
    include: {
      assignedTo: { select: { name: true } },
      category: { select: { name: true, color: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quản lý Ticket</h1>
        <span className="text-sm text-gray-400">Tổng: {tickets.length}</span>
      </div>

      <div className="flex gap-2">
        {["new", "assigned", "in_progress", "resolved", "closed"].map((s) => (
          <span key={s} className="text-xs text-gray-500 flex items-center gap-1">
            <span className={`inline-block w-2 h-2 rounded-full ${s === "new" ? "bg-blue-500" : s === "assigned" ? "bg-yellow-500" : s === "in_progress" ? "bg-orange-500" : s === "resolved" ? "bg-green-500" : "bg-gray-400"}`} />
            {statusLabel[s]}: {tickets.filter((t) => t.status === s).length}
          </span>
        ))}
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-3 font-medium">Tiêu đề</th>
              <th className="text-left p-3 font-medium">Loại</th>
              <th className="text-left p-3 font-medium">Danh mục</th>
              <th className="text-left p-3 font-medium">Phân công</th>
              <th className="text-left p-3 font-medium">Độ ưu tiên</th>
              <th className="text-left p-3 font-medium">Trạng thái</th>
              <th className="text-left p-3 font-medium">Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} className="border-b hover:bg-gray-50">
                <td className="p-3">
                  <p className="font-medium">{t.title}</p>
                  {t.description && <p className="text-xs text-gray-400 truncate max-w-xs">{t.description}</p>}
                </td>
                <td className="p-3 capitalize">{t.type === "incident" ? "Sự cố" : "Yêu cầu"}</td>
                <td className="p-3">
                  {t.category && (
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: t.category.color || "#ccc" }} />
                      {t.category.name}
                    </span>
                  )}
                </td>
                <td className="p-3 text-gray-500">{t.assignedTo?.name || "Chưa phân công"}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityBadge(t.priority)}`}>
                    {priorityLabel[t.priority] || t.priority}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(t.status)}`}>
                    {statusLabel[t.status] || t.status}
                  </span>
                </td>
                <td className="p-3 text-xs text-gray-400">
                  {new Date(t.createdAt).toLocaleDateString("vi-VN")}
                </td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-gray-400">Chưa có ticket nào</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
