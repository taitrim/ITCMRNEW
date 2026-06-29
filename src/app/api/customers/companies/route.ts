import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const companies = await prisma.customer.findMany({
    where: { isDeleted: false, category: { code: "business" } },
    include: {
      category: { select: { id: true, name: true, code: true } },
      addresses: { take: 1, orderBy: { isDefault: "desc" }, select: { id: true, label: true, address: true, city: true, state: true } },
      _count: { select: { contacts: true, employees: true, addresses: true } },
    },
    orderBy: { name: "asc" },
  });

  return Response.json(companies);
}
