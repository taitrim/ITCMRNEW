import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { name: true, email: true } },
      createdBy: { select: { name: true } },
      category: true,
      followups: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!ticket || ticket.organizationId !== session.user.organizationId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json(ticket);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const ticket = await prisma.ticket.update({ where: { id }, data: body });
  return Response.json(ticket);
}
