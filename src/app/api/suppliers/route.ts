import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.suppliers.findMany({
    where: { entitiesId: session.user.organizationId!, isDeleted: false },
    include: { suppliertypes: { select: { name: true } }, _count: { select: { contractSuppliers: true } } },
    orderBy: { name: "asc" },
  });
  return Response.json(items.map(s => ({
    id: s.id,
    name: s.name || "",
    supplierType: s.suppliertypes?.name || "general",
    contactName: s.comment,
    email: s.email,
    phone: s.phonenumber,
    _count: { contracts: s._count.contractSuppliers },
  })));
}
