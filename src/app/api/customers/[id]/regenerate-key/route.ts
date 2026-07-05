import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import crypto from "crypto";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found", code: "NOT_FOUND" }, { status: 404 });
  }

  const newKey = "ak_" + crypto.randomBytes(24).toString("hex");
  await prisma.customer.update({
    where: { id },
    data: { agentKey: newKey },
  });

  return NextResponse.json({ data: { agentKey: newKey } });
}
