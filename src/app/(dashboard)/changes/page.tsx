import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Wrench } from "lucide-react";

export default async function ChangesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const changes = await prisma.changes.findMany({
    where: { entitiesId: session.user.organizationId!, isDeleted: false },
    include: {
      changeUsers: { include: { users: { select: { name: true } } }, where: { type: 1 } },
      itilcategories: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Change</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Quản lý thay đổi hệ thống</p>
      </div>
      {changes.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center py-16 text-muted-foreground">
          <Wrench size={40} className="mb-3 text-gray-300" />
          <p>Chưa có change nào</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {changes.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-start justify-between py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{c.name}</h3>
                    <Badge>#{c.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{c.content?.slice(0, 120)}...</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {c.changeUsers?.[0]?.users && <span>{c.changeUsers[0].users.name}</span>}
                    {c.itilcategories && <span>{c.itilcategories.name}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
