import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.domains.findMany({
    where: { isDeleted: false },
    include: {
      domaintypes: { select: { name: true } },
      users: { select: { id: true, name: true } },
      entity: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });

  return Response.json(items);
}
