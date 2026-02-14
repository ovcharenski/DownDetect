import { useParams, Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { ArrowLeft, ExternalLink, Globe } from "lucide-react";
import { useApp, useAppStatus, useAppStats, useAppStatusRecent } from "@/hooks/use-apps";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";

const HOURS_24 = 24;
const RECENT_LIMIT = 20;

export default function AppDetails() {
  const params = useParams<{ internal_name: string }>();
  const internalName = params.internal_name || "";
  const isMobile = useIsMobile();

  const { data: app, isLoading: isAppLoading } = useApp(internalName);
  const { data: statusHistory } = useAppStatus(internalName, HOURS_24);
  const { data: statusRecent } = useAppStatusRecent(internalName, RECENT_LIMIT);
  const { data: stats } = useAppStats(internalName, HOURS_24);

  if (isAppLoading) return <div className="p-12 text-center text-muted-foreground">Loading app details...</div>;
  if (!app) return <div className="p-12 text-center text-red-500">App not found</div>;

  // Latest status for header badge (from last 20 checks)
  const latestStatus = statusRecent && statusRecent.length > 0
    ? statusRecent[0].status
    : "unknown";

  // Charts: last 24 hours
  const chartData = statusHistory?.slice().reverse().map(check => ({
    time: format(new Date(check.checkedAt), "HH:mm"),
    latency: check.responseTime || 0,
    status: check.status === "healthy" ? 1 : check.status === "degraded" ? 0.5 : 0,
  })) || [];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Top Navigation Bar */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 rounded-full hover:bg-white/5 transition-colors text-muted-foreground hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-bold">
                {app.displayName}
              </h1>
              {!isMobile && (
                <div className="mt-1">
                  <StatusBadge status={latestStatus} showText={true} />
                </div>
              )}
            </div>
          </div>

          {isMobile && (
            <StatusBadge
              status={latestStatus}
              showText={true}
              className="w-full justify-center"
            />
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current URL</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-lg font-mono text-white truncate">
                <Globe className="w-4 h-4 text-primary" />
                <a href={app.baseUrl} target="_blank" rel="noreferrer" className="hover:underline hover:text-primary transition-colors">
                  {app.baseUrl}
                </a>
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Uptime (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats?.uptimePercentage.toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Availability</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Latency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {Math.round(stats?.avgResponseTime || 0)}ms
              </div>
              <p className="text-xs text-muted-foreground mt-1">Response Time</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Chart Area */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="bg-card border-white/5">
              <CardHeader>
                <CardTitle>Response Time History</CardTitle>
                <CardDescription>Last 24 hours — latency over recent checks (ms)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis
                        dataKey="time"
                        stroke="#64748b"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={30}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => `${v}ms`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#020617",
                          borderColor: "rgba(148,163,184,0.3)",
                          color: "#e2e8f0"
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="latency"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-white/5">
              <CardHeader>
                <CardTitle>Availability Timeline</CardTitle>
                <CardDescription>Status checks over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[150px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorStatus" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis hide />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#020617",
                          borderColor: "rgba(148,163,184,0.3)",
                          color: "#e2e8f0"
                        }}
                        formatter={(val: number) => val === 1 ? "Healthy" : val === 0.5 ? "Degraded" : "Unhealthy"}
                      />
                      <Area
                        type="step"
                        dataKey="status"
                        stroke="#22c55e"
                        fillOpacity={1}
                        fill="url(#colorStatus)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Recent Checks List */}
          <Card className="bg-card border-white/5 lg:h-full">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Last 20 checks</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="pl-6">Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Latency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statusRecent?.map((check) => (
                    <TableRow key={check.id} className="border-white/5 hover:bg-white/5">
                      <TableCell className="pl-6 font-mono text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(check.checkedAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={check.status} showText={false} />
                      </TableCell>
                      <TableCell className="text-right pr-6 font-mono text-xs">
                        {check.responseTime ? `${check.responseTime}ms` : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!statusRecent || statusRecent.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No checks recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
