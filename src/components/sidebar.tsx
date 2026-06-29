"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, Ticket, Kanban, Monitor, Box, KeyRound,
  Printer, BookOpen, FileText, Building2, Building, MapPin, Users,
  ChevronDown, LogOut, Settings, Wrench, AlertTriangle,
  Globe, Shield, Wallet, FolderKanban, HardDrive,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const nav: NavGroup[] = [
  {
    label: "Tổng quan",
    items: [{ href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> }],
  },
  {
    label: "ITIL",
    items: [
      { href: "/tickets", label: "Ticket", icon: <Ticket size={18} /> },
      { href: "/tickets/kanban", label: "Kanban", icon: <Kanban size={18} /> },
      { href: "/problems", label: "Problem", icon: <AlertTriangle size={18} /> },
      { href: "/changes", label: "Change", icon: <Wrench size={18} /> },
    ],
  },
  {
    label: "Tài sản",
    items: [
      { href: "/assets", label: "Danh sách", icon: <Monitor size={18} /> },
      { href: "/assets/inventory", label: "Inventory", icon: <Box size={18} /> },
      { href: "/assets/licenses", label: "Bản quyền", icon: <KeyRound size={18} /> },
      { href: "/assets/consumables", label: "Vật tư", icon: <Printer size={18} /> },
    ],
  },
  {
    label: "Khách hàng",
    items: [
      { href: "/customers", label: "Khách hàng", icon: <Building2 size={18} /> },
      { href: "/companies", label: "Công ty phụ trách", icon: <Building size={18} /> },
      { href: "/customer-employees", label: "Nhân viên KH", icon: <Users size={18} /> },
      { href: "/customer-devices", label: "Quản lý thiết bị", icon: <HardDrive size={18} /> },
    ],
  },
  {
    label: "Dữ liệu",
    items: [
      { href: "/knowledge", label: "Kiến thức", icon: <BookOpen size={18} /> },
      { href: "/contracts", label: "Hợp đồng", icon: <FileText size={18} /> },
      { href: "/suppliers", label: "Nhà cung cấp", icon: <Building2 size={18} /> },
      { href: "/domains", label: "Domain", icon: <Globe size={18} /> },
      { href: "/certificates", label: "Chứng chỉ", icon: <Shield size={18} /> },
      { href: "/budgets", label: "Ngân sách", icon: <Wallet size={18} /> },
      { href: "/projects", label: "Dự án", icon: <FolderKanban size={18} /> },
      { href: "/locations", label: "Vị trí", icon: <MapPin size={18} /> },
    ],
  },
  {
    label: "Quản trị",
    items: [
      { href: "/users", label: "Người dùng", icon: <Users size={18} /> },
      { href: "/settings", label: "Cấu hình", icon: <Settings size={18} /> },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className={cn(
      "desktop-only flex flex-col bg-white border-r border-border transition-all duration-200",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex h-15 items-center gap-2.5 px-4 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          I
        </div>
        {!collapsed && (
          <div>
            <p className="font-semibold text-sm text-gray-900 leading-tight">ITSM System</p>
            <p className="text-[10px] text-muted-foreground">GLPI-compatible</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {nav.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <Link key={item.href} href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all duration-150",
                    collapsed && "justify-center px-0",
                    isActive(item.href)
                      ? "bg-primary-50 text-primary-700 font-semibold"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <button onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all mb-2"
        >
          <ChevronDown size={16} className={cn("transition-transform", collapsed ? "rotate-90" : "-rotate-90")} />
        </button>
        <Link href="/profile" className={cn("flex items-center gap-2.5 rounded-lg transition-colors hover:bg-gray-50 -mx-1 px-2 py-1.5", collapsed && "justify-center")}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
            {session?.user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{session?.user?.name || "User"}</p>
              <p className="text-[11px] text-muted-foreground capitalize">{session?.user?.role}</p>
            </div>
          )}
        </Link>
        {!collapsed && (
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-2 w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut size={16} /> Đăng xuất
          </button>
        )}
      </div>
    </aside>
  );
}
