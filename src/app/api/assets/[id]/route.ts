import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      manufacturer: true, location: true, assignedTo: { select: { name: true, email: true } },
      computerDetail: { include: { diskVolumes: true, networkInterfaces: true, softwareInstalls: true } },
      printerDetail: true, networkDetail: true,
      licenseAssignments: { include: { license: true } },
    },
  });
  if (!asset || asset.organizationId !== session.user.organizationId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json(asset);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const asset = await prisma.asset.update({ where: { id }, data: body });
  return Response.json(asset);
}
