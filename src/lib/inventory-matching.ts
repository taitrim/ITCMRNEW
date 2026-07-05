import { prisma } from "@/lib/db";

/* ===== Dedup Matching =====
 *
 * Thứ tự ưu tiên match:
 *   1. Serial number — exact match (cao nhất)
 *   2. BIOS UUID (hardware.uuid trong componentsJson) — chính xác
 *   3. MAC address của NIC chính — chính xác
 *   4. Hostname + manufacturer + modelName — thấp
 *   5. Không match → tạo mới
 */

export type MatchResult = {
  found: boolean;
  existingDeviceId: string | null;
  method: "serial" | "uuid" | "mac" | "hostname_model" | "none";
  confidence: "high" | "medium" | "low";
  /** Existing device snapshot (để hiển thị so sánh) */
  existingDevice: Record<string, unknown> | null;
};

export type ReviewDevice = {
  /** Dữ liệu parse từ inventory */
  parsed: Record<string, unknown>;
  /** Kết quả match */
  match: MatchResult;
};

export type ReviewData = {
  parsedAt: string;
  devices: ReviewDevice[];
  /** Các thiết bị chỉ là child (monitor, printer) chưa gán parent → cần resolve sau */
  pendingParents: number;
};

/**
 * Tìm thiết bị đã tồn tại trong DB của khách hàng.
 * Thứ tự ưu tiên: serial → UUID → MAC → hostname+model
 */
async function matchDevice(
  customerId: string,
  parsed: Record<string, unknown>,
  deviceType: string,
): Promise<MatchResult> {
  const serialNumber = (parsed.serialNumber as string) || "";
  const name = (parsed.name as string) || "";
  const manufacturer = (parsed.manufacturer as string) || "";
  const modelName = (parsed.modelName as string) || "";
  const macAddress = (parsed.macAddress as string) || "";

  // === Priority 1: Serial number ===
  if (serialNumber) {
    const existing = await prisma.customerCollectedDevice.findFirst({
      where: {
        customerId,
        deviceType,
        serialNumber,
      },
      include: {
        address: { select: { id: true, label: true, address: true } },
      },
    });
    if (existing) {
      return {
        found: true,
        existingDeviceId: existing.id,
        method: "serial",
        confidence: "high",
        existingDevice: existing as unknown as Record<string, unknown>,
      };
    }
  }

  // === Priority 2: BIOS UUID (trong componentsJson.hardware.uuid) ===
  try {
    const comps = parsed.componentsJson
      ? JSON.parse(parsed.componentsJson as string)
      : null;
    const hwUuid = comps?.hardware?.uuid || "";
    if (hwUuid) {
      // Tìm trong serialNumber (có thể UUID đã được gán làm serial)
      const existingByUuid = await prisma.customerCollectedDevice.findFirst({
        where: {
          customerId,
          deviceType,
          serialNumber: hwUuid,
        },
      });
      if (existingByUuid) {
        return {
          found: true,
          existingDeviceId: existingByUuid.id,
          method: "uuid",
          confidence: "high",
          existingDevice: existingByUuid as unknown as Record<string, unknown>,
        };
      }
      // Tìm trong componentsJson chứa UUID (cập nhật thiết bị cũ)
      const allDevices = await prisma.customerCollectedDevice.findMany({
        where: { customerId, deviceType },
        select: { id: true, componentsJson: true },
      });
      for (const d of allDevices) {
        if (!d.componentsJson) continue;
        try {
          const dc = JSON.parse(d.componentsJson);
          if (dc.hardware?.uuid === hwUuid) {
            return {
              found: true,
              existingDeviceId: d.id,
              method: "uuid",
              confidence: "high",
              existingDevice: (await prisma.customerCollectedDevice.findUnique({
                where: { id: d.id },
                include: { address: { select: { id: true, label: true, address: true } } },
              })) as unknown as Record<string, unknown>,
            };
          }
        } catch { /* skip */ }
      }
    }
  } catch { /* componentsJson parse error */ }

  // === Priority 3: MAC address ===
  if (macAddress) {
    const existingByMac = await prisma.customerCollectedDevice.findFirst({
      where: {
        customerId,
        deviceType,
        macAddress,
      },
    });
    if (existingByMac) {
      return {
        found: true,
        existingDeviceId: existingByMac.id,
        method: "mac",
        confidence: "high",
        existingDevice: existingByMac as unknown as Record<string, unknown>,
      };
    }
  }

  // === Priority 4: Hostname + manufacturer + model ===
  // NOTE: name/hostname is stored in notes. We scan notes for the hostname.
  if (name && (manufacturer || modelName)) {
    const allByName = await prisma.customerCollectedDevice.findMany({
      where: {
        customerId,
        deviceType,
        manufacturer: manufacturer || undefined,
        modelName: modelName || undefined,
      },
      select: { id: true, notes: true },
    });
    const foundByName = allByName.find(d => d.notes?.includes(`Hostname: ${name}`));
    if (foundByName) {
      return {
        found: true,
        existingDeviceId: foundByName.id,
        method: "hostname_model",
        confidence: "low",
        existingDevice: (await prisma.customerCollectedDevice.findUnique({
          where: { id: foundByName.id },
          include: { address: { select: { id: true, label: true, address: true } } },
        })) as unknown as Record<string, unknown>,
      };
    }
  }

  // === Priority 5: No match ===
  return {
    found: false,
    existingDeviceId: null,
    method: "none",
    confidence: "low",
    existingDevice: null,
  };
}

