import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");
  const search = searchParams.get("search");

  const where: Record<string, any> = {};
  if (customerId) where.customerId = customerId;
  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const employees = await prisma.customerEmployee.findMany({
    where,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      address: true,
    },
  });

  return Response.json(employees);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const body = await req.json();
  const { firstName, lastName, customerId, code, position, department, phone, email, addressId, workLocation, note, isActive } = body;

  if (!customerId) {
    return Response.json({ error: "customerId is required", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const employee = await prisma.customerEmployee.create({
    data: {
      customerId,
      firstName: firstName || "",
      lastName: lastName || "",
      code: code || null,
      position: position || null,
      department: department || null,
      phone: phone || null,
      email: email || null,
      workLocation: workLocation || null,
      note: note || null,
      isActive: isActive ?? true,
      ...(addressId ? { address: { connect: { id: addressId } } } : {}),
    },
    include: { address: true },
  });

  return Response.json(employee);
}
