"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/mobile/bottom-nav";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { Drawer } from "@/components/mobile/drawer";
import { BottomSheet } from "@/components/mobile/bottom-sheet";
import { useRouter } from "next/navigation";
import { Ticket, Monitor, Building2 } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">{children}</main>
      </div>

      <BottomNav onAction={() => setSheetOpen(true)} onMenu={() => setDrawerOpen(true)} />
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Tạo mới">
        <div className="space-y-2">
          <button onClick={() => { setSheetOpen(false); router.push("/tickets/create"); }}
            className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
              <Ticket size={24} className="text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">Ticket mới</p>
              <p className="text-xs text-muted-foreground">Tạo yêu cầu hỗ trợ hoặc báo sự cố</p>
            </div>
          </button>
          <button onClick={() => { setSheetOpen(false); router.push("/customers/create"); }}
            className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <Building2 size={24} className="text-amber-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">Khách hàng mới</p>
              <p className="text-xs text-muted-foreground">Thêm khách hàng hoặc doanh nghiệp</p>
            </div>
          </button>
          <button onClick={() => { setSheetOpen(false); router.push("/assets") }}
            className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Monitor size={24} className="text-emerald-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">Tài sản mới</p>
              <p className="text-xs text-muted-foreground">Thêm thiết bị vào hệ thống</p>
            </div>
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
