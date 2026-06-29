import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { customerId, id: _id, createdAt, updatedAt, customer, employee, address, addressId, ...clean } = body;

  const data: any = { ...clean };
  // Prisma v5 relation: set null or connect
  if (addressId) data.address = { connect: { id: addressId } };
  else data.address = { disconnect: true };

  const emp = await prisma.customerEmployee.update({
    where: { id },
    data,
    include: { address: true },
  });

  return Response.json(emp);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.customerEmployee.delete({ where: { id } });

  return Response.json({ success: true });
}
