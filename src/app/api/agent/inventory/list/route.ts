import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const entitiesId = session.user.organizationId!;
  const agents = await prisma.agents.findMany({
    where: { entitiesId },
    orderBy: { name: "asc" },
  });
  const dynamicAssets = await prisma.computers.count({ where: { entitiesId, isDynamic: 1 } });

  return Response.json({ agents, dynamicAssets });
}
