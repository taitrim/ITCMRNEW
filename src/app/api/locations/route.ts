import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const locations = await prisma.location.findMany({
    where: { organizationId: session.user.organizationId! },
    include: { _count: { select: { assets: true, users: true } } },
    orderBy: { name: "asc" },
  });
  return Response.json(locations);
}
