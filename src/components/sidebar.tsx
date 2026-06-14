"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const navGroups = [
  { label: "Tổng quan", items: [
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
  ]},
  { label: "ITIL", items: [
    { href: "/tickets", label: "Ticket", icon: "🎫" },
    { href: "/tickets/kanban", label: "Kanban Board", icon: "📋" },
  ]},
  { label: "Tài sản", items: [
    { href: "/assets", label: "Danh sách tài sản", icon: "💻" },
    { href: "/assets/inventory", label: "Inventory Agent", icon: "📡" },
    { href: "/assets/licenses", label: "Bản quyền phần mềm", icon: "🔑" },
    { href: "/assets/consumables", label: "Vật tư tiêu hao", icon: "🖨️" },
  ]},
  { label: "Dữ liệu", items: [
    { href: "/knowledge", label: "Kiến thức", icon: "📚" },
    { href: "/contracts", label: "Hợp đồng", icon: "📄" },
    { href: "/suppliers", label: "Nhà cung cấp", icon: "🏢" },
    { href: "/locations", label: "Vị trí", icon: "📍" },
  ]},
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="flex w-64 flex-col border-r bg-white">
      <div className="flex h-14 items-center border-b px-4">
        <div>
          <p className="font-bold text-base">ITSM System</p>
          <p className="text-[10px] text-gray-400">GLPI-compatible</p>
        </div>
      </div>
      <nav className="flex-1 overflow-auto p-2 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold uppercase text-gray-400 px-3 mb-1">{group.label}</p>
            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
            {session?.user?.name?.[0] || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{session?.user?.name || "User"}</p>
            <p className="text-[10px] text-gray-400 capitalize">{session?.user?.role}</p>
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
        >Đăng xuất</button>
      </div>
    </aside>
  );
}
