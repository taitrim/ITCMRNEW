import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.certificates.findMany({
    where: { isDeleted: false },
    include: {
      certificatetypes: { select: { name: true } },
      manufacturers: { select: { name: true } },
      users: { select: { id: true, name: true } },
      locations: { select: { name: true } },
      states: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  return Response.json(items);
}
