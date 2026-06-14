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
    let org = await prisma.organization.findUnique({ where: { code: "DEMO" } });
    if (!org) {
      org = await prisma.organization.create({ data: { name: "Default", code: "DEMO" } });
    }

    let agent = await prisma.agent.findUnique({ where: { deviceId } });
    if (!agent) {
      agent = await prisma.agent.create({
        data: { name: deviceId, deviceId, version: "1.0", organizationId: org.id },
      });
    }

    const inventory = await prisma.inventory.create({
      data: {
        agentId: agent.id,
        action: "inventory",
        content: JSON.stringify(data),
        status: "received",
      },
    });

    let asset = await prisma.asset.findFirst({
      where: { name: deviceId, organizationId: org.id },
    });

    if (!asset) {
      asset = await prisma.asset.create({
        data: {
          name: deviceId,
          assetType: "computer",
          organizationId: org.id,
          isDynamic: true,
          lastInventory: new Date(),
        },
      });
    } else {
      asset = await prisma.asset.update({
        where: { id: asset.id },
        data: { lastInventory: new Date() },
      });
    }

    await prisma.inventory.update({
      where: { id: inventory.id },
      data: { status: "processed", assetId: asset.id },
    });

    await prisma.agent.update({
      where: { id: agent.id },
      data: { lastContact: new Date(), lastIp: req.headers.get("x-forwarded-for") || "unknown" },
    });

    if (data.system) {
      const os = data.system.os || "";
      const osVersion = data.system.osVersion || "";
      const hostname = data.system.hostname || deviceId;

      const existing = await prisma.computerDetail.findUnique({ where: { assetId: asset.id } });

      const detailData = {
        hostname,
        os,
        osVersion,
        osArchitecture: data.system.osArch || "",
        cpu: data.cpu?.name || "",
        cpuCores: data.cpu?.cores || 0,
        cpuThreads: data.cpu?.threads || 0,
        cpuFrequency: data.cpu?.frequency || "",
        ram: data.ram?.totalGB ? `${data.ram.totalGB}GB` : "",
        ramSize: data.ram?.totalGB || 0,
        disks: JSON.stringify(data.disks || []),
        ipAddress: data.network?.[0]?.ip || "",
        macAddress: data.network?.[0]?.mac || "",
        userAgent: "agent-v1",
      };

      if (existing) {
        await prisma.computerDetail.update({ where: { assetId: asset.id }, data: detailData });
      } else {
        await prisma.computerDetail.create({ data: { assetId: asset.id, ...detailData } });
      }
    }

    return NextResponse.json({
      success: true,
      agentId: agent.id,
      assetId: asset.id,
      inventoryId: inventory.id,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
