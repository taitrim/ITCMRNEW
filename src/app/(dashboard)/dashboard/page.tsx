import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.organizationId!;

  const [totalAssets, activeTickets, totalKb, totalContracts] = await Promise.all([
    prisma.asset.count({ where: { organizationId: orgId, isActive: true } }),
    prisma.ticket.count({ where: { organizationId: orgId, isActive: true, status: { not: "closed" } } }),
    prisma.knowledgeBaseArticle.count({ where: { organizationId: orgId } }),
    prisma.contract.count({ where: { organizationId: orgId, isActive: true } }),
  ]);

  const recentTickets = await prisma.ticket.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { assignedTo: { select: { name: true } }, category: { select: { name: true } } },
  });

  const ticketByStatus = await prisma.ticket.groupBy({
    by: ["status"],
    where: { organizationId: orgId },
    _count: true,
  });

  const statusCounts: Record<string, number> = {};
  ticketByStatus.forEach((s) => { statusCounts[s.status] = s._count; });

  const assetByType = await prisma.asset.groupBy({
    by: ["assetType"],
    where: { organizationId: orgId, isActive: true },
    _count: true,
  });

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-blue-100 text-blue-700",
      assigned: "bg-yellow-100 text-yellow-700",
      in_progress: "bg-orange-100 text-orange-700",
      pending: "bg-purple-100 text-purple-700",
      resolved: "bg-green-100 text-green-700",
      closed: "bg-gray-100 text-gray-500",
    };
    return colors[status] || "bg-gray-100 text-gray-600";
  };

  const statusLabel = (s: string) => {
    const labels: Record<string, string> = {
      new: "Mới", assigned: "Đã phân công", in_progress: "Đang xử lý",
      pending: "Chờ", resolved: "Đã giải quyết", closed: "Đã đóng",
    };
    return labels[s] || s;
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Tổng quan</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <Link href="/assets" className="rounded-xl border bg-white p-4 hover:shadow-md transition-shadow">
          <p className="text-sm text-gray-500">Tài sản</p>
          <p className="text-3xl font-bold text-blue-600">{totalAssets}</p>
        </Link>
        <Link href="/tickets" className="rounded-xl border bg-white p-4 hover:shadow-md transition-shadow">
          <p className="text-sm text-gray-500">Ticket đang xử lý</p>
          <p className="text-3xl font-bold text-orange-600">{activeTickets}</p>
        </Link>
        <Link href="/knowledge" className="rounded-xl border bg-white p-4 hover:shadow-md transition-shadow">
          <p className="text-sm text-gray-500">Bài viết kiến thức</p>
          <p className="text-3xl font-bold text-green-600">{totalKb}</p>
        </Link>
        <Link href="/contracts" className="rounded-xl border bg-white p-4 hover:shadow-md transition-shadow">
          <p className="text-sm text-gray-500">Hợp đồng</p>
          <p className="text-3xl font-bold text-purple-600">{totalContracts}</p>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-semibold mb-3">Ticket theo trạng thái</h2>
          <div className="space-y-2">
            {["new", "assigned", "in_progress", "pending", "resolved", "closed"].map((s) => (
              <div key={s} className="flex items-center justify-between">
                <span className="text-sm">{statusLabel(s)}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-32 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full rounded-full ${s === "new" ? "bg-blue-500" : s === "in_progress" ? "bg-orange-500" : "bg-gray-300"}`}
                      style={{ width: `${Math.min(100, (statusCounts[s] || 0) * 20)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-6 text-right">{statusCounts[s] || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-semibold mb-3">Tài sản theo loại</h2>
          <div className="space-y-2">
            {assetByType.map((a) => (
              <div key={a.assetType} className="flex items-center justify-between">
                <span className="text-sm capitalize">{a.assetType === "network" ? "Mạng" : a.assetType === "computer" ? "Máy tính" : a.assetType}</span>
                <span className="text-sm font-medium">{a._count}</span>
              </div>
            ))}
            {assetByType.length === 0 && <p className="text-sm text-gray-400">Chưa có tài sản</p>}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Ticket gần đây</h2>
          <Link href="/tickets" className="text-sm text-blue-600 hover:underline">Xem tất cả</Link>
        </div>
        <div className="space-y-2">
          {recentTickets.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{t.title}</p>
                <p className="text-xs text-gray-400">
                  {t.category?.name} • {t.assignedTo?.name || "Chưa phân công"}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(t.status)}`}>
                {statusLabel(t.status)}
              </span>
            </div>
          ))}
          {recentTickets.length === 0 && <p className="text-sm text-gray-400">Chưa có ticket</p>}
        </div>
      </div>
    </div>
  );
}
