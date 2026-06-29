import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code") || "";
  const excludeId = searchParams.get("excludeId") || "";

  if (!code) return Response.json({ exists: false });

  const where: any = { isDeleted: false };
  if (excludeId) where.id = { not: excludeId };

  const all = await prisma.customer.findMany({ where, select: { code: true } });
  const exists = all.some((c) => c.code?.toLowerCase() === code.toLowerCase());

  return Response.json({ exists });
}
