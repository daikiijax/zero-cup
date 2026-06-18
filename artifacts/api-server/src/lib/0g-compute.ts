import { logger } from "./logger";

export interface ZeroGConfig {
  rpcUrl: string;
  serviceUrl: string;
  privateKey: string;
}

export interface ConfigOverride {
  privateKey?: string;
  rpcUrl?: string;
  serviceUrl?: string;
}

export interface InferenceRequest {
  prompt: string;
  model: string;
  providerAddress?: string | null;
  maxTokens?: number | null;
  temperature?: number | null;
}

export interface InferenceResult {
  content: string;
  inputTokens?: number;
  outputTokens?: number;
  providerAddress?: string;
  latencyMs: number;
}

export interface ExternalLLMConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
}

function getConfig(override?: ConfigOverride): ZeroGConfig {
  const rpcUrl =
    override?.rpcUrl || process.env["ZG_RPC_URL"] || "https://evmrpc-testnet.0g.ai";
  const serviceUrl =
    override?.serviceUrl ||
    process.env["ZG_SERVICE_URL"] ||
    "https://indexer-storage-testnet-standard.0g.ai";
  const privateKey = override?.privateKey || process.env["ZG_PRIVATE_KEY"] || "";
  return { rpcUrl, serviceUrl, privateKey };
}

function getProviderBaseUrl(provider: string): string {
  const urls: Record<string, string> = {
    openai: "https://api.openai.com/v1",
    openrouter: "https://openrouter.ai/api/v1",
    anthropic: "https://api.anthropic.com/v1",
    groq: "https://api.groq.com/openai/v1",
    mistral: "https://api.mistral.ai/v1",
    together: "https://api.together.xyz/v1",
    deepseek: "https://api.deepseek.com/v1",
    perplexity: "https://api.perplexity.ai",
    cohere: "https://api.cohere.ai/compatibility/v1",
    xai: "https://api.x.ai/v1",
    "0g": "https://api.0g.ai/v1",
  };
  return urls[provider] ?? `https://api.${provider}.ai/v1`;
}

export function parseExternalApiKey(rawKey: string): ExternalLLMConfig | null {
  const trimmed = rawKey.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^([^=]+)=(.+)$/);
  if (match) {
    const provider = match[1].toLowerCase().trim();
    const apiKey = match[2].trim();
    return { provider, apiKey, baseUrl: getProviderBaseUrl(provider) };
  }

  // Auto-detect: OpenAI keys start with sk-
  if (trimmed.startsWith("sk-") && trimmed.length > 20) {
    return { provider: "openai", apiKey: trimmed, baseUrl: "https://api.openai.com/v1" };
  }

  return null;
}

export async function runExternalInference(
  req: InferenceRequest,
  llmConfig: ExternalLLMConfig
): Promise<InferenceResult> {
  const startTime = Date.now();
  const sanitizedPrompt = req.prompt.trim().slice(0, 8000);
  if (!sanitizedPrompt) throw new Error("Prompt cannot be empty.");

  logger.info(
    { provider: llmConfig.provider, model: req.model },
    "Starting external LLM inference"
  );

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${llmConfig.apiKey}`,
  };

  if (llmConfig.provider === "openrouter") {
    headers["HTTP-Referer"] = "https://0g-compute.replit.app";
    headers["X-Title"] = "0G Compute Dashboard";
  }

  try {
    const response = await fetch(`${llmConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: req.model,
        messages: [{ role: "user", content: sanitizedPrompt }],
        temperature: req.temperature ?? 0.7,
        max_tokens: req.maxTokens ?? 1024,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(
        `${llmConfig.provider} API returned ${response.status}: ${errText}`
      );
    }

    const completion: any = await response.json();
    const content =
      completion?.choices?.[0]?.message?.content ?? JSON.stringify(completion);
    const inputTokens: number | undefined = completion?.usage?.prompt_tokens;
    const outputTokens: number | undefined = completion?.usage?.completion_tokens;
    const latencyMs = Date.now() - startTime;

    logger.info(
      { provider: llmConfig.provider, latencyMs, inputTokens, outputTokens },
      "External LLM inference completed"
    );

    return { content, inputTokens, outputTokens, latencyMs };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, latencyMs }, "External LLM inference failed");
    throw new Error(`External inference failed: ${message}`);
  }
}

