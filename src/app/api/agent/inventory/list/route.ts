import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId!;
  const agents = await prisma.agent.findMany({
    where: { organizationId: orgId },
    include: { _count: { select: { inventories: true } } },
    orderBy: { lastContact: "desc" },
  });
  const dynamicAssets = await prisma.asset.count({ where: { organizationId: orgId, isDynamic: true } });

  return Response.json({ agents, dynamicAssets });
}
