import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      category: true,
      addresses: true,
      contacts: true,
      employees: { include: { employee: { select: { id: true, name: true } } } },
      items: true,
      responsibleCompany: { select: { id: true, name: true, shortName: true } },
    },
  });

  if (!customer) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json(customer);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Case-insensitive uniqueness check (exclude current record)
  if (body.code) {
    const allExisting = await prisma.customer.findMany({
      where: { id: { not: id }, isDeleted: false },
      select: { code: true },
    });
    const duplicate = allExisting.some((c) => c.code?.toLowerCase() === body.code.toLowerCase());
    if (duplicate) {
      return Response.json({ error: `Mã "${body.code}" đã tồn tại`, code: "DUPLICATE_CODE" }, { status: 409 });
    }
  }

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      code: body.code,
      name: body.name,
      shortName: body.shortName || null,
      categoryId: body.categoryId || null,
      taxCode: body.taxCode || null,
      website: body.website || null,
      phone: body.phone || null,
      email: body.email || null,
      logo: body.logo || null,
      note: body.note || null,
      isCodeAuto: body.isCodeAuto !== false,
    },
    include: { category: true, addresses: true, contacts: true, employees: true, items: true },
  });

  return Response.json(customer);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await prisma.customerAddress.deleteMany({ where: { customerId: id } });
  await prisma.customerContact.deleteMany({ where: { customerId: id } });
  await prisma.customerEmployee.deleteMany({ where: { customerId: id } });
  await prisma.customerItem.deleteMany({ where: { customerId: id } });
  await prisma.customer.update({ where: { id }, data: { isDeleted: true } });

  return Response.json({ success: true });
}