/**
 * Ensures the user has a funded ledger AND a sub-account for the given provider.
 * Called automatically before each inference request.
 *
 * Flow:
 *  1. Get or create the on-chain ledger (0.1 0G initial deposit if missing).
 *  2. Check if the provider sub-account already has funds.
 *  3. If not, transfer 0.05 0G from the ledger to the provider sub-account.
 */
async function ensureSubAccount(broker: any, providerAddress: string): Promise<void> {
  const INITIAL_LEDGER_BALANCE = 3; // 0G tokens (minimum required by network)
  const PROVIDER_FUND_NEURON = BigInt("50000000000000000"); // 0.05 0G in neuron

  // Step 1: Get or create ledger
  try {
    await broker.ledger.getLedger();
    logger.info("Existing ledger found");
  } catch {
    logger.info("No ledger found — creating with initial deposit of 0.1 0G");
    await broker.ledger.addLedger(INITIAL_LEDGER_BALANCE);
    logger.info("Ledger created");
  }

  // Step 2: Check if provider already has a funded sub-account
  try {
    const providers: [string, bigint, bigint][] =
      await broker.ledger.getProvidersWithBalance("inference");
    const existing = providers.find(
      ([addr]) => addr.toLowerCase() === providerAddress.toLowerCase()
    );
    if (existing && existing[1] > BigInt(0)) {
      logger.info(
        { provider: providerAddress, balance: existing[1].toString() },
        "Provider sub-account already funded — skipping transfer"
      );
      return;
    }
  } catch (err) {
    logger.warn({ err }, "Could not check provider balances, will attempt transfer");
  }

  // Step 3: Transfer funds to provider sub-account
  logger.info(
    { provider: providerAddress, amount: PROVIDER_FUND_NEURON.toString() },
    "Funding provider sub-account (0.05 0G)"
  );
  await broker.ledger.transferFund(providerAddress, "inference", PROVIDER_FUND_NEURON);
  logger.info({ provider: providerAddress }, "Provider sub-account funded");
}

