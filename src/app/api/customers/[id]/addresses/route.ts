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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const { customerId, ...clean } = body;
  const addr = await prisma.customerAddress.create({
    data: { ...clean, customer: { connect: { id } } },
  });

  return Response.json(addr, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.customerAddress.deleteMany({ where: { customerId: id } });
  return Response.json({ success: true });
}
