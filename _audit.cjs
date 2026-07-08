const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const devs = await p.customerCollectedDevice.findMany({
    select: { id: true, deviceType: true, manufacturer: true, modelName: true, serialNumber: true, notes: true, componentsJson: true },
    orderBy: { deviceType: "asc" },
  });
  for (const d of devs) {
    const c = d.componentsJson ? JSON.parse(d.componentsJson) : null;
    console.log(`[${d.deviceType}] ${d.manufacturer || "?"} ${d.modelName || "?"} SN=${d.serialNumber || "-"}`);
    console.log(`  notes: ${d.notes}`);
    if (d.deviceType === "printer" && c) {
      console.log(`  driver=${c.driver || "-"} port=${c.port || "-"} network=${c.network || false} shared=${c.shared || false}`);
    }
    if (d.deviceType === "network" && c) {
      console.log(`  desc=${c.description || "-"} IP=${c.ipaddress || "-"}`);
    }
    console.log();
  }
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
