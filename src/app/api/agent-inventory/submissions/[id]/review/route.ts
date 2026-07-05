import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const ReviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  /** Device IDs trong reviewData.devices[].parsed.deviceId */
  selectedDevices: z.array(z.string()).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const result = ReviewSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.message, code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { action, selectedDevices } = result.data;

  const submission = await prisma.inventorySubmission.findUnique({ where: { id } });
  if (!submission) {
    return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
  }
  if (submission.status !== "pending") {
    return NextResponse.json({ error: "Already reviewed", code: "ALREADY_REVIEWED" }, { status: 409 });
  }

  if (action === "reject") {
    await prisma.inventorySubmission.update({
      where: { id },
      data: { status: "rejected", reviewedById: session.user.id, reviewedAt: new Date() },
    });
    return NextResponse.json({ data: { status: "rejected" } });
  }

  // Approve: confirm selected devices (hoặc tất cả nếu không chỉ định)
  const reviewData = submission.reviewData ? JSON.parse(submission.reviewData) : { devices: [] };
  const allDeviceIds = reviewData.devices.map((d: any) =>
    String(d.parsed?.deviceId || `${d.parsed?.serialNumber || d.parsed?.name || Math.random()}`)
  );
  const devicesToConfirm = selectedDevices && selectedDevices.length > 0 ? selectedDevices : allDeviceIds;

  let confirmedCount = 0;
  for (const deviceId of devicesToConfirm) {
    const devData = reviewData.devices.find(
      (d: any) => String(d.parsed?.deviceId || `${d.parsed?.serialNumber || d.parsed?.name}`) === deviceId
    );
    if (!devData) continue;

    const d = devData.parsed;
    const deviceType = (d.deviceType as string) || "computer";
    const serialNumber = (d.serialNumber as string) || null;
    const name = (d.name as string) || "";
    const manufacturer = (d.manufacturer as string) || null;
    const modelName = (d.modelName as string) || null;
    const ipAddress = (d.ipAddress as string) || null;
    const macAddress = (d.macAddress as string) || null;
    const cpu = (d.cpu as string) || null;
    const ram = (d.ram as string) || null;
    const disk = (d.disk as string) || null;
    const os = (d.os as string) || null;
    const notes = (d.notes as string) || null;
    const componentsJson = (d.componentsJson as string) || null;
    const hostnameNote = name ? `Hostname: ${name}` : "";
    const mergedNotes = [hostnameNote, notes].filter(Boolean).join("\n");

    if (devData.match.found && devData.match.existingDeviceId) {
      // UPDATE existing device
      const existing = await prisma.customerCollectedDevice.findUnique({
        where: { id: devData.match.existingDeviceId },
      });
      if (existing) {
        await prisma.customerCollectedDevice.update({
          where: { id: existing.id },
          data: {
            manufacturer: manufacturer || existing.manufacturer,
            modelName: modelName || existing.modelName,
            serialNumber: serialNumber || existing.serialNumber,
            ipAddress: ipAddress || existing.ipAddress,
            macAddress: macAddress || existing.macAddress,
            cpu: cpu || existing.cpu,
            ram: ram || existing.ram,
            disk: disk || existing.disk,
            os: os || existing.os,
            componentsJson: componentsJson || existing.componentsJson,
            notes: mergedNotes ? (existing.notes ? `${existing.notes}\n${mergedNotes}` : mergedNotes) : existing.notes,
            submissionId: submission.id,
            source: "agent",
            collectedAt: new Date(),
          },
        });
      }
    } else {
      // CREATE new device
      await prisma.customerCollectedDevice.create({
        data: {
          customerId: submission.customerId,
          deviceType,
          serialNumber,
          manufacturer,
          modelName,
          ipAddress,
          macAddress,
          cpu,
          ram,
          disk,
          os,
          componentsJson,
          notes: mergedNotes,
          submissionId: submission.id,
          source: "agent",
          status: "active",
          collectedAt: new Date(),
        },
      });
    }
    confirmedCount++;
  }

  await prisma.inventorySubmission.update({
    where: { id },
    data: { status: "approved", reviewedById: session.user.id, reviewedAt: new Date(), approvedAt: new Date() },
  });

  return NextResponse.json({ data: { status: "approved", confirmedCount } });
}
