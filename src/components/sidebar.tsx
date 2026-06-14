"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const navItems = [
  { href: "/dashboard", label: "Tổng quan", icon: "📊" },
  { href: "/tickets", label: "Ticket", icon: "🎫" },
  { href: "/assets", label: "Tài sản", icon: "💻" },
  { href: "/knowledge", label: "Kiến thức", icon: "📚" },
  { href: "/contracts", label: "Hợp đồng", icon: "📄" },
  { href: "/suppliers", label: "Nhà cung cấp", icon: "🏢" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="flex w-60 flex-col border-r bg-white">
      <div className="flex h-14 items-center border-b px-4 font-semibold text-lg">
        ITSM System
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <div className="text-sm text-gray-500 mb-2 truncate">{session?.user?.name || session?.user?.email}</div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
        >
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
