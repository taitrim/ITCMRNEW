import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, Th, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const roleColors: Record<string, any> = {
  admin: "danger", tech: "primary", user: "default",
};
const roleLabel: Record<string, string> = {
  admin: "Quản trị", tech: "Kỹ thuật", user: "Người dùng",
};

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/login");

  const users = await prisma.users.findMany({
    where: { entitiesId: session.user.organizationId!, isDeleted: false },
    include: { locations: { select: { name: true } }, profiles: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Người dùng</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Quản lý người dùng và phân quyền</p>
      </div>
      <Card>
        <Table>
          <THead>
            <tr><Th>Họ tên</Th><Th>Email</Th><Th>Vai trò</Th><Th>Vị trí</Th><Th>Ticket</Th><Th>Tài sản</Th><Th>Trạng thái</Th></tr>
          </THead>
          <TBody>
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <Td className="font-medium text-gray-900">{u.realname || u.name}</Td>
                <Td className="text-muted-foreground">{u.name || "-"}</Td>
                <Td><Badge variant={roleColors[u.profiles?.name || "user"]}>{roleLabel[u.profiles?.name || "user"]}</Badge></Td>
                <Td className="text-muted-foreground">{u.locations?.name || "-"}</Td>
                <Td>-</Td>
                <Td>-</Td>
                <Td><Badge variant={u.isActive ? "success" : "default"} size="sm">{u.isActive ? "Hoạt động" : "Vô hiệu"}</Badge></Td>
              </tr>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
