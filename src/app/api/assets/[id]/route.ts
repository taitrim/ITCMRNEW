import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const types = ["computers", "monitors", "printers", "networkequipments"] as const;
  for (const type of types) {
    const asset = await (prisma[type] as any).findUnique({
      where: { id },
      include: { manufacturers: { select: { name: true } }, locations: { select: { name: true } }, users: { select: { name: true } } },
    });
    if (asset) return Response.json(asset);
  }
  return Response.json({ error: "Not found" }, { status: 404 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const types = ["computers", "monitors", "printers", "networkequipments"] as const;
  for (const type of types) {
    const existing = await (prisma[type] as any).findUnique({ where: { id } });
    if (existing) {
      const updated = await (prisma[type] as any).update({ where: { id }, data: body });
      return Response.json(updated);
    }
  }
  return Response.json({ error: "Not found" }, { status: 404 });
}
