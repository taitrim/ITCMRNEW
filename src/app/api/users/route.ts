import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.users.findMany({
    where: { entitiesId: session.user.organizationId!, isDeleted: false },
    select: { id: true, name: true, realname: true, firstname: true, isActive: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  return Response.json(users.map((u) => ({ ...u, email: u.name, role: "user" })));
}
