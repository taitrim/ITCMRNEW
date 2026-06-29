import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.budgets.findMany({
    where: { isDeleted: false },
    include: {
      locations: { select: { name: true } },
      budgettypes: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  return Response.json(items);
}
