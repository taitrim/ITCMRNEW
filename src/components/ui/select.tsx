import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className, id, ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>}
      <select id={id} className={cn(
        "w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-gray-900",
        "transition-all duration-150",
        "focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20",
        "disabled:bg-gray-50 disabled:text-gray-400",
        error && "border-danger focus:border-danger focus:ring-danger/20",
        className
      )} {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
