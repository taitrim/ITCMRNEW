import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const addresses = await prisma.customerAddress.findMany({
    where: { customerId: id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return Response.json(addresses);
}
