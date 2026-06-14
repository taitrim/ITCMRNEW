import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const contracts = await prisma.contract.findMany({
    where: { organizationId: session.user.organizationId! },
    include: { supplier: { select: { name: true } } },
    orderBy: { startDate: "desc" },
  });
  return Response.json(contracts);
}
