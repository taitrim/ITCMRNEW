"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Ticket, Monitor, Plus, Menu as MenuIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "Trang chủ", icon: LayoutDashboard },
  { href: "/tickets", label: "Ticket", icon: Ticket },
  { href: null, label: "Tạo", icon: Plus, isAction: true },
  { href: "/assets", label: "Tài sản", icon: Monitor },
  { href: null, label: "Menu", icon: MenuIcon, isMenu: true },
];

export function BottomNav({ onAction, onMenu }: { onAction: () => void; onMenu: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string | null) => {
    if (!href) return false;
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <nav className="mobile-only fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          if (tab.isAction) {
            return (
              <button key="action" onClick={onAction}
                className="flex flex-col items-center justify-center w-14 h-10 rounded-xl bg-primary text-white -mt-5 shadow-lg shadow-primary/30"
              >
                <Plus size={22} />
              </button>
            );
          }
          if (tab.isMenu) {
            return (
              <button key="menu" onClick={onMenu}
                className="flex flex-col items-center gap-0.5 px-3 py-1"
              >
                <MenuIcon size={22} className={pathname.startsWith("/menu") ? "text-primary" : "text-gray-400"} />
                <span className={cn("text-[10px] font-medium", pathname.startsWith("/menu") ? "text-primary" : "text-gray-400")}>
                  {tab.label}
                </span>
              </button>
            );
          }
          const active = isActive(tab.href);
          return (
            <Link key={tab.href} href={tab.href!}
              className="flex flex-col items-center gap-0.5 px-3 py-1"
            >
              <tab.icon size={22} className={active ? "text-primary" : "text-gray-400"} />
              <span className={cn("text-[10px] font-medium", active ? "text-primary" : "text-gray-400")}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
