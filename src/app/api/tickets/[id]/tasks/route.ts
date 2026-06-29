import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const task = await prisma.tickettasks.create({
    data: { ticketsId: id, content: body.content, state: 0, usersId: session.user.id! },
  });
  return Response.json(task, { status: 201 });
}
