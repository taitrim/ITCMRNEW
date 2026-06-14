import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Box, Code, Monitor } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, Th, Td } from "@/components/ui/table";

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
      <div>
        <h1 className="text-xl font-bold text-gray-900">Inventory Agent</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Thu thập thông tin thiết bị từ xa qua PowerShell agent</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center">
              <Box size={22} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tổng Agent</p>
              <p className="text-2xl font-bold text-gray-900">{agents.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Monitor size={22} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tài sản động</p>
              <p className="text-2xl font-bold text-gray-900">{dynamicAssets}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center">
              <Code size={22} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kết nối gần nhất</p>
              <p className="text-sm font-bold text-gray-900">{agents.filter(a => a.lastContact).length || 0} agent</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Danh sách Agent</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <tr><Th>Tên</Th><Th>Device ID</Th><Th>IP</Th><Th>Lần cuối</Th><Th>Inventory</Th><Th>Trạng thái</Th></tr>
            </THead>
            <TBody>
              {agents.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <Td className="font-medium text-gray-900">{a.name}</Td>
                  <Td className="text-xs font-mono text-muted-foreground">{a.deviceId}</Td>
                  <Td className="text-xs text-muted-foreground">{a.lastIp || "-"}</Td>
                  <Td className="text-xs text-muted-foreground">
                    {a.lastContact ? new Date(a.lastContact).toLocaleString("vi-VN") : "Chưa kết nối"}
                  </Td>
                  <Td><Badge variant="primary" size="sm">{a._count.inventories}</Badge></Td>
                  <Td><Badge variant={a.isActive ? "success" : "default"} size="sm">{a.isActive ? "Hoạt động" : "Ngừng"}</Badge></Td>
                </tr>
              ))}
              {agents.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center text-muted-foreground">
                    <Box size={32} className="mb-2 text-gray-300" />
                    <p>Chưa có agent nào kết nối</p>
                    <p className="text-xs mt-1">Chạy lệnh sau trên máy cần thu thập:</p>
                    <pre className="text-xs mt-2 bg-gray-50 px-3 py-2 rounded-lg">pwsh agent\inventory-agent.ps1</pre>
                  </div>
                </td></tr>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Hướng dẫn cài đặt Agent</CardTitle></CardHeader>
        <CardContent>
          <div className="text-sm space-y-3">
            <p className="text-muted-foreground">Chạy lệnh sau trên máy tính cần thu thập thông tin:</p>
            <div className="bg-gray-900 text-green-400 rounded-lg p-4 text-sm font-mono overflow-x-auto">
              <p># Trên máy Windows:</p>
              <p>cd agent</p>
              <p>.\inventory-agent.ps1 -ServerUrl "http://YOUR_SERVER:3000" -ApiKey "agent-key-demo"</p>
              <p className="mt-2"># Hoặc cấu hình Task Scheduler chạy định kỳ:</p>
              <p>powershell -File "C:\path\to\inventory-agent.ps1" -ServerUrl "http://SERVER:3000"</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
