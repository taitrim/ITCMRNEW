import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SuppliersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const suppliers = await prisma.supplier.findMany({
    where: { organizationId: session.user.organizationId! },
    include: { _count: { select: { contracts: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Nhà cung cấp</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Đối tác cung cấp dịch vụ và thiết bị</p>
      </div>
      {suppliers.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center py-16 text-muted-foreground">
          <Building2 size={40} className="mb-3 text-gray-300" />
          <p>Chưa có nhà cung cấp nào</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <Card key={s.id} className="hover:shadow-md transition-all">
              <CardContent className="py-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center text-primary font-bold text-sm">
                    {s.name[0]}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm">{s.name}</h3>
                    <Badge variant="primary" size="sm" className="capitalize">{s.supplierType}</Badge>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5 ml-11">
                  {s.contactName && <p>Liên hệ: {s.contactName}</p>}
                  {s.email && <p>{s.email}</p>}
                  {s.phone && <p>{s.phone}</p>}
                  <p className="text-xs font-medium">{s._count.contracts} hợp đồng</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
