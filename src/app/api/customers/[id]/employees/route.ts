import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const { customerId, id: _id, createdAt, updatedAt, customer, employee, employeeId, ...clean } = body;
  const employeeRec = await prisma.customerEmployee.create({
    data: { ...clean, customer: { connect: { id } } },
  });

  return Response.json(employeeRec, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.customerEmployee.deleteMany({ where: { customerId: id } });
  return Response.json({ success: true });
}
