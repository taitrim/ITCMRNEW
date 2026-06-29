import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ITEM_LABELS: Record<string, string> = {
  Computers: "Máy tính", Monitors: "Màn hình", Printers: "Máy in",
  Networkequipments: "Thiết bị mạng", Peripherals: "Ngoại vi",
  Phones: "Điện thoại", Softwares: "Phần mềm", Softwarelicenses: "Bản quyền",
  Tickets: "Ticket", Problems: "Problem", Changes: "Change",
  Contracts: "Hợp đồng", Certificates: "Chứng chỉ", Domains: "Domain",
  Appliances: "Thiết bị", Projects: "Dự án", Budgets: "Ngân sách",
  Consumableitems: "Vật tư", Cartridgeitems: "Mực in",
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const items = await prisma.customerItem.findMany({
    where: { customerId: id },
    orderBy: { createdAt: "desc" },
  });

  const withNames = await Promise.all(
    items.map(async (item) => {
      let itemName = "";
      try {
        if (item.itemType && item.itemId) {
          const model = (prisma as any)[item.itemType];
          if (model) {
            const row = await model.findUnique({ where: { id: item.itemId }, select: { id: true, name: true } });
            if (row) itemName = row.name || "";
          }
        }
      } catch {}
      return {
        ...item,
        itemLabel: ITEM_LABELS[item.itemType || ""] || item.itemType || "",
        itemName,
      };
    })
  );

  return Response.json(withNames);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const item = await prisma.customerItem.create({
    data: { customerId: id, itemType: body.itemType, itemId: body.itemId, relation: body.relation || "managed", isPrimary: body.isPrimary || true },
  });

  return Response.json(item, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  await prisma.customerItem.delete({ where: { id: body.id } });
  return Response.json({ success: true });
}
