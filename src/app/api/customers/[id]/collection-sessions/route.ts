import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const sessions = await prisma.collectionSession.findMany({
    where: { customerId: id },
    include: {
      address: { select: { id: true, label: true, address: true } },
      _count: { select: { devices: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(sessions);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sess = await auth();
  if (!sess?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const addressId = body.addressId || null;

  // Verify customer exists
  const customer = await prisma.customer.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!customer) return Response.json({ error: "Customer not found" }, { status: 404 });

  // Verify address belongs to customer if provided
  if (addressId) {
    const addr = await prisma.customerAddress.findFirst({
      where: { id: addressId, customerId: id },
      select: { id: true },
    });
    if (!addr) return Response.json({ error: "Address not found for this customer" }, { status: 400 });
  }

  // Generate unique token
  const token = "collect_" + crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h expiry

  const collectionSession = await prisma.collectionSession.create({
    data: {
      customerId: id,
      addressId,
      token,
      status: "pending",
      collectedById: sess.user.id,
      expiresAt,
    },
    include: {
      address: { select: { id: true, label: true, address: true } },
    },
  });

  return Response.json(collectionSession);
}
