import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ticket = await prisma.tickets.findUnique({
    where: { id },
    include: {
      itilcategories: true,
      ticketUsers: { include: { users: { select: { name: true } } } },
      itilfollowups: { where: { itemtype: "Ticket" }, include: { users: { select: { name: true } } }, orderBy: { createdAt: "desc" as const } },
      tickettasks: { include: { users: { select: { name: true } } }, orderBy: { createdAt: "asc" as const } },
    },
  });
  if (!ticket || ticket.entitiesId !== session.user.organizationId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const mapped = {
    ...ticket,
    category: ticket.itilcategories,
    assignedTo: ticket.ticketUsers?.find((u) => u.type === 2)?.users || null,
    createdBy: ticket.ticketUsers?.find((u) => u.type === 1)?.users || null,
    followups: ticket.itilfollowups,
    tasks: ticket.tickettasks,
    itilcategories: undefined,
    ticketUsers: undefined,
    itilfollowups: undefined,
    tickettasks: undefined,
  };

  return Response.json(mapped);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name) data.name = body.name;
  if (body.content) data.content = body.content;
  if (body.status !== undefined) data.status = body.status;
  if (body.priority !== undefined) data.priority = body.priority;

  const ticket = await prisma.tickets.update({ where: { id }, data });
  return Response.json(ticket);
}
