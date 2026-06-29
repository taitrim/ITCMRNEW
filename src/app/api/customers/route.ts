import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const categoryId = searchParams.get("categoryId") || "";

  const where: any = { isDeleted: false };
  if (search) where.name = { contains: search };
  if (categoryId) where.categoryId = categoryId;

  const customers = await prisma.customer.findMany({
    where,
    include: {
      category: { select: { id: true, name: true } },
      responsibleCompany: { select: { id: true, name: true, shortName: true } },
      addresses: { take: 1, orderBy: { isDefault: "desc" }, select: { id: true, address: true, city: true, state: true } },
      contacts: { take: 1, where: { isPrimary: true }, select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
      _count: { select: { contacts: true, employees: true, addresses: true, items: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(customers);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const category = body.categoryId
    ? await prisma.customerCategory.findUnique({ where: { id: body.categoryId } })
    : null;

  // Determine code
  let code = body.code;
  if (!code) {
    // Auto-generate
    if (category?.code === "business") {
      // For business: generate from name initials
      const initials = body.name?.replace(/[^A-Za-zÀ-ỹ]/g, "").substring(0, 6).toUpperCase() || "DN";
      const count = await prisma.customer.count({ where: { code: { startsWith: initials } } });
      code = `${initials}-${String(count + 1).padStart(3, "0")}`;
    } else {
      // For individual
      const count = await prisma.customer.count();
      code = `KH-${String(count + 1).padStart(5, "0")}`;
    }
  }

  // Case-insensitive uniqueness check (SQLite doesn't support Prisma's insensitive mode)
  const allExisting = await prisma.customer.findMany({
    where: { isDeleted: false },
    select: { code: true },
  });
  const duplicate = allExisting.some((c) => c.code?.toLowerCase() === code.toLowerCase());
  if (duplicate) {
    return Response.json({ error: `Mã "${code}" đã tồn tại`, code: "DUPLICATE_CODE" }, { status: 409 });
  }

  const customer = await prisma.customer.create({
    data: {
      code,
      name: body.name,
      shortName: body.shortName || null,
      categoryId: body.categoryId || null,
      taxCode: body.taxCode || null,
      website: body.website || null,
      phone: body.phone || null,
      email: body.email || null,
      logo: body.logo || null,
      note: body.note || null,
      isCodeAuto: !body.code, // manual input = not auto
    },
  });

  if (body.contacts?.length) {
    await prisma.customerContact.createMany({
      data: body.contacts.map((c: any) => ({
        customerId: customer.id,
        firstName: c.firstName,
        lastName: c.lastName,
        position: c.position,
        department: c.department,
        phone: c.phone,
        email: c.email,
        isPrimary: c.isPrimary || false,
        note: c.note,
      })),
    });
  }

  if (body.employees?.length) {
    await prisma.customerEmployee.createMany({
      data: body.employees.map((e: any) => ({
        customerId: customer.id,
        employeeId: e.employeeId || null,
        firstName: e.firstName,
        lastName: e.lastName,
        code: e.code,
        position: e.position,
        department: e.department,
        phone: e.phone,
        email: e.email,
        note: e.note,
      })),
    });
  }

  if (body.addresses?.length) {
    await prisma.customerAddress.createMany({
      data: body.addresses.map((a: any) => ({
        customerId: customer.id,
        label: a.label,
        type: a.type || "office",
        address: a.address,
        city: a.city,
        state: a.state,
        postalCode: a.postalCode,
        country: a.country || "Việt Nam",
        isDefault: a.isDefault || false,
      })),
    });
  }

  const result = await prisma.customer.findUnique({
    where: { id: customer.id },
    include: { category: true, addresses: true, contacts: true, employees: true },
  });

  return Response.json(result, { status: 201 });
}
