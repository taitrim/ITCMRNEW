"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Settings as SettingsIcon, FolderKanban, Tag, Factory, Key, Mail, Shield, ChevronRight } from "lucide-react";

const items = [
  { title: "Danh mục ITIL", desc: "Quản lý danh mục ticket, problem, change", icon: FolderKanban, color: "bg-blue-50", iconColor: "text-blue-600" },
  { title: "Trạng thái", desc: "Định nghĩa trạng thái tài sản", icon: Tag, color: "bg-green-50", iconColor: "text-green-600" },
  { title: "Hãng sản xuất", desc: "Quản lý hãng sản xuất thiết bị", icon: Factory, color: "bg-purple-50", iconColor: "text-purple-600" },
  { title: "Agent API Key", desc: "Cấu hình khóa API cho inventory agent", icon: Key, color: "bg-orange-50", iconColor: "text-orange-600" },
  { title: "Email", desc: "Cấu hình gửi email thông báo", icon: Mail, color: "bg-cyan-50", iconColor: "text-cyan-600" },
  { title: "Bảo mật", desc: "Logs, audit, session timeout", icon: Shield, color: "bg-red-50", iconColor: "text-red-600" },
];

export default function SettingsPage() {
  const { data: session, status } = useSession();
  if (status === "loading") return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!session?.user || session.user.role !== "admin") redirect("/login");

  return (
    <div className="min-h-screen bg-surface-secondary/30 pb-4">
      <div className="px-4 pt-3 pb-2 bg-white border-b border-border">
        <h1 className="text-base font-bold">Cấu hình</h1>
        <p className="text-xs text-muted-foreground">Quản lý cấu hình hệ thống</p>
      </div>
      <div className="px-4 mt-3 space-y-2.5">
        {items.map((item, i) => (
          <div key={item.title} className="animate-in-up bg-white rounded-xl p-4 shadow-xs border border-border" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl ${item.color} flex items-center justify-center flex-shrink-0`}>
                <item.icon size={22} className={item.iconColor} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm text-gray-900">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
