import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id!;
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, realname: true, firstname: true,
      phone: true, mobile: true, picture: true, socialLinks: true,
      useremails: { where: { isDefault: 1 }, select: { email: true } },
    },
  });
  if (!user) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({
    id: user.id,
    name: user.realname || user.name,
    email: user.useremails?.[0]?.email || user.name,
    realname: user.realname,
    firstname: user.firstname,
    phone: user.phone,
    mobile: user.mobile,
    picture: user.picture,
    socialLinks: user.socialLinks,
  });
}

const UpdateProfileSchema = z.object({
  realname: z.string().max(100).optional(),
  firstname: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  mobile: z.string().max(50).optional(),
  avatar: z.string().max(500000).optional().nullable(), // base64 data URL
  socialLinks: z.string().max(2000).optional().nullable(), // JSON string
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const result = UpdateProfileSchema.safeParse(body);
  if (!result.success) return Response.json({ error: "VALIDATION_ERROR" }, { status: 400 });

  const userId = session.user.id!;
  const data = result.data;

  const updateData: Record<string, unknown> = {};
  if (data.realname !== undefined) updateData.realname = data.realname;
  if (data.firstname !== undefined) updateData.firstname = data.firstname;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.mobile !== undefined) updateData.mobile = data.mobile;
  if (data.avatar !== undefined) updateData.picture = data.avatar;
  if (data.socialLinks !== undefined) updateData.socialLinks = data.socialLinks;

  if (data.email !== undefined) {
    // Update the user's primary email in Useremails
    const primaryEmail = await prisma.useremails.findFirst({
      where: { usersId: userId, isDefault: 1 },
    });
    if (primaryEmail) {
      await prisma.useremails.update({
        where: { id: primaryEmail.id },
        data: { email: data.email || null },
      });
    }
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.users.update({ where: { id: userId }, data: updateData });
  }

  // Return updated info
  const updated = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, realname: true, firstname: true,
      phone: true, mobile: true, picture: true, socialLinks: true,
      useremails: { where: { isDefault: 1 }, select: { email: true } },
    },
  });

  return Response.json({
    id: updated?.id,
    name: updated?.realname || updated?.name,
    email: updated?.useremails?.[0]?.email || updated?.name,
    realname: updated?.realname,
    firstname: updated?.firstname,
    phone: updated?.phone,
    mobile: updated?.mobile,
    picture: updated?.picture,
    socialLinks: updated?.socialLinks,
  });
}
