import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "healthy" | "degraded" | "unhealthy" | string;
  className?: string;
  showText?: boolean;
}

export function StatusBadge({ status, className, showText = true }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();
  
  const config = {
    healthy: {
      colorClass: "bg-green-500/15 text-green-500 border-green-500/20",
      dotClass: "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]",
      label: "Healthy"
    },
    degraded: {
      colorClass: "bg-yellow-500/15 text-yellow-500 border-yellow-500/20",
      dotClass: "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]",
      label: "Degraded"
    },
    unhealthy: {
      colorClass: "bg-red-500/15 text-red-500 border-red-500/20",
      dotClass: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]",
      label: "Unhealthy"
    }
  };

  const current = config[normalizedStatus as keyof typeof config] || {
    colorClass: "bg-slate-500/15 text-slate-400 border-slate-500/20",
    dotClass: "bg-slate-500",
    label: "Unknown"
  };

  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors",
      current.colorClass,
      className
    )}>
      <span className={cn("w-2 h-2 rounded-full", current.dotClass)} />
      {showText && <span>{current.label}</span>}
    </div>
  );
}
