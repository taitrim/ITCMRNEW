import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" });

  const orgId = session.user.organizationId!;
  const [totalTickets, openTickets, resolvedTickets, totalAssets, totalUsers, totalArticles] = await Promise.all([
    prisma.ticket.count({ where: { organizationId: orgId } }),
    prisma.ticket.count({ where: { organizationId: orgId, isActive: true, status: { notIn: ["resolved", "closed"] } } }),
    prisma.ticket.count({ where: { organizationId: orgId, status: { in: ["resolved", "closed"] } } }),
    prisma.asset.count({ where: { organizationId: orgId, isActive: true } }),
    prisma.user.count({ where: { organizationId: orgId, isActive: true } }),
    prisma.knowledgeBaseArticle.count({ where: { organizationId: orgId } }),
  ]);

  const ticketsByStatusRaw = await prisma.ticket.groupBy({
    by: ["status"], where: { organizationId: orgId }, _count: true,
  });
  const statusOrder = ["new", "assigned", "in_progress", "pending", "resolved", "closed"];
  const ticketsByStatus = statusOrder.map((status) => ({
    status, count: ticketsByStatusRaw.find((t) => t.status === status)?._count ?? 0,
  }));

  const assetsByTypeRaw = await prisma.asset.groupBy({
    by: ["assetType"], where: { organizationId: orgId, isActive: true }, _count: true,
  });
  const assetsByType = assetsByTypeRaw.map((a) => ({ type: a.assetType, count: a._count }));

  const recentTickets = await prisma.ticket.findMany({
    where: { organizationId: orgId },
    include: { assignedTo: { select: { name: true } } },
    orderBy: { createdAt: "desc" }, take: 6,
  });

  return Response.json({
    totalTickets, openTickets: openTickets, resolvedTickets,
    totalAssets, totalUsers, totalArticles,
    ticketsByStatus, assetsByType, recentTickets,
  });
}
