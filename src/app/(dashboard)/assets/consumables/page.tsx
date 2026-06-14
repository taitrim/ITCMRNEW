import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function ConsumablesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const items = await prisma.consumable.findMany({
    where: { organizationId: session.user.organizationId! },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Vật tư tiêu hao</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => {
          const low = c.stock <= c.alertThreshold;
          return (
            <div key={c.id} className={`rounded-xl border bg-white p-4 ${low ? "border-orange-300 ring-1 ring-orange-200" : ""}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{c.name}</h3>
                {low && <span className="text-xs bg-orange-100 text-orange-700 rounded-full px-2 py-0.5">Sắp hết</span>}
              </div>
              <div className="mt-2 space-y-1 text-sm text-gray-500">
                <p>Tồn kho: <span className={`font-bold ${low ? "text-orange-600" : "text-green-600"}`}>{c.stock}</span></p>
                <p>Ngưỡng cảnh báo: {c.alertThreshold}</p>
                {c.price && <p>Đơn giá: {c.price.toLocaleString("vi-VN")}đ</p>}
              </div>
            </div>
          );
        })}
        {items.length === 0 && <div className="col-span-full text-center py-12 text-gray-400">Chưa có vật tư</div>}
      </div>
    </div>
  );
}
