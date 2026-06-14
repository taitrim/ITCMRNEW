import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const licenses = await prisma.softwareLicense.findMany({
    where: { organizationId: session.user.organizationId! },
    include: { _count: { select: { assignments: true } } },
    orderBy: { name: "asc" },
  });
  return Response.json(licenses);
}
