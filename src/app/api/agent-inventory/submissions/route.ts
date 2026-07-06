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
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10)));

  const where: Record<string, unknown> = {};
  if (customerId) where.customerId = customerId;
  if (status) where.status = status;

  const [submissions, total, statusCounts] = await Promise.all([
    prisma.inventorySubmission.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        devices: { select: { id: true, deviceType: true, manufacturer: true, modelName: true, serialNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.inventorySubmission.count({ where }),
    // Stats for filter buttons (không bị ảnh hưởng bởi customerId filter)
    Promise.all([
      prisma.inventorySubmission.count(),
      prisma.inventorySubmission.count({ where: { status: "pending" } }),
      prisma.inventorySubmission.count({ where: { status: "approved" } }),
      prisma.inventorySubmission.count({ where: { status: "rejected" } }),
    ]),
  ]);

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
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
    stats: {
      total: statusCounts[0],
      pending: statusCounts[1],
      approved: statusCounts[2],
      rejected: statusCounts[3],
    },
  });
}
