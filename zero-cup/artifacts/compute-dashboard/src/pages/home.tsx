import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetDashboardStats, useListInferenceJobs, useListProviders } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Activity, Clock, Cpu, Server, RefreshCw, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { format, subHours, startOfHour } from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

export function Home() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: jobs, isLoading: jobsLoading } = useListInferenceJobs();
  const { data: providers, isLoading: providersLoading } = useListProviders();

  async function handleRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setRefreshing(false), 600);
  }

  // ── Chart: requests per hour (last 12h) ─────────────────────
  const hourlyData = useMemo(() => {
    const now = new Date();
    const buckets: Record<string, { time: string; requests: number; success: number }> = {};
    for (let h = 11; h >= 0; h--) {
      const t = startOfHour(subHours(now, h));
      const key = t.toISOString();
      buckets[key] = { time: format(t, "HH:mm"), requests: 0, success: 0 };
    }
    (jobs ?? []).forEach((job) => {
      const t = startOfHour(new Date(job.createdAt));
      const key = t.toISOString();
      if (buckets[key]) {
        buckets[key].requests++;
        if (job.status === "completed") buckets[key].success++;
      }
    });
    return Object.values(buckets);
  }, [jobs]);

  // ── Chart: model usage distribution ─────────────────────────
  const modelData = useMemo(() => {
    const counts: Record<string, number> = {};
    (jobs ?? []).forEach((job) => {
      const short = job.model.length > 18 ? job.model.slice(0, 18) + "…" : job.model;
      counts[short] = (counts[short] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  }, [jobs]);

  const PIE_COLORS = ["hsl(185,90%,50%)", "hsl(270,50%,60%)", "hsl(142,70%,50%)", "hsl(38,90%,60%)", "hsl(0,70%,60%)", "hsl(200,70%,55%)"];

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-mono font-bold tracking-tight text-foreground">DASHBOARD</h1>
          <p className="text-muted-foreground mt-1">0G Compute Network Overview</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || statsLoading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/40 transition-all font-mono text-xs disabled:opacity-50"
          title="Refresh all data"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          REFRESH
        </button>
      </div>

      {/* Stats cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6"
      >
        {[
          {
            label: "Total Requests",
            value: statsLoading ? "-" : stats?.totalRequests.toLocaleString(),
            sub: `+${statsLoading ? "-" : stats?.requestsToday} today`,
            subColor: "text-green-500",
            icon: Activity,
            iconBg: "bg-primary/10 border-primary/20",
            iconColor: "text-primary",
          },
          {
            label: "Avg Latency",
            value: statsLoading ? "-" : (stats?.avgLatencyMs?.toFixed(0) ?? "—"),
            unit: "ms",
            sub: "Network average",
            subColor: "text-muted-foreground",
            icon: Clock,
            iconBg: "bg-secondary/10 border-secondary/20",
            iconColor: "text-secondary",
          },
          {
            label: "Tokens",
            value: statsLoading ? "-" : (stats?.totalTokensUsed ?? 0) > 1000000 ? `${((stats?.totalTokensUsed ?? 0) / 1000000).toFixed(1)}M` : (stats?.totalTokensUsed ?? 0).toLocaleString(),
            sub: `+${statsLoading ? "-" : stats?.tokensToday.toLocaleString()} today`,
            subColor: "text-primary",
            icon: Cpu,
            iconBg: "bg-primary/10 border-primary/20",
            iconColor: "text-primary",
          },
          {
            label: "Providers",
            value: statsLoading ? "-" : stats?.activeProviders,
            sub: "100% uptime",
            subColor: "text-green-500",
            icon: Server,
            iconBg: "bg-secondary/10 border-secondary/20",
            iconColor: "text-secondary",
          },
        ].map(({ label, value, unit, sub, subColor, icon: Icon, iconBg, iconColor }) => (
          <motion.div key={label} variants={item}>
            <Card className="p-3 sm:p-6 bg-card border-border glow-card">
              <div className="flex justify-between items-start gap-1">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{label}</p>
                  <h3 className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2 tabular-nums">
                    {value}{unit && <span className="text-sm sm:text-lg text-muted-foreground ml-0.5">{unit}</span>}
                  </h3>
                </div>
                <div className={`p-1.5 sm:p-2 rounded-md border ${iconBg} shrink-0`}>
                  <Icon className={`w-3.5 h-3.5 sm:w-5 sm:h-5 ${iconColor}`} />
                </div>
              </div>
              <div className="mt-2 sm:mt-4 text-[11px] sm:text-xs">
                <span className={`font-medium ${subColor}`}>{sub}</span>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Hourly requests chart */}
        <Card className="lg:col-span-2 p-4 sm:p-6 bg-card border-border glow-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-mono font-bold text-sm text-muted-foreground">REQUESTS (LAST 12H)</h2>
            </div>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          {jobsLoading ? (
            <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={hourlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(185,90%,50%)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(185,90%,50%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142,70%,50%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(142,70%,50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,33%,17%)" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fontFamily: "monospace", fill: "hsl(215,20%,65%)" }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fontSize: 10, fontFamily: "monospace", fill: "hsl(215,20%,65%)" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(225,17%,8%)", border: "1px solid hsl(217,33%,17%)", borderRadius: "6px", fontFamily: "monospace", fontSize: "12px" }}
                  labelStyle={{ color: "hsl(210,40%,98%)" }}
                  itemStyle={{ color: "hsl(215,20%,65%)" }}
                />
                <Area type="monotone" dataKey="requests" name="Total" stroke="hsl(185,90%,50%)" strokeWidth={2} fill="url(#colorReq)" dot={false} />
                <Area type="monotone" dataKey="success" name="Success" stroke="hsl(142,70%,50%)" strokeWidth={1.5} fill="url(#colorSuccess)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-primary rounded" />
              <span className="text-[11px] font-mono text-muted-foreground">Total</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-green-500 rounded" />
              <span className="text-[11px] font-mono text-muted-foreground">Success</span>
            </div>
          </div>
        </Card>

        {/* Model usage pie */}
        <Card className="p-6 bg-card border-border glow-card">
          <h2 className="font-mono font-bold text-sm text-muted-foreground mb-4">MODEL USAGE</h2>
          {jobsLoading || modelData.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-muted-foreground text-xs font-mono">
              {jobsLoading ? "Loading..." : "No data yet"}
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={modelData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {modelData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(225,17%,8%)", border: "1px solid hsl(217,33%,17%)", borderRadius: "6px", fontFamily: "monospace", fontSize: "11px" }}
                    itemStyle={{ color: "hsl(210,40%,98%)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {modelData.slice(0, 4).map((d, idx) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                    <span className="text-[10px] font-mono text-muted-foreground truncate flex-1">{d.name}</span>
                    <span className="text-[10px] font-mono text-foreground/70">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Recent jobs + providers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-2 p-4 sm:p-6 bg-card border-border overflow-hidden glow-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-mono font-bold text-lg">RECENT JOBS</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-mono">ID</th>
                  <th className="px-4 py-3 font-mono">MODEL</th>
                  <th className="px-4 py-3 font-mono">STATUS</th>
                  <th className="px-4 py-3 font-mono">LATENCY</th>
                  <th className="px-4 py-3 font-mono">TIME</th>
                </tr>
              </thead>
              <tbody>
                {jobsLoading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading jobs...</td></tr>
                ) : jobs?.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground font-mono text-sm">No jobs yet. Submit your first inference!</td></tr>
                ) : jobs?.slice(0, 5).map((job) => (
                  <tr key={job.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-muted-foreground">{job.id.substring(0, 8)}</td>
                    <td className="px-4 py-3 font-mono text-xs max-w-[120px] truncate">{job.model}</td>
                    <td className="px-4 py-3">
                      {job.status === "completed" && <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 text-green-500 border border-green-500/20 text-xs font-mono"><div className="w-1.5 h-1.5 rounded-full bg-green-500" />DONE</span>}
                      {job.status === "running" && <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs font-mono"><div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />RUN</span>}
                      {job.status === "pending" && <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-muted-foreground border border-border text-xs font-mono"><div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />WAIT</span>}
                      {job.status === "failed" && <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-mono"><div className="w-1.5 h-1.5 rounded-full bg-red-500" />FAIL</span>}
                    </td>
                    <td className="px-4 py-3 font-mono">{job.latencyMs ? `${job.latencyMs}ms` : "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{format(new Date(job.createdAt), "HH:mm:ss")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border glow-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-mono font-bold text-lg">NETWORK PROVIDERS</h2>
          </div>
          <div className="space-y-4">
            {providersLoading ? (
              <div className="text-sm text-center text-muted-foreground py-4">Loading providers...</div>
            ) : providers?.length === 0 ? (
              <div className="text-sm text-center text-muted-foreground py-4 font-mono">No providers found</div>
            ) : providers?.slice(0, 5).map((provider) => (
              <div key={provider.address} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/10">
                <div>
                  <p className="font-medium text-sm">{provider.name}</p>
                  <p className="text-xs font-mono text-muted-foreground mt-1">{provider.address.substring(0, 12)}...</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-xs font-mono">{provider.status === "online" ? "ONLINE" : "OFFLINE"}</span>
                    <div className={`w-2 h-2 rounded-full ${provider.status === "online" ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                  </div>
                  {provider.latencyMs && (
                    <p className="text-xs font-mono text-muted-foreground mt-1">{provider.latencyMs}ms</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
