import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;

  const session = await prisma.collectionSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      token: true,
      customerId: true,
      status: true,
      createdAt: true,
      reviewData: true,
      address: {
        select: { id: true, label: true, address: true },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (!session.reviewData) {
    return NextResponse.json({ error: "No review data available" }, { status: 404 });
  }

  let reviewData: unknown;
  try {
    reviewData = JSON.parse(session.reviewData);
  } catch {
    return NextResponse.json({ error: "Corrupted review data" }, { status: 500 });
  }

  return NextResponse.json({
    session: {
      id: session.id,
      token: session.token,
      customerId: session.customerId,
      status: session.status,
      createdAt: session.createdAt,
      address: session.address,
    },
    reviewData,
  });
}
