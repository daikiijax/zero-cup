import { Router } from "express";
import { db, inferenceJobsTable } from "@workspace/db";
import { sql, gte } from "drizzle-orm";
import { logger } from "../lib/logger";

export const statsRouter = Router();

statsRouter.get("/", async (_req, res) => {
  try {
    const [totals] = await db
      .select({
        total: sql<number>`count(*)::int`,
        successful: sql<number>`count(*) filter (where status = 'completed')::int`,
        failed: sql<number>`count(*) filter (where status = 'failed')::int`,
        avgLatency: sql<number>`avg(latency_ms) filter (where status = 'completed')`,
        totalTokens: sql<number>`coalesce(sum(input_tokens + output_tokens) filter (where status = 'completed'), 0)::int`,
        testnetTokens: sql<number>`coalesce(sum(input_tokens + output_tokens) filter (where network = 'testnet' and status = 'completed'), 0)::int`,
        mainnetTokens: sql<number>`coalesce(sum(input_tokens + output_tokens) filter (where network = 'mainnet' and status = 'completed'), 0)::int`,
      })
      .from(inferenceJobsTable);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayStats] = await db
      .select({
        requestsToday: sql<number>`count(*)::int`,
        tokensToday: sql<number>`coalesce(sum(input_tokens + output_tokens) filter (where status = 'completed'), 0)::int`,
      })
      .from(inferenceJobsTable)
      .where(gte(inferenceJobsTable.createdAt, today));

    const [providerCount] = await db
      .select({
        activeProviders: sql<number>`count(distinct provider_address) filter (where provider_address is not null and status = 'completed')::int`,
      })
      .from(inferenceJobsTable);

    res.json({
      totalRequests: totals.total ?? 0,
      successfulRequests: totals.successful ?? 0,
      failedRequests: totals.failed ?? 0,
      avgLatencyMs: totals.avgLatency ? Math.round(Number(totals.avgLatency)) : null,
      totalTokensUsed: totals.totalTokens ?? 0,
      testnetTokensUsed: totals.testnetTokens ?? 0,
      mainnetTokensUsed: totals.mainnetTokens ?? 0,
      activeProviders: providerCount.activeProviders ?? 0,
      requestsToday: todayStats.requestsToday ?? 0,
      tokensToday: todayStats.tokensToday ?? 0,
    });
  } catch (err) {
    logger.error({ err }, "Failed to compute stats");
    res.status(500).json({ error: "Internal server error" });
  }
});
