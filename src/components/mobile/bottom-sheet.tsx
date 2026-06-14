"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) { document.body.style.overflow = "hidden"; }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div ref={ref} className={cn(
        "relative z-50 w-full max-w-lg bg-white rounded-t-2xl shadow-xl max-h-[80vh] overflow-auto slide-up"
      )}>
        <div className="sticky top-0 bg-white border-b border-border px-5 py-3 flex items-center justify-between z-10">
          <div className="flex-1" />
          <div className="w-8 h-1 rounded-full bg-gray-300 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
          {title && <h3 className="text-sm font-semibold text-gray-900">{title}</h3>}
          <div className="flex-1" />
        </div>
        <div className="p-5 pt-4">{children}</div>
      </div>
    </div>
  );
}
