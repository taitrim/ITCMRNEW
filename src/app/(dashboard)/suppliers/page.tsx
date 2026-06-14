import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function SuppliersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const suppliers = await prisma.supplier.findMany({
    where: { organizationId: session.user.organizationId!, isActive: true },
    include: { _count: { select: { contracts: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Nhà cung cấp</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {suppliers.map((s) => (
          <div key={s.id} className="rounded-xl border bg-white p-4">
            <h3 className="font-medium">{s.name}</h3>
            <div className="mt-2 space-y-1 text-sm text-gray-500">
              {s.contactName && <p>Liên hệ: {s.contactName}</p>}
              {s.email && <p>Email: {s.email}</p>}
              {s.phone && <p>Điện thoại: {s.phone}</p>}
              <p>Hợp đồng: {s._count.contracts}</p>
            </div>
          </div>
        ))}
        {suppliers.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">Chưa có nhà cung cấp</div>
        )}
      </div>
    </div>
  );
}
