"use client";
import { cn } from "@/lib/utils";

interface TabsProps {
  tabs: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div className={cn("flex gap-1 p-1 bg-gray-100 rounded-lg w-fit", className)}>
      {tabs.map((t) => (
        <button key={t.value} onClick={() => onChange(t.value)}
          className={cn(
            "px-3.5 py-1.5 text-sm font-medium rounded-md transition-all duration-150",
            value === t.value ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-700"
          )}
        >{t.label}</button>
      ))}
    </div>
  );
}
