import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const DeviceSchema = z.object({
  deviceType: z.enum(["computer", "monitor", "printer", "network", "phone", "peripheral", "server", "other"]),
  manufacturer: z.string().max(100).optional().or(z.literal("")),
  modelName: z.string().max(200).optional().or(z.literal("")),
  serialNumber: z.string().max(100).optional().or(z.literal("")),
  assetTag: z.string().max(100).optional().or(z.literal("")),
  ipAddress: z.string().max(50).optional().or(z.literal("")),
  macAddress: z.string().max(50).optional().or(z.literal("")),
  cpu: z.string().max(100).optional().or(z.literal("")),
  ram: z.string().max(50).optional().or(z.literal("")),
  disk: z.string().max(100).optional().or(z.literal("")),
  os: z.string().max(100).optional().or(z.literal("")),
  addressId: z.string().optional().nullable(),
  locationDetail: z.string().max(200).optional().or(z.literal("")),
  assignedToId: z.string().nullable().optional(),
  status: z.enum(["active", "broken", "stored", "retired"]).optional(),
  condition: z.enum(["good", "fair", "broken", "damaged", "other"]).optional().nullable(),
  componentsJson: z.string().optional().nullable(),
  quantity: z.number().int().min(1).optional(),
  notes: z.string().max(500).optional().or(z.literal("")),
});

type DeviceInput = z.infer<typeof DeviceSchema>;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const url = new URL(req.url);
  const deviceType = url.searchParams.get("deviceType");

  const where: Record<string, unknown> = { customerId: id };
  if (deviceType) where.deviceType = deviceType;

  const devices = await prisma.customerCollectedDevice.findMany({
    where,
    include: {
      address: { select: { id: true, label: true, address: true, city: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true, code: true, department: true, position: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(devices);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const result = DeviceSchema.safeParse(body);
  if (!result.success) return Response.json({ error: "VALIDATION_ERROR", issues: result.error.issues }, { status: 400 });

  const data = result.data;
  const device = await prisma.customerCollectedDevice.create({
    data: {
      customerId: id,
      deviceType: data.deviceType,
      manufacturer: data.manufacturer || null,
      modelName: data.modelName || null,
      serialNumber: data.serialNumber || null,
      assetTag: data.assetTag || null,
      ipAddress: data.ipAddress || null,
      macAddress: data.macAddress || null,
      cpu: data.cpu || null,
      ram: data.ram || null,
      disk: data.disk || null,
      os: data.os || null,
      addressId: data.addressId || null,
      locationDetail: data.locationDetail || null,
      assignedToId: data.assignedToId || null,
      status: data.status || "active",
      condition: data.condition || null,
      componentsJson: data.componentsJson || null,
      quantity: data.quantity || 1,
      notes: data.notes || null,
      collectedById: session.user.id!,
    },
    include: {
      address: { select: { id: true, label: true, address: true, city: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true, code: true, department: true, position: true } },
    },
  });

  return Response.json(device);
}
