import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variants: Record<string, string> = {
  primary: "bg-primary text-white hover:bg-primary-600 shadow-xs",
  secondary: "bg-secondary-100 text-secondary-500 hover:bg-secondary-200",
  ghost: "text-gray-600 hover:bg-gray-100",
  destructive: "bg-danger text-white hover:opacity-90",
  outline: "border border-gray-200 text-gray-700 hover:bg-gray-50",
};

const sizes: Record<string, string> = {
  sm: "px-2.5 py-1.5 text-xs rounded-md gap-1.5",
  md: "px-4 py-2 text-sm rounded-lg gap-2",
  lg: "px-5 py-2.5 text-base rounded-lg gap-2",
};

export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button className={cn(
      "inline-flex items-center justify-center font-medium transition-all duration-150",
      "focus:outline-hidden focus:ring-2 focus:ring-primary/30",
      "disabled:opacity-50 disabled:pointer-events-none",
      variants[variant], sizes[size], className
    )} disabled={disabled || loading} {...props}>
      {loading && <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  );
}
