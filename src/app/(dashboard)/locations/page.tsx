import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

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
      <h1 className="text-2xl font-bold">Vị trí</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {locations.map((l) => (
          <div key={l.id} className="rounded-xl border bg-white p-4">
            <h3 className="font-medium">{l.name}</h3>
            <div className="mt-2 space-y-1 text-sm text-gray-500">
              {l.building && <p>Tòa nhà: {l.building}</p>}
              {l.room && <p>Phòng: {l.room}</p>}
              {l.city && <p>Thành phố: {l.city}</p>}
              <div className="flex gap-3 mt-2 pt-2 border-t">
                <span className="text-xs">Tài sản: {l._count.assets}</span>
                <span className="text-xs">Người dùng: {l._count.users}</span>
              </div>
            </div>
          </div>
        ))}
        {locations.length === 0 && <div className="col-span-full text-center py-12 text-gray-400">Chưa có vị trí</div>}
      </div>
    </div>
  );
}
