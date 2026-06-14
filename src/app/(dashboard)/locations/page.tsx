import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { MapPin, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function LocationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const locations = await prisma.location.findMany({
    where: { organizationId: session.user.organizationId! },
    include: { _count: { select: { assets: true, users: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Vị trí</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Quản lý địa điểm và văn phòng</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {locations.map((l) => (
          <Card key={l.id} className="hover:shadow-md transition-all">
            <CardContent className="py-4 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                  <MapPin size={18} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 text-sm">{l.name}</h3>
                  {l.building && <p className="text-xs text-muted-foreground">{l.building}{l.room ? ` - ${l.room}` : ""}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground border-t border-border">
                <span>{l._count.assets} tài sản</span>
                <span>{l._count.users} người dùng</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {locations.length === 0 && (
          <div className="col-span-full flex flex-col items-center py-16 text-muted-foreground">
            <MapPin size={40} className="mb-3 text-gray-300" />
            <p>Chưa có vị trí nào</p>
          </div>
        )}
      </div>
    </div>
  );
}
