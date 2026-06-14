import { cn } from "@/lib/utils";

export function StatusDot({ status, label, className }: { status?: string; label?: string; className?: string }) {
  const colors: Record<string, string> = {
    new: "bg-blue-500", assigned: "bg-yellow-500", in_progress: "bg-orange-500",
    pending: "bg-purple-500", resolved: "bg-emerald-500", closed: "bg-gray-400",
    in_use: "bg-emerald-500", stored: "bg-gray-400", repair: "bg-orange-500",
    retired: "bg-red-500", broken: "bg-red-500",
    active: "bg-emerald-500", inactive: "bg-gray-400",
    todo: "bg-gray-400", done: "bg-emerald-500",
    low: "bg-gray-400", medium: "bg-blue-500", high: "bg-orange-500", urgent: "bg-red-500", critical: "bg-red-600",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("w-2 h-2 rounded-full", colors[status || ""] || "bg-gray-300")} />
      {label && <span className="text-sm">{label}</span>}
    </span>
  );
}