/**
 * Chạy matching cho tất cả devices parsed, trả về ReviewData.
 */
export async function createReviewData(
  customerId: string,
  parsedDevices: Record<string, unknown>[],
): Promise<ReviewData> {
  const devices: ReviewDevice[] = [];
  let pendingParents = 0;

  for (const d of parsedDevices) {
    const deviceType = (d.deviceType as string) || "computer";
    const match = await matchDevice(customerId, d, deviceType);

    // Kiểm tra xem device này có cần parent không
    const parentDeviceId = d.parentDeviceId as string | undefined;
    if (parentDeviceId && !match.found) {
      pendingParents++;
    }

    devices.push({ parsed: d, match });
  }

  return {
    parsedAt: new Date().toISOString(),
    devices,
    pendingParents,
  };
}

/**
 * Tạo hoặc cập nhật device từ ReviewDevice đã được duyệt.
 * Trả về { id, action: "created" | "updated" }
 */
export async function confirmDevice(
  sessionId: string,
  customerId: string,
  addressId: string | null,
  collectedById: string | null,
  rd: ReviewDevice,
  parentIdMap: Map<string, string>,
): Promise<{ id: string; action: "created" | "updated" }> {
  const d = rd.parsed;
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

  // Stitch name (hostname) into notes for storage (schema has no name field)
  const hostnameNote = name ? `Hostname: ${name}` : "";
  const mergedNotes = [hostnameNote, notes].filter(Boolean).join("\n");

  // Resolve parentDeviceId (cho monitor/printer gắn với PC)
  let resolvedParentId: string | null = null;
  const rawParentId = d.parentDeviceId as string | undefined;
  if (rawParentId) {
    resolvedParentId = parentIdMap.get(rawParentId) || null;
  }

  if (rd.match.found && rd.match.existingDeviceId) {
    // === UPDATE existing device ===
    const existing = await prisma.customerCollectedDevice.findUnique({
      where: { id: rd.match.existingDeviceId },
    });
    if (!existing) {
      // Fallback: tạo mới
      return createDevice(customerId, addressId, collectedById, sessionId, deviceType, serialNumber, manufacturer, modelName, ipAddress, macAddress, cpu, ram, disk, os, mergedNotes, componentsJson, resolvedParentId);
    }

    const device = await prisma.customerCollectedDevice.update({
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
        sessionId,
        parentDeviceId: resolvedParentId || existing.parentDeviceId,
        collectedAt: new Date(),
      },
    });
    return { id: device.id, action: "updated" };
  } else {
    // === CREATE new device ===
    return createDevice(customerId, addressId, collectedById, sessionId, deviceType, serialNumber, manufacturer, modelName, ipAddress, macAddress, cpu, ram, disk, os, mergedNotes, componentsJson, resolvedParentId);
  }
}

async function createDevice(
  customerId: string,
  addressId: string | null,
  collectedById: string | null,
  sessionId: string,
  deviceType: string,
  serialNumber: string | null,
  manufacturer: string | null,
  modelName: string | null,
  ipAddress: string | null,
  macAddress: string | null,
  cpu: string | null,
  ram: string | null,
  disk: string | null,
  os: string | null,
  notes: string | null,
  componentsJson: string | null,
  parentDeviceId: string | null,
): Promise<{ id: string; action: "created" }> {
  const device = await prisma.customerCollectedDevice.create({
    data: {
      customerId,
      addressId,
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
      notes,
      collectedById,
      sessionId,
      parentDeviceId,
      status: "active",
    },
  });
  return { id: device.id, action: "created" };
}
