import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function InventoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.organizationId!;

  const agents = await prisma.agent.findMany({
    where: { organizationId: orgId },
    include: { _count: { select: { inventories: true } }, user: { select: { name: true } } },
    orderBy: { lastContact: "desc" },
  });

  const dynamicAssets = await prisma.asset.count({ where: { organizationId: orgId, isDynamic: true } });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Inventory Agent</h1>
      <p className="text-sm text-gray-500">Thu thập thông tin thiết bị từ xa qua agent. Tổng: {agents.length} agent | {dynamicAssets} tài sản động</p>

      <div className="rounded-xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-3 font-medium">Agent</th>
              <th className="text-left p-3 font-medium">Device ID</th>
              <th className="text-left p-3 font-medium">Lần cuối</th>
              <th className="text-left p-3 font-medium">IP</th>
              <th className="text-left p-3 font-medium">Số lần Inventory</th>
              <th className="text-left p-3 font-medium">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{a.name}</td>
                <td className="p-3 text-gray-500 text-xs">{a.deviceId}</td>
                <td className="p-3">
                  {a.lastContact ? new Date(a.lastContact).toLocaleString("vi-VN") : "Chưa kết nối"}
                </td>
                <td className="p-3 text-gray-500">{a.lastIp || "-"}</td>
                <td className="p-3">{a._count.inventories}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {a.isActive ? "Hoạt động" : "Ngừng"}
                  </span>
                </td>
              </tr>
            ))}
            {agents.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-gray-400">
                <p>Chưa có agent nào kết nối</p>
                <p className="text-xs mt-1">Chạy agent: pwsh agent\inventory-agent.ps1</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <h2 className="font-semibold mb-2">Hướng dẫn cài đặt Agent</h2>
        <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto">
{`# Trên máy tính cần thu thập thông tin, chạy:
cd agent
.\inventory-agent.ps1 -ServerUrl "http://YOUR_SERVER:3000" -ApiKey "agent-key-demo"

# Hoặc chạy tự động (Task Scheduler):
powershell -File "C:\path\to\inventory-agent.ps1" -ServerUrl "http://SERVER:3000"`}
        </pre>
      </div>
    </div>
  );
}
