import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const url = new URL(req.url);
  const customerId = url.searchParams.get("customerId") || "";
  const status = url.searchParams.get("status") || "";

  const where: Record<string, unknown> = {};
  if (customerId) where.customerId = customerId;
  if (status) where.status = status;

  const submissions = await prisma.inventorySubmission.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true } },
      devices: { select: { id: true, deviceType: true, manufacturer: true, modelName: true, serialNumber: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    data: submissions.map((s) => ({
      id: s.id,
      customerId: s.customerId,
      customerName: s.customer.name,
      status: s.status,
      deviceCount: s.deviceCount,
      createdAt: s.createdAt.toISOString(),
      devices: s.devices,
    })),
  });
}
