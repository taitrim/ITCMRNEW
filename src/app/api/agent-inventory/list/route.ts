import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const sessions = await prisma.collectionSession.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      token: true,
      status: true,
      deviceCount: true,
      errorMessage: true,
      createdAt: true,
      completedAt: true,
      customerId: true,
      customer: {
        select: { id: true, name: true, code: true },
      },
      address: {
        select: { id: true, label: true },
      },
      _count: {
        select: { devices: true },
      },
    },
  });

  return NextResponse.json({ sessions });
}