export async function runInference(
  req: InferenceRequest,
  override?: ConfigOverride
): Promise<InferenceResult> {
  const config = getConfig(override);
  const startTime = Date.now();

  if (!config.privateKey) {
    throw new Error(
      "ZG_PRIVATE_KEY is not configured. Set it in your environment variables or the Settings page."
    );
  }

  const sanitizedPrompt = req.prompt.trim().slice(0, 8000);
  if (!sanitizedPrompt) {
    throw new Error("Prompt cannot be empty after sanitization.");
  }

  logger.info({ model: req.model, promptLength: sanitizedPrompt.length }, "Starting 0G inference");

  try {
    const { createZGComputeNetworkBroker } = await import(
      "@0gfoundation/0g-compute-ts-sdk"
    );
    const { ethers } = await import("ethers");

    const wallet = new ethers.Wallet(
      config.privateKey,
      new ethers.JsonRpcProvider(config.rpcUrl)
    );

    const broker = await createZGComputeNetworkBroker(wallet);

    // Find provider for the requested model
    let targetProvider: string | undefined = req.providerAddress ?? undefined;

    if (!targetProvider) {
      const services = await broker.inference.listService();
      const matching = services.filter(
        (s: any) =>
          s.model?.toLowerCase() === req.model?.toLowerCase() ||
          s.serviceType?.toLowerCase() === req.model?.toLowerCase()
      );
      if (matching.length === 0 && services.length > 0) {
        targetProvider = (services[0] as any).provider as string;
        logger.warn(
          { requestedModel: req.model, usingProvider: targetProvider },
          "No exact model match found, using first available provider"
        );
      } else if (matching.length === 0) {
        throw new Error(
          `No active provider found for model "${req.model}" on the 0G network.`
        );
      } else {
        targetProvider = (matching[0] as any).provider as string;
      }
    }

    // Ensure ledger + provider sub-account are funded before requesting headers
    await ensureSubAccount(broker, targetProvider);

    // Get service metadata (endpoint + model name)
    const { endpoint, model: providerModel } =
      await broker.inference.getServiceMetadata(targetProvider);

    // Generate billing headers
    const headers = await broker.inference.getRequestHeaders(
      targetProvider,
      sanitizedPrompt
    );

    // Call the provider's OpenAI-compatible API
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({
        model: providerModel || req.model,
        messages: [{ role: "user", content: sanitizedPrompt }],
        temperature: req.temperature ?? 0.7,
        max_tokens: Math.min(req.maxTokens ?? 1024, 2000),
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Provider returned ${response.status}: ${errText}`);
    }

    const completion: any = await response.json();

    const content =
      completion?.choices?.[0]?.message?.content ??
      completion?.result ??
      JSON.stringify(completion);

    const inputTokens: number | undefined =
      completion?.usage?.prompt_tokens ?? undefined;
    const outputTokens: number | undefined =
      completion?.usage?.completion_tokens ?? undefined;

    // Process response to cache fee estimates
    const chatId = response.headers.get("ZG-Res-Key") || completion?.id;
    const usageContent = completion?.usage
      ? JSON.stringify(completion.usage)
      : undefined;
    await broker.inference
      .processResponse(targetProvider, chatId ?? undefined, usageContent)
      .catch((err: unknown) => {
        logger.warn({ err }, "processResponse failed (non-fatal)");
      });

    const latencyMs = Date.now() - startTime;
    logger.info({ latencyMs, inputTokens, outputTokens }, "0G inference completed");

    return {
      content,
      inputTokens,
      outputTokens,
      providerAddress: targetProvider,
      latencyMs,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, latencyMs }, "0G inference failed");
    throw new Error(`Inference failed: ${message}`);
  }
}

export async function listNetworkProviders(
  override?: ConfigOverride
): Promise<
  Array<{
    address: string;
    name: string;
    models: string[];
    status: "online" | "offline" | "unknown";
    latencyMs: number | null;
    pricePerToken: number | null;
  }>
> {
  const config = getConfig(override);

  try {
    const { createZGComputeNetworkReadOnlyBroker } = await import(
      "@0gfoundation/0g-compute-ts-sdk"
    );

    const broker = await createZGComputeNetworkReadOnlyBroker(config.rpcUrl);

    let services: any[];
    try {
      const detailed = await broker.inference.listServiceWithDetail();
      services = detailed;

      const grouped: Map<string, any[]> = new Map();
      for (const svc of services) {
        const addr: string = svc.provider ?? "unknown";
        if (!grouped.has(addr)) grouped.set(addr, []);
        grouped.get(addr)!.push(svc);
      }

      return Array.from(grouped.entries()).map(([address, svcs]) => {
        const first = svcs[0];
        const health = first?.healthMetrics;
        let status: "online" | "offline" | "unknown" = "unknown";
        if (health?.status === "healthy") status = "online";
        else if (health?.status === "critical") status = "offline";
        else if (health?.status === "warning") status = "online";

        return {
          address,
          name: first?.model ? `${first.model} Provider` : address.slice(0, 10) + "...",
          models: svcs.map((s: any) => s.model ?? s.serviceType ?? "unknown").filter(Boolean),
          status,
          latencyMs: health?.performance?.response_time?.avg ?? null,
          pricePerToken: first?.inputPrice
            ? Number(first.inputPrice) / 1e18
            : null,
        };
      });
    } catch {
      // Fallback to basic listService
      services = await broker.inference.listService();

      const grouped: Map<string, any[]> = new Map();
      for (const svc of services) {
        const addr: string = svc.provider ?? "unknown";
        if (!grouped.has(addr)) grouped.set(addr, []);
        grouped.get(addr)!.push(svc);
      }

      return Array.from(grouped.entries()).map(([address, svcs]) => ({
        address,
        name: svcs[0]?.model
          ? `${svcs[0].model} Provider`
          : address.slice(0, 10) + "...",
        models: svcs
          .map((s: any) => s.model ?? s.serviceType ?? "unknown")
          .filter(Boolean),
        status: "online" as const,
        latencyMs: null,
        pricePerToken: svcs[0]?.inputPrice ? Number(svcs[0].inputPrice) / 1e18 : null,
      }));
    }
  } catch (err) {
    logger.error({ err }, "Failed to fetch 0G providers");
    return [];
  }
}
