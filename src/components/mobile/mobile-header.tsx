"use client";

import { useState } from "react";
import { Search, Bell, ArrowLeft, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const titles: Record<string, string> = {
  "/dashboard": "ITSM System",
  "/tickets": "Ticket",
  "/tickets/kanban": "Kanban Board",
  "/assets": "Quản lý tài sản",
  "/assets/inventory": "Inventory Agent",
  "/assets/licenses": "Bản quyền",
  "/assets/consumables": "Vật tư",
  "/customers": "Khách hàng",
  "/domains": "Domain",
  "/certificates": "Chứng chỉ",
  "/budgets": "Ngân sách",
  "/projects": "Dự án",
  "/knowledge": "Kiến thức",
  "/contracts": "Hợp đồng",
  "/suppliers": "Nhà cung cấp",
  "/locations": "Vị trí",
  "/users": "Người dùng",
  "/problems": "Problem",
  "/changes": "Change",
  "/settings": "Cấu hình",
};

export function MobileHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [searching, setSearching] = useState(false);

  const title = Object.entries(titles).find(([k]) => pathname.startsWith(k))?.[1] || "ITSM System";
  const isDetail = pathname.includes("/tickets/") && pathname !== "/tickets" && pathname !== "/tickets/kanban" ||
    pathname.includes("/assets/") && pathname !== "/assets" && !pathname.includes("/assets/inventory") && !pathname.includes("/assets/licenses") && !pathname.includes("/assets/consumables");

  return (
    <header className="mobile-only sticky top-0 z-40 bg-white border-b border-border">
      <div className="flex items-center justify-between h-12 px-4">
        <div className="flex items-center gap-3">
          {isDetail && (
            <button onClick={() => router.back()} className="p-1 -ml-1 text-gray-700">
              <ArrowLeft size={22} />
            </button>
          )}
          {searching ? (
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input autoFocus className="w-full h-9 pl-9 pr-3 text-sm rounded-full bg-gray-100 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-primary/20" placeholder="Tìm kiếm..." />
              </div>
              <button onClick={() => setSearching(false)} className="text-sm text-gray-500"><X size={18} /></button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs">I</div>
                <h1 className="font-semibold text-base text-gray-900">{title}</h1>
              </div>
              <button onClick={() => setSearching(true)} className="p-1.5 text-gray-500">
                <Search size={20} />
              </button>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button className="relative p-1.5 text-gray-500">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger" />
          </button>
        </div>
      </div>
    </header>
  );
}
