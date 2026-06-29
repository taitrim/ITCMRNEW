import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const customerId = searchParams.get("customerId") || "";

  const where: any = {};
  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { phone: { contains: search } },
      { email: { contains: search } },
      { department: { contains: search } },
    ];
  }
  if (customerId) where.customerId = customerId;

  const employees = await prisma.customerEmployee.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true, shortName: true, code: true, logo: true } },
      address: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(employees);
}

// ─── helpers ──────────────────────────────────────────
async function genCode(customerId: string): Promise<string> {
  const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { code: true } });
  const prefix = customer?.code || "KH";
  const count = await prisma.customerEmployee.count({ where: { customerId } });
  return `${prefix}-NV-${String(count + 1).padStart(3, "0")}`;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { customerId, id: _id, createdAt, updatedAt, customer, employee, address, addressId, ...clean } = body;

  if (!customerId) return Response.json({ error: "Missing customerId" }, { status: 400 });

  // auto-generate code if empty
  if (!clean.code) clean.code = await genCode(customerId);

  const data: any = { ...clean, customer: { connect: { id: customerId } } };
  if (addressId) data.address = { connect: { id: addressId } };

  const emp = await prisma.customerEmployee.create({
    data,
    include: { address: true },
  });

  return Response.json(emp, { status: 201 });
}
