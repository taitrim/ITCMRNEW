import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const assets = await prisma.asset.findMany({
    where: { organizationId: session.user.organizationId!, isActive: true },
    include: { location: true, assignedTo: { select: { name: true } }, manufacturer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(assets);
}
