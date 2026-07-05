const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const p = new PrismaClient();
async function main() {
  const customers = await p.customer.findMany({ where: { agentKey: null } });
  for (const c of customers) {
    await p.customer.update({ where: { id: c.id }, data: { agentKey: "ak_" + crypto.randomBytes(16).toString("hex") } });
  }
  console.log("Populated: " + customers.length);
  await p.$disconnect();
}
main();
