import { cn } from "@/lib/utils";

export function Table({ className, children, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-auto">
      <table className={cn("w-full text-sm", className)} {...props}>{children}</table>
    </div>
  );
}

export function THead({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("border-b border-border bg-surface-secondary/50", className)} {...props}>{children}</thead>;
}

export function TBody({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-border", className)} {...props}>{children}</tbody>;
}

export function Th({ className, children, ...props }: React.ThHTMLAttributes<HTMLTableHeaderCellElement>) {
  return <th className={cn("text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wider", className)} {...props}>{children}</th>;
}

export function Td({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableDataCellElement>) {
  return <td className={cn("px-4 py-3 text-gray-700", className)} {...props}>{children}</td>;
}
