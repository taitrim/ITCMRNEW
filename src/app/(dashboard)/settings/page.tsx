import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/login");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Cấu hình</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Quản lý cấu hình hệ thống</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[
          { title: "Danh mục ITIL", desc: "Quản lý danh mục ticket, problem, change", icon: "📂" },
          { title: "Trạng thái", desc: "Định nghĩa trạng thái tài sản", icon: "🏷️" },
          { title: "Hãng sản xuất", desc: "Quản lý hãng sản xuất thiết bị", icon: "🏭" },
          { title: "Agent API Key", desc: "Cấu hình khóa API cho inventory agent", icon: "🔑" },
          { title: "Email", desc: "Cấu hình gửi email thông báo", icon: "📧" },
          { title: "Bảo mật", desc: "Logs, audit, session timeout", icon: "🔒" },
        ].map((item) => (
          <Card key={item.title}>
            <CardContent className="py-4 cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <div>
                  <h3 className="font-medium text-sm text-gray-900">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
