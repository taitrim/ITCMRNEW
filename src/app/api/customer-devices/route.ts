import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const customerId = url.searchParams.get("customerId");
  const deviceType = url.searchParams.get("deviceType");
  const status = url.searchParams.get("status");
  const condition = url.searchParams.get("condition");
  const assignedToId = url.searchParams.get("assignedToId");
  const search = url.searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (customerId) where.customerId = customerId;
  if (deviceType) where.deviceType = deviceType;
  if (status) where.status = status;
  if (condition) where.condition = condition;
  if (assignedToId) where.assignedToId = assignedToId;
  if (search) {
    where.OR = [
      { manufacturer: { contains: search } },
      { modelName: { contains: search } },
      { serialNumber: { contains: search } },
      { cpu: { contains: search } },
      { os: { contains: search } },
      { ipAddress: { contains: search } },
      { macAddress: { contains: search } },
      { notes: { contains: search } },
    ];
  }

  const devices = await prisma.customerCollectedDevice.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true, code: true } },
      address: { select: { id: true, label: true, address: true, city: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true, code: true, department: true, position: true } },
      peripherals: { select: { id: true, deviceType: true, manufacturer: true, modelName: true, serialNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(devices);
}
