import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, Th, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusVariant: Record<string, "default" | "primary" | "warning" | "danger" | "success" | "info" | "purple"> = {
  new: "primary", assigned: "warning", in_progress: "warning", pending: "purple", resolved: "success", closed: "default",
};
const statusLabel: Record<string, string> = {
  new: "Mới", assigned: "Đã phân công", in_progress: "Đang xử lý", pending: "Chờ", resolved: "Đã giải quyết", closed: "Đã đóng",
};
const priorityVariant: Record<string, any> = {
  low: "default", medium: "primary", high: "warning", urgent: "danger", critical: "danger",
};

export default async function TicketsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tickets = await prisma.ticket.findMany({
    where: { organizationId: session.user.organizationId! },
    include: { assignedTo: { select: { name: true } }, category: { select: { name: true, color: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ticket</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Quản lý yêu cầu và sự cố IT</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-white focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20 w-56" placeholder="Tìm kiếm ticket..." />
          </div>
          <Button><Plus size={16} /> Tạo ticket</Button>
        </div>
      </div>

      <Card>
        <Table>
          <THead>
            <tr>
              <Th>Tiêu đề</Th>
              <Th>Loại</Th>
              <Th>Danh mục</Th>
              <Th>Ưu tiên</Th>
              <Th>Trạng thái</Th>
              <Th>Phân công</Th>
              <Th>Ngày tạo</Th>
            </tr>
          </THead>
          <TBody>
            {tickets.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => window.location.href = `/tickets/${t.id}`}>
                <Td>
                  <Link href={`/tickets/${t.id}`} className="font-medium text-gray-900 hover:text-primary">{t.title}</Link>
                </Td>
                <Td><Badge variant="default" size="sm">{t.type === "incident" ? "Sự cố" : "Yêu cầu"}</Badge></Td>
                <Td className="text-muted-foreground">
                  {t.category ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: t.category.color || "#ccc" }} />
                      {t.category.name}
                    </span>
                  ) : "-"}
                </Td>
                <Td><Badge variant={priorityVariant[t.priority] || "default"} size="sm">{t.priority}</Badge></Td>
                <Td><Badge variant={statusVariant[t.status] || "default"} size="sm">{statusLabel[t.status] || t.status}</Badge></Td>
                <Td className="text-muted-foreground">{t.assignedTo?.name || "-"}</Td>
                <Td className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString("vi-VN")}</Td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Chưa có ticket nào</td></tr>
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
