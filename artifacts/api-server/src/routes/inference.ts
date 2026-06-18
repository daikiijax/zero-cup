import { Router } from "express";
import { randomUUID } from "crypto";
import { db, inferenceJobsTable, activityLogTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { SubmitInferenceBody } from "@workspace/api-zod";
import { runInference, runExternalInference, parseExternalApiKey, ConfigOverride } from "../lib/0g-compute";
import { logger } from "../lib/logger";

export const inferenceRouter = Router();

function extractZgOverride(req: { headers: Record<string, string | string[] | undefined> }): ConfigOverride {
  const h = req.headers;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  return {
    privateKey: str(h["x-zg-private-key"]),
    rpcUrl: str(h["x-zg-rpc-url"]),
    serviceUrl: str(h["x-zg-service-url"]),
  };
}

function extractLLMKey(req: { headers: Record<string, string | string[] | undefined> }): string | undefined {
  const v = req.headers["x-llm-api-key"];
  return (Array.isArray(v) ? v[0] : v) || undefined;
}

function detectNetwork(rpcUrl?: string): "mainnet" | "testnet" {
  // mainnet RPC is "https://evmrpc.0g.ai" (no "mainnet" in URL); testnet has "testnet" in URL
  if (!rpcUrl) return "testnet";
  if (rpcUrl.includes("evmrpc.0g.ai") && !rpcUrl.includes("testnet")) return "mainnet";
  return "testnet";
}

inferenceRouter.post("/", async (req, res) => {
  const parsed = SubmitInferenceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.message });
    return;
  }

  const { prompt, model, providerAddress, maxTokens, temperature } = parsed.data;
  const zgOverride = extractZgOverride(req);
  const rawLLMKey = extractLLMKey(req);
  const llmConfig = rawLLMKey ? parseExternalApiKey(rawLLMKey) : null;

  const network = llmConfig ? "external" as any : detectNetwork(zgOverride.rpcUrl);
  const id = randomUUID();

  await db.insert(inferenceJobsTable).values({
    id,
    prompt,
    model,
    providerAddress: providerAddress ?? null,
    network: llmConfig ? "testnet" : network,
    status: "pending",
  });

  const modeLabel = llmConfig
    ? `External LLM (${llmConfig.provider})`
    : "0G Network";

  await db.insert(activityLogTable).values({
    id: randomUUID(),
    level: "info",
    message: `Inference job submitted`,
    detail: `Mode: ${modeLabel} | Model: ${model} | Prompt: ${prompt.slice(0, 80)}${prompt.length > 80 ? "..." : ""}`,
    jobId: id,
  });

  res.status(202).json({
    id,
    prompt,
    model,
    providerAddress: providerAddress ?? null,
    status: "pending",
    result: null,
    errorMessage: null,
    inputTokens: null,
    outputTokens: null,
    latencyMs: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
  });

  // Run inference asynchronously after responding
  setImmediate(async () => {
    try {
      await db.update(inferenceJobsTable)
        .set({ status: "running" })
        .where(eq(inferenceJobsTable.id, id));

      await db.insert(activityLogTable).values({
        id: randomUUID(),
        level: "info",
        message: `Inference running — ${modeLabel}`,
        detail: `Job ${id} — model: ${model}`,
        jobId: id,
      });

      let result;
      if (llmConfig) {
        result = await runExternalInference({ prompt, model, maxTokens, temperature }, llmConfig);
      } else {
        result = await runInference({ prompt, model, providerAddress, maxTokens, temperature }, zgOverride);
      }

      await db.update(inferenceJobsTable).set({
        status: "completed",
        result: result.content,
        inputTokens: result.inputTokens ?? null,
        outputTokens: result.outputTokens ?? null,
        latencyMs: result.latencyMs,
        providerAddress: result.providerAddress ?? providerAddress ?? null,
        completedAt: new Date(),
      }).where(eq(inferenceJobsTable.id, id));

      await db.insert(activityLogTable).values({
        id: randomUUID(),
        level: "success",
        message: `Inference completed`,
        detail: `Job ${id} — ${result.latencyMs}ms | in:${result.inputTokens ?? "?"} out:${result.outputTokens ?? "?"} tokens`,
        jobId: id,
      });

      logger.info({ id, latencyMs: result.latencyMs }, "Inference job completed");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);

      await db.update(inferenceJobsTable).set({
        status: "failed",
        errorMessage: message,
        completedAt: new Date(),
      }).where(eq(inferenceJobsTable.id, id));

      await db.insert(activityLogTable).values({
        id: randomUUID(),
        level: "error",
        message: `Inference failed`,
        detail: message,
        jobId: id,
      });

      logger.error({ id, err }, "Inference job failed");
    }
  });
});

inferenceRouter.get("/", async (_req, res) => {
  try {
    const jobs = await db
      .select()
      .from(inferenceJobsTable)
      .orderBy(desc(inferenceJobsTable.createdAt))
      .limit(50);

    res.json(jobs.map(normalizeJob));
  } catch (err) {
    routeError(err, res);
  }
});

inferenceRouter.get("/:id", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(inferenceJobsTable)
      .where(eq(inferenceJobsTable.id, req.params.id));

    if (rows.length === 0) {
      res.status(404).json({ error: "Inference job not found" });
      return;
    }

    res.json(normalizeJob(rows[0]));
  } catch (err) {
    routeError(err, res);
  }
});

function normalizeJob(job: typeof inferenceJobsTable.$inferSelect) {
  return {
    id: job.id,
    prompt: job.prompt,
    model: job.model,
    providerAddress: job.providerAddress ?? null,
    status: job.status,
    result: job.result ?? null,
    errorMessage: job.errorMessage ?? null,
    inputTokens: job.inputTokens ?? null,
    outputTokens: job.outputTokens ?? null,
    latencyMs: job.latencyMs ?? null,
    createdAt: job.createdAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
  };
}

function routeError(err: unknown, res: any) {
  logger.error({ err }, "Route error");
  res.status(500).json({ error: "Internal server error" });
}
