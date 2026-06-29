import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.customerCollectedDevice.delete({ where: { id } });

  return Response.json({ success: true });
}
