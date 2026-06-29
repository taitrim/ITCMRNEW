import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const BulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const result = BulkDeleteSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: "Invalid request", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { ids } = result.data;

  // Count before deleting
  const count = await prisma.customerCollectedDevice.count({
    where: { id: { in: ids } },
  });

  if (count !== ids.length) {
    return Response.json({ error: "Some devices not found", code: "NOT_FOUND" }, { status: 404 });
  }

  await prisma.customerCollectedDevice.deleteMany({
    where: { id: { in: ids } },
  });

  return Response.json({ success: true, deleted: count });
}
