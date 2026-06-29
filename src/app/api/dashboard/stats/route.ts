import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" });

  const orgId = session.user.organizationId!;
  const [totalTickets, openTickets, resolvedTickets, totalUsers, totalArticles] = await Promise.all([
    prisma.tickets.count({ where: { entitiesId: orgId } }),
    prisma.tickets.count({ where: { entitiesId: orgId, status: { in: [1, 2, 3, 4] } } }),
    prisma.tickets.count({ where: { entitiesId: orgId, status: { in: [5, 6] } } }),
    prisma.users.count({ where: { entitiesId: orgId, isActive: 1, isDeleted: false } }),
    prisma.knowbaseitems.count({ where: { entitiesId: orgId } }),
  ]);

  const [totalComputers, totalMonitors, totalPrinters, totalNetwork] = await Promise.all([
    prisma.computers.count({ where: { entitiesId: orgId } }),
    prisma.monitors.count({ where: { entitiesId: orgId } }),
    prisma.printers.count({ where: { entitiesId: orgId } }),
    prisma.networkequipments.count({ where: { entitiesId: orgId } }),
  ]);
  const totalAssets = totalComputers + totalMonitors + totalPrinters + totalNetwork;

  const ticketsByStatusRaw = await prisma.tickets.groupBy({
    by: ["status"], where: { entitiesId: orgId }, _count: true,
  });
  const statusMap: Record<number, string> = { 1: "new", 2: "assigned", 3: "in_progress", 4: "pending", 5: "solved", 6: "closed" };
  const statusOrder = [1, 2, 3, 4, 5, 6];
  const ticketsByStatus = statusOrder.map((s) => ({
    status: statusMap[s],
    count: ticketsByStatusRaw.find((t) => t.status === s)?._count ?? 0,
  }));

  const recentTicketsRaw = await prisma.tickets.findMany({
    where: { entitiesId: orgId },
    include: { ticketUsers: { include: { users: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" }, take: 6,
  });
  const recentTickets = recentTicketsRaw.map((t) => ({
    id: t.id,
    title: t.name || "",
    status: statusMap[t.status ?? 1] || "new",
    priority: t.priority?.toString() || "3",
    assignedTo: t.ticketUsers?.find((u) => u.type === 2)?.users || null,
  }));

  const assetsByType = [
    { type: "computer", count: totalComputers },
    { type: "monitor", count: totalMonitors },
    { type: "printer", count: totalPrinters },
    { type: "network", count: totalNetwork },
  ].filter((a) => a.count > 0);

  return Response.json({
    totalTickets, openTickets, resolvedTickets,
    totalAssets, totalUsers, totalArticles,
    ticketsByStatus, assetsByType, recentTickets,
  });
}
