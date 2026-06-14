export function Skeleton({ className }: { className?: string }) {
  return <div className={`rounded-md bg-gray-200 animate-pulse ${className || ""}`} />;
}
