import { useState } from "react";
import { useListActivity } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { getListActivityQueryKey } from "@workspace/api-client-react";

const LEVEL_STYLES: Record<string, { badge: string; text: string; prefix: string }> = {
  info:    { badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",    text: "text-blue-400",    prefix: "[INFO]   " },
  success: { badge: "bg-green-500/10 text-green-400 border-green-500/20", text: "text-green-400",   prefix: "[OK]     " },
  warn:    { badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", text: "text-yellow-400", prefix: "[WARN]   " },
  error:   { badge: "bg-red-500/10 text-red-400 border-red-500/20",       text: "text-red-400",     prefix: "[ERROR]  " },
};

export function Activity() {
  const queryClient = useQueryClient();
  const { data: entries, isLoading, refetch } = useListActivity();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: getListActivityQueryKey() });
      await refetch();
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 sm:p-8 space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-mono font-bold tracking-tight text-foreground">ACTIVITY LOGS</h1>
          <p className="text-muted-foreground mt-1">Real-time event stream from the 0G network</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing || isLoading}
          data-testid="button-refresh-logs"
          className="font-mono text-xs gap-2"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "REFRESHING..." : "REFRESH"}
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {(["info", "success", "warn", "error"] as const).map((level) => {
          const count = entries?.filter((e) => e.level === level).length ?? 0;
          const style = LEVEL_STYLES[level];
          return (
            <Card key={level} className="p-4 bg-card border-border glow-card">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono px-2 py-0.5 rounded border ${style.badge}`}>
                  {level.toUpperCase()}
                </span>
                <span className="text-2xl font-mono font-bold">{count}</span>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="bg-card border-border glow-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-mono text-xs text-muted-foreground">LIVE STREAM</span>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {entries?.length ?? 0} entries
          </span>
        </div>

        <ScrollArea className="h-[calc(100vh-380px)] min-h-[300px]">
          <div className="p-4 font-mono text-xs space-y-0.5 terminal-scroll">
            {isLoading ? (
              <div className="text-muted-foreground py-4 text-center">Loading logs...</div>
            ) : entries?.length === 0 ? (
              <div className="text-muted-foreground py-4 text-center">
                No activity yet. Submit an inference request to see logs.
              </div>
            ) : (
              entries?.map((entry) => {
                const style = LEVEL_STYLES[entry.level] ?? LEVEL_STYLES.info;
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    data-testid={`log-entry-${entry.id}`}
                    className="flex gap-3 py-1 hover:bg-muted/20 px-2 rounded-sm group"
                  >
                    <span className="text-muted-foreground/60 shrink-0 w-[85px]">
                      {format(new Date(entry.timestamp), "HH:mm:ss.SSS")}
                    </span>
                    <span className={`shrink-0 w-[72px] ${style.text}`}>{style.prefix}</span>
                    <span className="text-foreground flex-1">
                      {entry.message}
                      {entry.detail && (
                        <span className="text-muted-foreground ml-2">{entry.detail}</span>
                      )}
                    </span>
                    {entry.jobId && (
                      <span className="text-muted-foreground/40 text-[10px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {entry.jobId.slice(0, 8)}
                      </span>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </Card>
    </motion.div>
  );
}
