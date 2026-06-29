import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tickets = await prisma.tickets.findMany({
    where: { entitiesId: session.user.organizationId! },
    include: {
      itilcategories: { select: { name: true } },
      ticketUsers: { include: { users: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const mapped = tickets.map((t) => ({
    ...t,
    category: t.itilcategories,
    assignedTo: t.ticketUsers?.find((u) => u.type === 2)?.users || null,
    createdBy: t.ticketUsers?.find((u) => u.type === 1)?.users || null,
    ticketUsers: undefined,
    itilcategories: undefined,
  }));

  return Response.json(mapped);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const ticket = await prisma.tickets.create({
    data: {
      name: body.name,
      content: body.content,
      type: body.type === "request" ? 2 : 1,
      status: 1,
      urgency: body.urgency || 3,
      impact: body.impact || 3,
      priority: body.priority || 3,
      itilcategoriesId: body.categoryId || null,
      entitiesId: session.user.organizationId!,
    },
  });

  await prisma.ticketUsers.create({ data: { ticketsId: ticket.id, usersId: session.user.id!, type: 1 } });
  if (body.assignedToId) {
    await prisma.ticketUsers.create({ data: { ticketsId: ticket.id, usersId: body.assignedToId, type: 2 } });
  }

  return Response.json(ticket, { status: 201 });
}
