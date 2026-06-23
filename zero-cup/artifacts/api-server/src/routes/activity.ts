import { Router } from "express";
import { db, activityLogTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { logger } from "../lib/logger";

export const activityRouter = Router();

activityRouter.get("/", async (_req, res) => {
  try {
    const entries = await db
      .select()
      .from(activityLogTable)
      .orderBy(desc(activityLogTable.timestamp))
      .limit(200);

    res.json(
      entries.map((e) => ({
        id: e.id,
        level: e.level,
        message: e.message,
        detail: e.detail ?? null,
        timestamp: e.timestamp.toISOString(),
        jobId: e.jobId ?? null,
      }))
    );
  } catch (err) {
    logger.error({ err }, "Failed to fetch activity log");
    res.status(500).json({ error: "Internal server error" });
  }
});
