import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const UpdateSchema = z.object({
  deviceType: z.enum(["computer", "monitor", "printer", "network", "phone", "peripheral", "server", "other"]).optional(),
  manufacturer: z.string().max(100).optional().or(z.literal("")).optional(),
  modelName: z.string().max(200).optional().or(z.literal("")).optional(),
  serialNumber: z.string().max(100).optional().or(z.literal("")).optional(),
  assetTag: z.string().max(100).optional().or(z.literal("")).optional(),
  ipAddress: z.string().max(50).optional().or(z.literal("")).optional(),
  macAddress: z.string().max(50).optional().or(z.literal("")).optional(),
  cpu: z.string().max(100).optional().or(z.literal("")).optional(),
  ram: z.string().max(50).optional().or(z.literal("")).optional(),
  disk: z.string().max(100).optional().or(z.literal("")).optional(),
  os: z.string().max(100).optional().or(z.literal("")).optional(),
  addressId: z.string().optional().nullable(),
  locationDetail: z.string().max(200).optional().or(z.literal("")).optional(),
  assignedToId: z.string().nullable().optional(),
  status: z.enum(["active", "broken", "stored", "retired"]).optional(),
  condition: z.enum(["good", "fair", "broken", "damaged", "other"]).optional().nullable(),
  componentsJson: z.string().optional().nullable(),
  quantity: z.number().int().min(1).optional(),
  notes: z.string().max(500).optional().or(z.literal("")).optional(),
});

const emptyToNull = (v: unknown) => (v === "" ? null : v);

export async function GET(req: Request, { params }: { params: Promise<{ id: string; deviceId: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { deviceId } = await params;
  const device = await prisma.customerCollectedDevice.findUnique({
    where: { id: deviceId },
    include: {
      customer: { select: { id: true, name: true, code: true } },
      address: { select: { id: true, label: true, address: true, city: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true, code: true, department: true, position: true, phone: true, email: true } },
      session: { select: { id: true, token: true, status: true, createdAt: true, completedAt: true } },
    },
  });
  if (!device) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(device);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; deviceId: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id, deviceId } = await params;
  const body = await req.json();
  const result = UpdateSchema.safeParse(body);
  if (!result.success) return Response.json({ error: "VALIDATION_ERROR" }, { status: 400 });

  const data = result.data;
  const updateData: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) updateData[key] = emptyToNull(val);
  }

  const device = await prisma.customerCollectedDevice.update({
    where: { id: deviceId },
    data: updateData,
    include: {
      address: { select: { id: true, label: true, address: true, city: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true, code: true, department: true, position: true } },
    },
  });

  return Response.json(device);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; deviceId: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { deviceId } = await params;
  await prisma.customerCollectedDevice.delete({ where: { id: deviceId } });

  return Response.json({ success: true });
}
