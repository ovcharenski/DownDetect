import { cn } from "@/lib/utils";

type MaintenanceMessageProps = {
  className?: string;
  compact?: boolean;
};

export function MaintenanceMessage({ className, compact = false }: MaintenanceMessageProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4" : "py-16 md:py-24 px-6 min-h-[320px] md:min-h-[420px]",
        className,
      )}
    >
      <h2
        className={cn(
          "font-bold tracking-tight text-foreground",
          compact ? "text-xl sm:text-2xl" : "text-3xl sm:text-4xl md:text-5xl",
        )}
      >
        Maintenance is underway
      </h2>
      <p
        className={cn(
          "text-muted-foreground mt-3 md:mt-4 max-w-xl",
          compact ? "text-sm sm:text-base" : "text-lg sm:text-xl md:text-2xl",
        )}
      >
        The site will be available soon... maybe.
      </p>
    </div>
  );
}
