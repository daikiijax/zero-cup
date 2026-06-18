import { Router } from "express";
import { db, inferenceJobsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

export const walletRouter = Router();

function extractZgConfig(req: { headers: Record<string, string | string[] | undefined> }) {
  const h = req.headers;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  return {
    privateKey: str(h["x-zg-private-key"]),
    rpcUrl: str(h["x-zg-rpc-url"]) || process.env["ZG_RPC_URL"] || "https://evmrpc-testnet.0g.ai",
  };
}

function detectNetwork(rpcUrl: string): "mainnet" | "testnet" {
  return rpcUrl.includes("mainnet") ? "mainnet" : "testnet";
}

walletRouter.get("/info", async (req, res) => {
  const { privateKey, rpcUrl } = extractZgConfig(req);

  if (!privateKey) {
    res.status(400).json({ error: "Private key not configured. Set it in the Settings page." });
    return;
  }

  try {
    const { ethers } = await import("ethers");

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    const [balanceWei, network] = await Promise.all([
      provider.getBalance(wallet.address),
      provider.getNetwork(),
    ]);

    const balanceEther = parseFloat(ethers.formatEther(balanceWei));
    const networkName = detectNetwork(rpcUrl);

    // Per-network token usage from DB
    const [tokenStats] = await db
      .select({
        testnetTokens: sql<number>`coalesce(sum(input_tokens + output_tokens) filter (where network = 'testnet' and status = 'completed'), 0)::int`,
        mainnetTokens: sql<number>`coalesce(sum(input_tokens + output_tokens) filter (where network = 'mainnet' and status = 'completed'), 0)::int`,
      })
      .from(inferenceJobsTable);

    res.json({
      address: wallet.address,
      balanceEther,
      network: networkName,
      chainId: network.chainId.toString(),
      testnetTokensUsed: tokenStats.testnetTokens ?? 0,
      mainnetTokensUsed: tokenStats.mainnetTokens ?? 0,
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch wallet info");
    res.status(500).json({ error: "Failed to fetch wallet info from RPC" });
  }
});
