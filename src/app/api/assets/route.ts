import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [computers, monitors, printers, network] = await Promise.all([
    prisma.computers.findMany({
      where: { entitiesId: session.user.organizationId! },
      include: { manufacturers: { select: { name: true } }, locations: { select: { name: true } }, users: { select: { name: true } } },
    }),
    prisma.monitors.findMany({
      where: { entitiesId: session.user.organizationId! },
      include: { manufacturers: { select: { name: true } }, locations: { select: { name: true } }, users: { select: { name: true } } },
    }),
    prisma.printers.findMany({
      where: { entitiesId: session.user.organizationId! },
      include: { manufacturers: { select: { name: true } }, locations: { select: { name: true } } },
    }),
    prisma.networkequipments.findMany({
      where: { entitiesId: session.user.organizationId! },
      include: { manufacturers: { select: { name: true } }, locations: { select: { name: true } } },
    }),
  ]);

  const mapped = [
    ...computers.map((c) => ({ ...c, assetType: "computer", assignedTo: c.users, manufacturer: c.manufacturers, location: c.locations, manufacturers: undefined, users: undefined, locations: undefined })),
    ...monitors.map((m) => ({ ...m, assetType: "monitor", assignedTo: m.users, manufacturer: m.manufacturers, location: m.locations, manufacturers: undefined, users: undefined, locations: undefined })),
    ...printers.map((p) => ({ ...p, assetType: "printer", assignedTo: null, manufacturer: p.manufacturers, location: p.locations, manufacturers: undefined, locations: undefined })),
    ...network.map((n) => ({ ...n, assetType: "network", assignedTo: null, manufacturer: n.manufacturers, location: n.locations, manufacturers: undefined, locations: undefined })),
  ];

  return Response.json(mapped);
}
