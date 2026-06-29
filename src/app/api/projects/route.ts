import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.projects.findMany({
    where: { isDeleted: false },
    include: {
      projectstates: { select: { name: true } },
      projecttypes: { select: { name: true } },
      users: { select: { id: true, name: true } },
      _count: { select: { projecttasks: true } },
    },
    orderBy: { name: "asc" },
  });

  return Response.json(items);
}
