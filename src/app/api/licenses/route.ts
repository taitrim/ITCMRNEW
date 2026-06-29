import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.softwarelicenses.findMany({
    where: { entitiesId: session.user.organizationId! },
    orderBy: { name: "asc" },
  });
  return Response.json(items);
}
