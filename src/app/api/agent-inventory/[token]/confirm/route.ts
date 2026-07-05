import { prisma } from "@/lib/db";
import { confirmDevice } from "@/lib/inventory-matching";
import type { ReviewData } from "@/lib/inventory-matching";

/* ===== Confirm Inventory (User duyệt) =====
 *
 * Khi user bấm "Xác nhận" trên màn hình review:
 *   1. Đọc reviewData từ session
 *   2. Tạo mới / cập nhật devices
 *   3. Chuyển session → completed
 */

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Chỉ chấp nhận JSON body có thể chứa danh sách device được duyệt
  let body: { deviceIds?: string[]; action?: string } = {};
  try {
    body = await req.json();
  } catch { /* empty body = duyệt tất cả */ }

  const session = await prisma.collectionSession.findUnique({
    where: { token },
    select: {
      id: true,
      customerId: true,
      addressId: true,
      collectedById: true,
      status: true,
      reviewData: true,
      rawPayload: true,
    },
  });

  if (!session) {
    return Response.json({ error: "Session not found", code: "NOT_FOUND" }, { status: 404 });
  }

  if (session.status !== "data_received") {
    return Response.json({
      error: session.status === "completed" ? "Already approved" : "No data to review",
      code: "INVALID_STATUS",
    }, { status: 400 });
  }

  if (!session.reviewData) {
    return Response.json({ error: "No review data found", code: "NO_DATA" }, { status: 400 });
  }

  // Parse reviewData
  let reviewData: ReviewData;
  try {
    reviewData = JSON.parse(session.reviewData);
  } catch {
    return Response.json({ error: "Corrupted review data", code: "CORRUPTED" }, { status: 500 });
  }

  // Xác định devices được duyệt (nếu không chỉ định → duyệt tất cả)
  const approvedIds = new Set(body.deviceIds || reviewData.devices.map((_, i) => `${i}`));

  // Phase 1: Duyệt computer devices trước (parent)
  const parentIdMap = new Map<string, string>();
  const results: Array<{ index: number; name: string; action: string; id: string }> = [];

  // Tách computer vs child devices
  const computerTypes = new Set(["computer", "desktop", "laptop", "server", "aio", "tablet"]);
  const computerDevices = reviewData.devices.filter((rd, i) =>
    computerTypes.has((rd.parsed.deviceType as string) || ""),
  );
  const childDevices = reviewData.devices.filter((rd, i) =>
    !computerTypes.has((rd.parsed.deviceType as string) || ""),
  );

  // Xử lý computers
  for (const rd of computerDevices) {
    const index = reviewData.devices.indexOf(rd);
    if (!approvedIds.has(`${index}`)) {
      results.push({ index, name: (rd.parsed.name as string) || "Unknown", action: "skipped", id: "" });
      continue;
    }

    const result = await confirmDevice(
      session.id, session.customerId, session.addressId,
      session.collectedById, rd, parentIdMap,
    );

    // Lưu parentId mapping (deviceId trong parsed → Prisma ID)
    const rawDeviceId = (rd.parsed as any).deviceId || (rd.parsed.serialNumber as string) || "";
    if (rawDeviceId) parentIdMap.set(rawDeviceId, result.id);

    results.push({ index, name: (rd.parsed.name as string) || "Unknown", action: result.action, id: result.id });
  }

  // Xử lý child devices
  for (const rd of childDevices) {
    const index = reviewData.devices.indexOf(rd);
    if (!approvedIds.has(`${index}`)) {
      results.push({ index, name: (rd.parsed.name as string) || "Unknown", action: "skipped", id: "" });
      continue;
    }

    const result = await confirmDevice(
      session.id, session.customerId, session.addressId,
      session.collectedById, rd, parentIdMap,
    );

    results.push({ index, name: (rd.parsed.name as string) || "Unknown", action: result.action, id: result.id });
  }

  // Đếm kết quả
  const created = results.filter(r => r.action === "created").length;
  const updated = results.filter(r => r.action === "updated").length;
  const skipped = results.filter(r => r.action === "skipped").length;

  // Cập nhật session
  await prisma.collectionSession.update({
    where: { id: session.id },
    data: {
      status: "completed",
      completedAt: new Date(),
      approvedAt: new Date(),
      deviceCount: created + updated,
    },
  });

  return Response.json({
    success: true,
    message: `Created ${created}, updated ${updated}, skipped ${skipped}`,
    created,
    updated,
    skipped,
    details: results,
  });
}
