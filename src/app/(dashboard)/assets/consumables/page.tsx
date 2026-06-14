import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function ConsumablesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const items = await prisma.consumable.findMany({
    where: { organizationId: session.user.organizationId! },
    include: { location: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Vật tư tiêu hao</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Quản lý vật tư, linh kiện, cartridge</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => {
          const low = c.stock <= c.alertThreshold;
          return (
            <Card key={c.id} className={`hover:shadow-md transition-all ${low ? "border-orange-200 ring-1 ring-orange-100" : ""}`}>
              <CardContent className="py-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
                      <Printer size={18} className="text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 text-sm">{c.name}</h3>
                      <Badge variant="default" size="sm" className="capitalize">{c.type}</Badge>
                    </div>
                  </div>
                  {low && <Badge variant="warning" size="sm">Sắp hết</Badge>}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tồn kho</span>
                  <span className={`font-bold ${low ? "text-orange-600" : "text-gray-900"}`}>{c.stock}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Ngưỡng: {c.alertThreshold}</span>
                  {c.price && <span>{c.price.toLocaleString("vi-VN")}đ</span>}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {items.length === 0 && (
          <div className="col-span-full flex flex-col items-center py-16 text-muted-foreground">
            <Printer size={40} className="mb-3 text-gray-300" />
            <p>Chưa có vật tư</p>
          </div>
        )}
      </div>
    </div>
  );
}
