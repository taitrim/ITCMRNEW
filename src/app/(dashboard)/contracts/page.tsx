import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

const typeLabel: Record<string, string> = {
  service: "Dịch vụ", maintenance: "Bảo trì", lease: "Thuê", support: "Hỗ trợ", license: "Bản quyền",
};

export default async function ContractsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const contracts = await prisma.contract.findMany({
    where: { organizationId: session.user.organizationId! },
    include: { supplier: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Hợp đồng</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {contracts.map((c) => (
          <div key={c.id} className="rounded-xl border bg-white p-4">
            <h3 className="font-medium">{c.name}</h3>
            <div className="mt-2 space-y-1 text-sm text-gray-500">
              <p>Loại: {typeLabel[c.contractType] || c.contractType}</p>
              <p>Nhà cung cấp: {c.supplier?.name || "-"}</p>
              {c.startDate && <p>Từ: {new Date(c.startDate).toLocaleDateString("vi-VN")}</p>}
              {c.endDate && <p>Đến: {new Date(c.endDate).toLocaleDateString("vi-VN")}</p>}
              {c.cost && <p>Giá trị: {c.cost.toLocaleString("vi-VN")}đ</p>}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${c.isActive ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-xs text-gray-400">{c.isActive ? "Đang hiệu lực" : "Hết hạn"}</span>
            </div>
          </div>
        ))}
        {contracts.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">Chưa có hợp đồng</div>
        )}
      </div>
    </div>
  );
}
