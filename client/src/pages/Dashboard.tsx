import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Server, Clock, ArrowRight } from "lucide-react";
import { useApps } from "@/hooks/use-apps";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function Dashboard() {
  const { data: apps, isLoading, error } = useApps();

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <div className="p-8 text-red-500">Error loading dashboard: {error.message}</div>;

  return (
    <div className="min-h-screen bg-background p-6 md:p-8 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <Tooltip>
            <TooltipTrigger asChild>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2 cursor-default inline-block">
                DownDetect
              </h1>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="flex flex-col gap-1.5 p-3 max-w-xs">
              {(import.meta as any).env?.VITE_STAFF_URL ? (
                <a
                  href={(import.meta as any).env.VITE_STAFF_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  Developed by NS Staff
                </a>
              ) : (
                <span className="font-medium">Developed by NS Staff</span>
              )}
              <span className="text-muted-foreground text-xs">v{__APP_VERSION__}</span>
            </TooltipContent>
          </Tooltip>
          <p className="text-muted-foreground text-lg">
            Real-time monitoring for all internal services.
          </p>
        </div>
      </div>

      {/* Grid of Apps */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
        {apps?.map((app) => (
          <Link key={app.id} href={`/app/${app.internalName}`} className="block group">
            <div className="bg-card border border-border rounded-xl p-6 hover:border-muted-foreground/30 transition-all duration-300 relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary border border-border">
                    <Server className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground">
                      {app.displayName}
                    </h3>
                    <p className="text-xs font-mono text-muted-foreground truncate max-w-[150px]">
                      {app.baseUrl}
                    </p>
                  </div>
                </div>
                <StatusBadge
                  status={!app.isActive ? "maintenance" : (app.lastCheck?.status || "unknown")}
                />
              </div>

              {!app.isActive ? (
                <div className="mt-6 min-h-[3.25rem] space-y-1">
                  <p className="text-sm font-semibold text-foreground leading-snug">
                    Maintenance is underway
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    The site will be available soon... maybe.
                  </p>
                </div>
              ) : (
              <div className="grid grid-cols-2 gap-4 mt-6 min-h-[3.25rem]">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Response</p>
                  <p className="text-sm font-mono text-foreground font-medium">
                    {app.lastCheck?.responseTime ? `${app.lastCheck.responseTime}ms` : "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Version</p>
                  <p className="text-sm font-mono text-foreground">
                    {app.lastCheck?.version || "v-"}
                  </p>
                </div>
              </div>
              )}

              <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  {!app.isActive
                    ? "Under maintenance"
                    : app.lastCheck?.checkedAt
                      ? formatDistanceToNow(new Date(app.lastCheck.checkedAt), { addSuffix: true })
                      : "Never checked"}
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>
        ))}

        {apps?.length === 0 && (
          <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-xl bg-card/20">
            <h3 className="text-xl font-medium text-foreground">No applications monitored</h3>
            <p className="text-muted-foreground mt-2">Use API with KEY_ACCESS to add applications.</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-8 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64 bg-secondary" />
          <Skeleton className="h-5 w-96 bg-secondary" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-56 rounded-xl bg-secondary" />)}
      </div>
      </div>
    </div>
  );
}
