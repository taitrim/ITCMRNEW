import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id!;

  const [ticketCount, assetCount] = await Promise.all([
    prisma.ticketUsers.count({ where: { usersId: userId } }),
    prisma.assetsAssets.count({ where: { usersId: userId, isDeleted: false } }),
  ]);

  return Response.json({ tickets: ticketCount, assets: assetCount });
}
