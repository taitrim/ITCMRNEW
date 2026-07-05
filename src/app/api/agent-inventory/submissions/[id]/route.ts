import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const { id } = await params;
  const submission = await prisma.inventorySubmission.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true } },
      devices: {
        select: {
          id: true, deviceType: true, manufacturer: true,
          modelName: true, serialNumber: true, source: true,
          macAddress: true, cpu: true, ram: true, disk: true, os: true,
          notes: true,
        },
      },
    },
  });

  if (!submission) {
    return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      id: submission.id,
      customerId: submission.customerId,
      customerName: submission.customer.name,
      status: submission.status,
      deviceCount: submission.deviceCount,
      reviewData: submission.reviewData ? JSON.parse(submission.reviewData) : null,
      reviewedById: submission.reviewedById,
      reviewedAt: submission.reviewedAt?.toISOString() ?? null,
      createdAt: submission.createdAt.toISOString(),
      devices: submission.devices,
    },
  });
}
