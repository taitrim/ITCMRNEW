import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== "agent-key-demo") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await req.json();
  const deviceId = data.deviceId || data.system?.hostname || `UNKNOWN-${Date.now()}`;

  try {
    let entity = await prisma.entity.findFirst({ where: { name: "Default" } });
    if (!entity) {
      entity = await prisma.entity.create({ data: { name: "Default" } });
    }

    let computer = await prisma.computers.findFirst({
      where: { name: deviceId, entitiesId: entity.id },
    });

    if (!computer) {
      computer = await prisma.computers.create({
        data: { name: deviceId, entitiesId: entity.id, isDynamic: 1 },
      });
    }

    if (data.system) {
      const hostname = data.system.hostname || deviceId;
      await prisma.computers.update({
        where: { id: computer.id },
        data: { name: hostname },
      });
    }

    return NextResponse.json({ success: true, computerId: computer.id });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
