import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@newcrm.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@newcrm.com",
      password,
      role: "admin",
    },
  });

  const contact = await prisma.contact.create({
    data: {
      firstName: "John",
      lastName: "Doe",
      email: "john@acme.com",
      company: "Acme Corp",
      title: "CEO",
      ownerId: admin.id,
    },
  });

  await prisma.deal.create({
    data: {
      title: "Enterprise Plan - Acme Corp",
      value: 50000,
      stage: "NEGOTIATION",
      probability: 70,
      contactId: contact.id,
      ownerId: admin.id,
    },
  });

  console.log("Seed complete: admin@newcrm.com / admin123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
