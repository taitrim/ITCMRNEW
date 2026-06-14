import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, Th, Td } from "@/components/ui/table";
import { Calendar, User, Clock, MessageSquare, CheckCircle2 } from "lucide-react";

const statusVariant: Record<string, any> = {
  new: "primary", assigned: "warning", in_progress: "warning", pending: "purple", resolved: "success", closed: "default",
};
const statusLabel: Record<string, string> = {
  new: "Mới", assigned: "Đã phân công", in_progress: "Đang xử lý", pending: "Chờ", resolved: "Đã giải quyết", closed: "Đã đóng",
};

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { name: true } },
      createdBy: { select: { name: true } },
      category: { select: { name: true, color: true } },
      followups: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!ticket || ticket.organizationId !== session.user.organizationId) notFound();

  return (
    <div className="p-6 space-y-6 animate-in">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{ticket.title}</h1>
              <Badge variant={statusVariant[ticket.status]}>{statusLabel[ticket.status]}</Badge>
              <Badge variant="default" size="sm">{ticket.type === "incident" ? "Sự cố" : "Yêu cầu"}</Badge>
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><User size={14} />{ticket.createdBy.name}</span>
              <span className="flex items-center gap-1.5"><Calendar size={14} />{new Date(ticket.createdAt).toLocaleString("vi-VN")}</span>
              {ticket.assignedTo && <span className="flex items-center gap-1.5"><User size={14} />Phân công: {ticket.assignedTo.name}</span>}
              {ticket.category && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: ticket.category.color || "#ccc" }} />
                  {ticket.category.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {ticket.description && (
        <Card>
          <CardHeader><CardTitle>Mô tả</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p></CardContent>
        </Card>
      )}

      {ticket.followups.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Theo dõi ({ticket.followups.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {ticket.followups.map((f) => (
                <div key={f.id} className="px-5 py-3 flex items-start gap-3">
                  <MessageSquare size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{f.user.name}</span>
                      <span className="text-xs text-muted-foreground">{new Date(f.createdAt).toLocaleString("vi-VN")}</span>
                      {f.isPrivate && <Badge size="sm" variant="warning">Riêng tư</Badge>}
                    </div>
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{f.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {ticket.tasks.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Tasks ({ticket.tasks.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <THead>
                <tr><Th>Nội dung</Th><Th>Trạng thái</Th></tr>
              </THead>
              <TBody>
                {ticket.tasks.map((t) => (
                  <tr key={t.id}>
                    <Td className="text-sm">{t.content}</Td>
                    <Td>
                      <Badge variant={t.state === "done" ? "success" : t.state === "in_progress" ? "warning" : "default"} size="sm">
                        {t.state === "todo" ? "Cần làm" : t.state === "in_progress" ? "Đang làm" : "Hoàn thành"}
                      </Badge>
                    </Td>
                  </tr>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
