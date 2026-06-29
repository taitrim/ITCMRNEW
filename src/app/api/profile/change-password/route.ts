import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const Body = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const result = Body.safeParse(body);
  if (!result.success) return Response.json({ error: "VALIDATION_ERROR", message: "Dữ liệu không hợp lệ" }, { status: 400 });

  const { currentPassword, newPassword } = result.data;
  const userId = session.user.id!;

  const user = await prisma.users.findUnique({ where: { id: userId } });
  if (!user || !user.password) return Response.json({ error: "USER_NOT_FOUND" }, { status: 404 });

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) return Response.json({ error: "WRONG_PASSWORD" }, { status: 400 });

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.users.update({ where: { id: userId }, data: { password: hashed } });

  return Response.json({ ok: true });
}
