import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const inferenceStatusEnum = pgEnum("inference_status", [
  "pending",
  "running",
  "completed",
  "failed",
]);

export const networkEnum = pgEnum("network_type", ["testnet", "mainnet"]);

export const activityLevelEnum = pgEnum("activity_level", [
  "info",
  "success",
  "warn",
  "error",
]);

export const inferenceJobsTable = pgTable("inference_jobs", {
  id: text("id").primaryKey(),
  prompt: text("prompt").notNull(),
  model: text("model").notNull(),
  providerAddress: text("provider_address"),
  network: networkEnum("network").notNull().default("testnet"),
  status: inferenceStatusEnum("status").notNull().default("pending"),
  result: text("result"),
  errorMessage: text("error_message"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const activityLogTable = pgTable("activity_log", {
  id: text("id").primaryKey(),
  level: activityLevelEnum("level").notNull().default("info"),
  message: text("message").notNull(),
  detail: text("detail"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  jobId: text("job_id"),
});

export type InferenceJob = typeof inferenceJobsTable.$inferSelect;
export type InsertInferenceJob = typeof inferenceJobsTable.$inferInsert;
export type ActivityEntry = typeof activityLogTable.$inferSelect;
export type InsertActivityEntry = typeof activityLogTable.$inferInsert;
