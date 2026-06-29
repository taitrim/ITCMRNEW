import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const last = await prisma.customer.findFirst({ orderBy: { createdAt: "desc" }, select: { code: true } });
  const lastNum = last?.code ? parseInt(last.code.replace(/\D/g, "")) || 0 : 0;
  const nextCode = `KH${String(lastNum + 1).padStart(5, "0")}`;

  return Response.json({ code: nextCode });
}
