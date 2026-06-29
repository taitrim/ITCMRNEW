import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.customerCategory.findMany({ orderBy: { name: "asc" } });
  return Response.json(categories);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const cat = await prisma.customerCategory.create({ data: { name: body.name, code: body.code } });
  return Response.json(cat, { status: 201 });
}
