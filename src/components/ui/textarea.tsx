import { cn } from "@/lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>}
      <textarea id={id} className={cn(
        "w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-gray-900",
        "transition-all duration-150 placeholder:text-gray-400 min-h-[80px]",
        "focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20",
        "disabled:bg-gray-50 disabled:text-gray-400",
        error && "border-danger focus:border-danger focus:ring-danger/20",
        className
      )} {...props} />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
