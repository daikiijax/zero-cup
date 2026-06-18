import { Router } from "express";
import { listNetworkProviders } from "../lib/0g-compute";
import { logger } from "../lib/logger";

export const providersRouter = Router();

const FALLBACK_PROVIDERS = [
  {
    address: "0x0000000000000000000000000000000000000001",
    name: "0G Testnet Provider Alpha",
    models: ["llama-3.1-70b", "llama-3.1-8b", "mistral-7b"],
    status: "online" as const,
    latencyMs: 320,
    pricePerToken: 0.000001,
  },
  {
    address: "0x0000000000000000000000000000000000000002",
    name: "0G Testnet Provider Beta",
    models: ["llama-3.1-70b", "qwen2-72b"],
    status: "online" as const,
    latencyMs: 450,
    pricePerToken: 0.0000008,
  },
  {
    address: "0x0000000000000000000000000000000000000003",
    name: "0G Testnet Provider Gamma",
    models: ["mistral-7b", "phi-3-mini"],
    status: "unknown" as const,
    latencyMs: null,
    pricePerToken: null,
  },
];

function extractZgOverride(req: { headers: Record<string, string | string[] | undefined> }) {
  const h = req.headers;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  return { privateKey: str(h["x-zg-private-key"]), rpcUrl: str(h["x-zg-rpc-url"]), serviceUrl: str(h["x-zg-service-url"]) };
}

providersRouter.get("/", async (req, res) => {
  const zgOverride = extractZgOverride(req);
  try {
    const providers = await listNetworkProviders(zgOverride);

    if (providers.length > 0) {
      res.json(providers);
    } else {
      res.json(FALLBACK_PROVIDERS);
    }
  } catch (err) {
    logger.error({ err }, "Failed to list providers");
    res.json(FALLBACK_PROVIDERS);
  }
});
