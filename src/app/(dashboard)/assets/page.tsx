import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Search, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, Th, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const typeIcon: Record<string, string> = {
  computer: "💻", monitor: "🖥️", printer: "🖨️", network: "🌐", phone: "📱", software: "💿", peripheral: "🎮", other: "📦",
};
const statusVariant: Record<string, any> = {
  in_use: "success", stored: "default", repair: "warning", retired: "danger", broken: "danger",
};
const statusLabel: Record<string, string> = {
  in_use: "Đang dùng", stored: "Lưu kho", repair: "Đang sửa", retired: "Đã thanh lý", broken: "Hỏng",
};

export default async function AssetsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const assets = await prisma.asset.findMany({
    where: { organizationId: session.user.organizationId!, isActive: true },
    include: { location: { select: { name: true } }, assignedTo: { select: { name: true } }, manufacturer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quản lý tài sản</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Toàn bộ tài sản CNTT trong hệ thống</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-white focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20 w-56" placeholder="Tìm kiếm tài sản..." />
          </div>
          <Button><Plus size={16} /> Thêm tài sản</Button>
        </div>
      </div>

      <Card>
        <Table>
          <THead>
            <tr>
              <Th>Tên</Th>
              <Th>Loại</Th>
              <Th>Serial</Th>
              <Th>Hãng</Th>
              <Th>Vị trí</Th>
              <Th>Người dùng</Th>
              <Th>Trạng thái</Th>
            </tr>
          </THead>
          <TBody>
            {assets.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => window.location.href = `/assets/${a.id}`}>
                <Td>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{typeIcon[a.assetType] || "📦"}</span>
                    <span className="font-medium text-gray-900">{a.name}</span>
                  </div>
                </Td>
                <Td className="capitalize text-muted-foreground">{a.assetType}</Td>
                <Td className="text-xs text-muted-foreground font-mono">{a.serialNumber || "-"}</Td>
                <Td className="text-muted-foreground">{a.manufacturer?.name || "-"}</Td>
                <Td className="text-muted-foreground">{a.location?.name || "-"}</Td>
                <Td className="text-muted-foreground">{a.assignedTo?.name || "-"}</Td>
                <Td><Badge variant={statusVariant[a.status] || "default"} size="sm">{statusLabel[a.status] || a.status}</Badge></Td>
              </tr>
            ))}
            {assets.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Chưa có tài sản nào</td></tr>
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
