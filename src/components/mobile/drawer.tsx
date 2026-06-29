"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { X, LayoutDashboard, Ticket, Kanban, Monitor, Box, KeyRound, Printer, BookOpen, FileText, Building2, MapPin, Users, Settings, Wrench, AlertTriangle, LogOut, ChevronRight, Globe, Shield, Wallet, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
}

const groups = [
  { label: "Tổng quan", items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  { label: "ITIL", items: [
    { href: "/tickets", label: "Ticket", icon: Ticket },
    { href: "/tickets/kanban", label: "Kanban", icon: Kanban },
    { href: "/problems", label: "Problem", icon: AlertTriangle },
    { href: "/changes", label: "Change", icon: Wrench },
  ]},
  { label: "Tài sản", items: [
    { href: "/assets", label: "Danh sách", icon: Monitor },
    { href: "/assets/inventory", label: "Inventory", icon: Box },
    { href: "/assets/licenses", label: "Bản quyền", icon: KeyRound },
    { href: "/assets/consumables", label: "Vật tư", icon: Printer },
  ]},
  { label: "Khách hàng", items: [
    { href: "/customers", label: "Khách hàng", icon: Building2 },
  ]},
  { label: "Dữ liệu", items: [
    { href: "/knowledge", label: "Kiến thức", icon: BookOpen },
    { href: "/contracts", label: "Hợp đồng", icon: FileText },
    { href: "/suppliers", label: "Nhà cung cấp", icon: Building2 },
    { href: "/domains", label: "Domain", icon: Globe },
    { href: "/certificates", label: "Chứng chỉ", icon: Shield },
    { href: "/budgets", label: "Ngân sách", icon: Wallet },
    { href: "/projects", label: "Dự án", icon: FolderKanban },
    { href: "/locations", label: "Vị trí", icon: MapPin },
  ]},
  { label: "Quản trị", items: [
    { href: "/users", label: "Người dùng", icon: Users },
    { href: "/settings", label: "Cấu hình", icon: Settings },
  ]},
];

export function Drawer({ open, onClose }: DrawerProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const ref = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {open && <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />}
      <div ref={ref} className={cn(
        "fixed top-0 left-0 bottom-0 z-50 w-72 bg-white shadow-xl transition-transform duration-300",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-14 px-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">I</div>
            <div>
              <p className="font-semibold text-sm text-gray-900">ITSM System</p>
              <p className="text-[10px] text-muted-foreground">GLPI-compatible</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <nav className="overflow-y-auto h-[calc(100vh-8rem)] px-2 py-3 space-y-3">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <Link key={item.href} href={item.href} onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                      isActive(item.href) ? "bg-primary-50 text-primary-700 font-semibold" : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <item.icon size={20} />
                    <span className="flex-1">{item.label}</span>
                    <ChevronRight size={16} className="text-gray-300" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-border p-3 bg-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
              {session?.user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{session?.user?.name || "User"}</p>
              <p className="text-[11px] text-muted-foreground capitalize">{session?.user?.role}</p>
            </div>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all"
          ><LogOut size={16} /> Đăng xuất</button>
        </div>
      </div>
    </>
  );
}
