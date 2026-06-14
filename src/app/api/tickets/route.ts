import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tickets = await prisma.ticket.findMany({
    where: { organizationId: session.user.organizationId! },
    include: { assignedTo: { select: { name: true } }, createdBy: { select: { name: true } }, category: { select: { name: true, color: true } } },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(tickets);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const ticket = await prisma.ticket.create({
    data: {
      title: body.title, description: body.description,
      type: body.type || "incident", status: "new",
      priority: body.priority || "medium",
      categoryId: body.categoryId || null,
      assignedToId: body.assignedToId || null,
      createdById: session.user.id!,
      organizationId: session.user.organizationId!,
    },
  });
  return Response.json(ticket, { status: 201 });
}
