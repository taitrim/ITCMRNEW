import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

const typeIcon: Record<string, string> = {
  computer: "💻", monitor: "🖥️", printer: "🖨️", network: "🌐", phone: "📱", software: "💿", other: "📦",
};

const statusBadge = (s: string) => {
  const colors: Record<string, string> = {
    in_use: "bg-green-100 text-green-700", stored: "bg-gray-100 text-gray-600",
    repair: "bg-orange-100 text-orange-700", retired: "bg-red-100 text-red-700", broken: "bg-red-100 text-red-700",
  };
  return colors[s] || "bg-gray-100 text-gray-600";
};

const statusLabel: Record<string, string> = {
  in_use: "Đang dùng", stored: "Lưu kho", repair: "Đang sửa", retired: "Đã thanh lý", broken: "Hỏng",
};

export default async function AssetsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const assets = await prisma.asset.findMany({
    where: { organizationId: session.user.organizationId!, isActive: true },
    include: { location: { select: { name: true } }, assignedTo: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quản lý tài sản</h1>
        <span className="text-sm text-gray-400">Tổng: {assets.length}</span>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-3 font-medium">Tên</th>
              <th className="text-left p-3 font-medium">Loại</th>
              <th className="text-left p-3 font-medium">Serial</th>
              <th className="text-left p-3 font-medium">Vị trí</th>
              <th className="text-left p-3 font-medium">Người dùng</th>
              <th className="text-left p-3 font-medium">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id} className="border-b hover:bg-gray-50">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span>{typeIcon[a.assetType] || "📦"}</span>
                    <div>
                      <p className="font-medium">{a.name}</p>
                      <p className="text-xs text-gray-400">{a.manufacturer} {a.model}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3 capitalize">{a.assetType}</td>
                <td className="p-3 text-gray-500">{a.serialNumber || "-"}</td>
                <td className="p-3 text-gray-500">{a.location?.name || "-"}</td>
                <td className="p-3 text-gray-500">{a.assignedTo?.name || "-"}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(a.status)}`}>
                    {statusLabel[a.status] || a.status}
                  </span>
                </td>
              </tr>
            ))}
            {assets.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-gray-400">Chưa có tài sản nào</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
