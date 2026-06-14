import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ContractsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const contracts = await prisma.contract.findMany({
    where: { organizationId: session.user.organizationId! },
    include: { supplier: { select: { name: true } } },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Hợp đồng</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Quản lý hợp đồng dịch vụ và bảo trì</p>
      </div>
      {contracts.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center py-16 text-muted-foreground">
          <FileText size={40} className="mb-3 text-gray-300" />
          <p>Chưa có hợp đồng nào</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contracts.map((c) => {
            const expired = c.endDate && new Date(c.endDate) < new Date();
            return (
              <Card key={c.id} className={`hover:shadow-md transition-all ${expired ? "border-orange-200 ring-1 ring-orange-100" : ""}`}>
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-gray-900 text-sm">{c.name}</h3>
                    {expired && <Badge variant="warning" size="sm">Hết hạn</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="primary" size="sm" className="capitalize">{c.contractType}</Badge>
                    {c.cost && <span className="text-xs text-muted-foreground">{c.cost.toLocaleString("vi-VN")}đ</span>}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {c.supplier && <p>Nhà cung cấp: {c.supplier.name}</p>}
                    {c.startDate && <p>Hiệu lực: {new Date(c.startDate).toLocaleDateString("vi-VN")} {c.endDate ? `→ ${new Date(c.endDate).toLocaleDateString("vi-VN")}` : ""}</p>}
                    <Badge size="sm">{c.renewalType === "auto" ? "Tự động gia hạn" : "Gia hạn thủ công"}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
