import { useGetDashboardStats, useListInferenceJobs, useListProviders } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Activity, Clock, Cpu, Server } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

export function Home() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: jobs, isLoading: jobsLoading } = useListInferenceJobs();
  const { data: providers, isLoading: providersLoading } = useListProviders();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 sm:p-8 space-y-6 sm:space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-mono font-bold tracking-tight text-foreground">DASHBOARD</h1>
          <p className="text-muted-foreground mt-1">0G Compute Network Overview</p>
        </div>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <motion.div variants={item}>
          <Card className="p-6 bg-card border-border glow-card">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <h3 className="text-3xl font-bold mt-2">{statsLoading ? "-" : stats?.totalRequests.toLocaleString()}</h3>
              </div>
              <div className="p-2 bg-primary/10 rounded-md border border-primary/20">
                <Activity className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs">
              <span className="text-green-500 font-medium">+{statsLoading ? "-" : stats?.requestsToday}</span>
              <span className="text-muted-foreground ml-2">today</span>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="p-6 bg-card border-border glow-card">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Latency</p>
                <h3 className="text-3xl font-bold mt-2">{statsLoading ? "-" : stats?.avgLatencyMs?.toFixed(0)}<span className="text-lg text-muted-foreground ml-1">ms</span></h3>
              </div>
              <div className="p-2 bg-secondary/10 rounded-md border border-secondary/20">
                <Clock className="w-5 h-5 text-secondary" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs">
              <span className="text-muted-foreground">Global network average</span>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="p-6 bg-card border-border glow-card">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tokens Processed</p>
                <h3 className="text-3xl font-bold mt-2">{statsLoading ? "-" : (stats?.totalTokensUsed ?? 0) > 1000000 ? `${((stats?.totalTokensUsed ?? 0) / 1000000).toFixed(1)}M` : stats?.totalTokensUsed.toLocaleString()}</h3>
              </div>
              <div className="p-2 bg-primary/10 rounded-md border border-primary/20">
                <Cpu className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs">
              <span className="text-primary font-medium">+{statsLoading ? "-" : stats?.tokensToday.toLocaleString()}</span>
              <span className="text-muted-foreground ml-2">today</span>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="p-6 bg-card border-border glow-card">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Providers</p>
                <h3 className="text-3xl font-bold mt-2">{statsLoading ? "-" : stats?.activeProviders}</h3>
              </div>
              <div className="p-2 bg-secondary/10 rounded-md border border-secondary/20">
                <Server className="w-5 h-5 text-secondary" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs">
              <span className="text-green-500 font-medium">100%</span>
              <span className="text-muted-foreground ml-2">uptime</span>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 bg-card border-border overflow-hidden glow-card">
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
                ) : jobs?.slice(0, 5).map((job) => (
                  <tr key={job.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-muted-foreground">{job.id.substring(0, 8)}</td>
                    <td className="px-4 py-3">{job.model}</td>
                    <td className="px-4 py-3">
                      {job.status === "completed" && <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 text-green-500 border border-green-500/20 text-xs font-mono"><div className="w-1.5 h-1.5 rounded-full bg-green-500"/>COMPLETED</span>}
                      {job.status === "running" && <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs font-mono"><div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"/>RUNNING</span>}
                      {job.status === "pending" && <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-muted-foreground border border-border text-xs font-mono"><div className="w-1.5 h-1.5 rounded-full bg-muted-foreground"/>PENDING</span>}
                      {job.status === "failed" && <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-mono"><div className="w-1.5 h-1.5 rounded-full bg-red-500"/>FAILED</span>}
                    </td>
                    <td className="px-4 py-3 font-mono">{job.latencyMs ? `${job.latencyMs}ms` : "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{format(new Date(job.createdAt), 'HH:mm:ss')}</td>
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
            ) : providers?.slice(0, 5).map((provider) => (
              <div key={provider.address} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/10">
                <div>
                  <p className="font-medium text-sm">{provider.name}</p>
                  <p className="text-xs font-mono text-muted-foreground mt-1">{provider.address.substring(0, 12)}...</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-xs font-mono">
                      {provider.status === "online" ? "ONLINE" : "OFFLINE"}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${provider.status === "online" ? "bg-green-500" : "bg-red-500"}`} />
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
