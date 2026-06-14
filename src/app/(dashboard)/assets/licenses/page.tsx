import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

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
      <h1 className="text-2xl font-bold">Bản quyền phần mềm</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {licenses.map((l) => (
          <div key={l.id} className="rounded-xl border bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{l.name}</h3>
                <p className="text-xs text-gray-400">{l.publisher} • {l.version || "-"}</p>
              </div>
              <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 capitalize">{l.licenseType}</span>
            </div>
            <div className="mt-3 space-y-1 text-sm text-gray-500">
              <p>Số lượng: {l._count.assignments} / {l.maxUsers || "∞"}</p>
              {l.expirationDate && <p>Hết hạn: {new Date(l.expirationDate).toLocaleDateString("vi-VN")}</p>}
              {l.cost && <p>Giá trị: {l.cost.toLocaleString("vi-VN")}đ</p>}
            </div>
          </div>
        ))}
        {licenses.length === 0 && <div className="col-span-full text-center py-12 text-gray-400">Chưa có bản quyền</div>}
      </div>
    </div>
  );
}
