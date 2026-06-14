import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function LicensesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const licenses = await prisma.softwareLicense.findMany({
    where: { organizationId: session.user.organizationId! },
    include: { _count: { select: { assignments: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Bản quyền phần mềm</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Quản lý giấy phép phần mềm</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {licenses.map((l) => {
          const expiring = l.expirationDate && new Date(l.expirationDate) < new Date(Date.now() + 90 * 86400000);
          return (
            <Card key={l.id} className="hover:shadow-md transition-all">
              <CardContent className="py-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                      <KeyRound size={18} className="text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 text-sm">{l.name}</h3>
                      <p className="text-xs text-muted-foreground">{l.publisher}{l.version ? ` v${l.version}` : ""}</p>
                    </div>
                  </div>
                  <Badge variant="purple" size="sm" className="capitalize">{l.licenseType}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Đã dùng: <strong>{l._count.assignments}</strong> / {l.maxUsers || "∞"}</span>
                  {l.cost && <span>• {l.cost.toLocaleString("vi-VN")}đ</span>}
                </div>
                {l.expirationDate && (
                  <p className={`text-xs ${expiring ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                    {expiring ? "⚠ Sắp hết hạn: " : "Hết hạn: "}{new Date(l.expirationDate).toLocaleDateString("vi-VN")}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
        {licenses.length === 0 && (
          <div className="col-span-full flex flex-col items-center py-16 text-muted-foreground">
            <KeyRound size={40} className="mb-3 text-gray-300" />
            <p>Chưa có bản quyền</p>
          </div>
        )}
      </div>
    </div>
  );
}
