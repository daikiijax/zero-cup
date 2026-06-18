import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Save, Eye, EyeOff, AlertTriangle, CheckCircle2, Link,
  RefreshCw, Wallet, Zap, Globe, Key, X, Bot,
} from "lucide-react";
import { useGetWalletInfo } from "@workspace/api-client-react";

const STORAGE_KEYS = {
  RPC_URL: "ZG_RPC_URL",
  SERVICE_URL: "ZG_SERVICE_URL",
  PRIVATE_KEY: "ZG_PRIVATE_KEY",
  LLM_API_KEY: "LLM_API_KEY",
} as const;

const NETWORKS = {
  testnet: {
    label: "TESTNET",
    name: "0G Galileo Testnet",
    rpcUrl: "https://evmrpc-testnet.0g.ai",
    serviceUrl: "https://indexer-storage-testnet-standard.0g.ai",
    color: "text-yellow-400",
    dot: "bg-yellow-400",
  },
  mainnet: {
    label: "MAINNET",
    name: "0G Newton Mainnet",
    rpcUrl: "https://evmrpc.0g.ai",
    serviceUrl: "https://indexer-storage-mainnet-standard.0g.ai",
    color: "text-green-400",
    dot: "bg-green-400",
  },
} as const;

const LLM_PROVIDERS: Record<string, { label: string; color: string; models: string[]; hint: string }> = {
  "0g": {
    label: "0G Private Computer",
    color: "text-primary",
    models: [
      "ogm-1.0-35b-a3b",
      "glm-s1",
      "deepseek-v4-flash",
      "deepseek-v4-pro",
      "glm-s",
      "glm-s-2",
      "kimi-k2.7-code",
      "minimax-m5",
      "minimax-m3",
      "qwen3.6-plus",
      "qwen3.7-max",
      "qwen3.7-plus",
      "deepseek-v3",
      "qwen3-vl-30b-a3b-instruct",
    ],
    hint: "0g=<your-api-key>",
  },
  openai: {
    label: "OpenAI",
    color: "text-emerald-400",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    hint: "openai=sk-...",
  },
  openrouter: {
    label: "OpenRouter",
    color: "text-purple-400",
    models: [
      "openai/gpt-4o",
      "anthropic/claude-3.5-sonnet",
      "meta-llama/llama-3.1-70b-instruct",
      "google/gemini-flash-1.5",
      "mistralai/mistral-large",
    ],
    hint: "openrouter=sk-or-...",
  },
  anthropic: {
    label: "Anthropic",
    color: "text-orange-400",
    models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
    hint: "anthropic=sk-ant-...",
  },
  groq: {
    label: "Groq",
    color: "text-blue-400",
    models: ["llama-3.1-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"],
    hint: "groq=gsk_...",
  },
  mistral: {
    label: "Mistral",
    color: "text-red-400",
    models: ["mistral-large-latest", "mistral-medium-latest", "mistral-small-latest"],
    hint: "mistral=...",
  },
  deepseek: {
    label: "DeepSeek",
    color: "text-cyan-400",
    models: ["deepseek-chat", "deepseek-coder"],
    hint: "deepseek=sk-...",
  },
  together: {
    label: "Together AI",
    color: "text-pink-400",
    models: ["meta-llama/Llama-3-70b-chat-hf", "mistralai/Mixtral-8x7B-Instruct-v0.1"],
    hint: "together=...",
  },
  xai: {
    label: "xAI (Grok)",
    color: "text-zinc-300",
    models: ["grok-2", "grok-2-mini"],
    hint: "xai=xai-...",
  },
};

function detectLLMProvider(rawKey: string): string | null {
  const trimmed = rawKey.trim();
  const match = trimmed.match(/^([^=]+)=/);
  if (match) return match[1].toLowerCase().trim();
  if (trimmed.startsWith("sk-") && trimmed.length > 20) return "openai";
  return null;
}

function detectNetwork(rpcUrl: string): "testnet" | "mainnet" | "custom" {
  if (rpcUrl === NETWORKS.mainnet.rpcUrl || rpcUrl.includes("evmrpc.0g.ai") && !rpcUrl.includes("testnet")) return "mainnet";
  if (rpcUrl.includes("testnet")) return "testnet";
  return "custom";
}

export function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [rpcUrl, setRpcUrl] = useState("");
  const [serviceUrl, setServiceUrl] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [llmApiKey, setLlmApiKey] = useState("");
  const [showLlmKey, setShowLlmKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setRpcUrl(localStorage.getItem(STORAGE_KEYS.RPC_URL) ?? NETWORKS.testnet.rpcUrl);
    setServiceUrl(localStorage.getItem(STORAGE_KEYS.SERVICE_URL) ?? NETWORKS.testnet.serviceUrl);
    setPrivateKey(localStorage.getItem(STORAGE_KEYS.PRIVATE_KEY) ?? "");
    setLlmApiKey(localStorage.getItem(STORAGE_KEYS.LLM_API_KEY) ?? "");
  }, []);

  const { data: walletInfo, isLoading: walletLoading, refetch: refetchWallet } = useGetWalletInfo({
    query: {
      enabled: !!privateKey.trim(),
      refetchInterval: 30000,
      queryKey: ["wallet-info", rpcUrl],
    },
  });

  function applyNetworkPreset(net: "testnet" | "mainnet") {
    const preset = NETWORKS[net];
    setRpcUrl(preset.rpcUrl);
    setServiceUrl(preset.serviceUrl);

    // Immediately persist so the API server picks up the new RPC URL on the next request.
    localStorage.setItem(STORAGE_KEYS.RPC_URL, preset.rpcUrl);
    localStorage.setItem(STORAGE_KEYS.SERVICE_URL, preset.serviceUrl);

    window.dispatchEvent(new CustomEvent("zg-config-changed", {
      detail: { rpcUrl: preset.rpcUrl, llmApiKey: localStorage.getItem(STORAGE_KEYS.LLM_API_KEY) ?? null },
    }));

    queryClient.clear();

    toast({ title: `Switched to ${preset.name}`, description: "Network settings saved automatically." });
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (privateKey && !privateKey.match(/^(0x)?[0-9a-fA-F]{64}$/)) {
      toast({
        title: "Invalid Private Key",
        description: "Private key must be a 64-character hex string (with or without 0x prefix).",
        variant: "destructive",
      });
      return;
    }

    const finalRpc = rpcUrl.trim() || NETWORKS.testnet.rpcUrl;
    const finalSvc = serviceUrl.trim() || NETWORKS.testnet.serviceUrl;

    localStorage.setItem(STORAGE_KEYS.RPC_URL, finalRpc);
    localStorage.setItem(STORAGE_KEYS.SERVICE_URL, finalSvc);
    if (privateKey.trim()) {
      localStorage.setItem(STORAGE_KEYS.PRIVATE_KEY, privateKey.trim());
    } else {
      localStorage.removeItem(STORAGE_KEYS.PRIVATE_KEY);
    }
    if (llmApiKey.trim()) {
      localStorage.setItem(STORAGE_KEYS.LLM_API_KEY, llmApiKey.trim());
    } else {
      localStorage.removeItem(STORAGE_KEYS.LLM_API_KEY);
    }

    // Notify same-tab listeners
    window.dispatchEvent(new CustomEvent("zg-config-changed", {
      detail: { rpcUrl: finalRpc, llmApiKey: llmApiKey.trim() || null },
    }));

    // Invalidate all network-dependent queries
    queryClient.clear();

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);

    toast({ title: "Settings Saved", description: "Your configuration has been saved locally." });
    if (privateKey.trim()) setTimeout(() => refetchWallet(), 500);
  }

  function handleSaveLLMKey() {
    if (llmApiKey.trim()) {
      localStorage.setItem(STORAGE_KEYS.LLM_API_KEY, llmApiKey.trim());
    } else {
      localStorage.removeItem(STORAGE_KEYS.LLM_API_KEY);
    }

    window.dispatchEvent(new CustomEvent("zg-config-changed", {
      detail: { rpcUrl: localStorage.getItem(STORAGE_KEYS.RPC_URL) ?? NETWORKS.testnet.rpcUrl, llmApiKey: llmApiKey.trim() || null },
    }));

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    toast({ title: "LLM Key Saved", description: llmApiKey.trim() ? `Using ${detectedLLMProvider ? (providerInfo?.label ?? detectedLLMProvider) : "external"} provider.` : "LLM key cleared." });
  }

  function handleReset() {
    setRpcUrl(NETWORKS.testnet.rpcUrl);
    setServiceUrl(NETWORKS.testnet.serviceUrl);
    setPrivateKey("");
    setLlmApiKey("");
    localStorage.removeItem(STORAGE_KEYS.RPC_URL);
    localStorage.removeItem(STORAGE_KEYS.SERVICE_URL);
    localStorage.removeItem(STORAGE_KEYS.PRIVATE_KEY);
    localStorage.removeItem(STORAGE_KEYS.LLM_API_KEY);
    window.dispatchEvent(new CustomEvent("zg-config-changed", {
      detail: { rpcUrl: NETWORKS.testnet.rpcUrl, llmApiKey: null },
    }));
    queryClient.clear();
    toast({ title: "Reset to Defaults", description: "All settings cleared, using testnet." });
  }

  async function handleRefreshWallet() {
    setRefreshing(true);
    try {
      await refetchWallet();
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  }

  const hasKey = !!privateKey.trim();
  const activeNetwork = detectNetwork(rpcUrl);
  const detectedLLMProvider = llmApiKey.trim() ? detectLLMProvider(llmApiKey) : null;
  const providerInfo = detectedLLMProvider ? LLM_PROVIDERS[detectedLLMProvider] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 sm:p-8 space-y-6 sm:space-y-8"
    >
      <div>
        <h1 className="text-3xl font-mono font-bold tracking-tight text-foreground">SETTINGS</h1>
        <p className="text-muted-foreground mt-1">Configure your 0G Compute Network connection</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: config form */}
        <div className="lg:col-span-2 space-y-6">

          {/* Network Preset Buttons */}
          <Card className="p-6 bg-card border-border glow-card">
            <h2 className="font-mono font-bold text-sm text-muted-foreground mb-4">NETWORK PRESET</h2>
            <div className="grid grid-cols-2 gap-3">
              {(["testnet", "mainnet"] as const).map((net) => {
                const n = NETWORKS[net];
                const isActive = activeNetwork === net;
                return (
                  <button
                    key={net}
                    type="button"
                    onClick={() => applyNetworkPreset(net)}
                    className={[
                      "flex flex-col items-start gap-1 p-4 rounded-lg border transition-all font-mono text-left",
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${n.dot} ${isActive ? "animate-pulse" : "opacity-50"}`} />
                      <span className="text-xs font-bold">{n.label}</span>
                      {isActive && (
                        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded ml-1">ACTIVE</span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">{n.name}</span>
                    <span className="text-[10px] text-muted-foreground/60 break-all">{n.rpcUrl}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Network Config */}
          <Card className="p-6 bg-card border-border glow-card">
            <h2 className="font-mono font-bold text-sm text-muted-foreground mb-6">NETWORK CONFIGURATION</h2>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="rpc-url" className="font-mono text-xs text-muted-foreground">RPC ENDPOINT</Label>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="rpc-url"
                    data-testid="input-rpc-url"
                    type="url"
                    value={rpcUrl}
                    onChange={(e) => setRpcUrl(e.target.value)}
                    placeholder={NETWORKS.testnet.rpcUrl}
                    className="font-mono text-sm bg-background border-border pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground font-mono">EVM-compatible RPC endpoint for the 0G network</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-url" className="font-mono text-xs text-muted-foreground">SERVICE INDEXER URL</Label>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="service-url"
                    data-testid="input-service-url"
                    type="url"
                    value={serviceUrl}
                    onChange={(e) => setServiceUrl(e.target.value)}
                    placeholder={NETWORKS.testnet.serviceUrl}
                    className="font-mono text-sm bg-background border-border pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground font-mono">0G service indexer endpoint for provider discovery</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="private-key" className="font-mono text-xs text-muted-foreground">PRIVATE KEY</Label>
                <div className="relative">
                  <Input
                    id="private-key"
                    data-testid="input-private-key"
                    type={showKey ? "text" : "password"}
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="0x..."
                    className="font-mono text-sm bg-background border-border pr-10"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="button-toggle-key-visibility"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  Required to sign transactions and pay for inference. Stored only in browser localStorage.
                </p>
              </div>

              <div className="flex gap-3">
                <Button type="submit" data-testid="button-save-settings" className="font-mono tracking-widest flex-1">
                  {saved ? (
                    <><CheckCircle2 className="w-4 h-4 mr-2 text-green-400" />SAVED</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" />SAVE SETTINGS</>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={handleReset} data-testid="button-reset-settings" className="font-mono">
                  RESET
                </Button>
              </div>
            </form>
          </Card>

          {/* LLM API Key Section */}
          <Card className="p-6 bg-card border-border glow-card">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-4 h-4 text-primary" />
              <h2 className="font-mono font-bold text-sm text-muted-foreground">EXTERNAL LLM API KEY</h2>
            </div>
            <p className="text-xs text-muted-foreground font-mono mb-6">
              Optionally use your own AI provider instead of the 0G network. Format: <span className="text-primary">provider=api_key</span>
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="llm-api-key" className="font-mono text-xs text-muted-foreground">API KEY</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="llm-api-key"
                    type={showLlmKey ? "text" : "password"}
                    value={llmApiKey}
                    onChange={(e) => setLlmApiKey(e.target.value)}
                    placeholder="openai=sk-...  or  openrouter=sk-or-..."
                    className="font-mono text-sm bg-background border-border pl-9 pr-10"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLlmKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showLlmKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Detected provider badge */}
                {detectedLLMProvider && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-mono text-muted-foreground">Detected:</span>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border border-current/30 bg-current/10 ${providerInfo?.color ?? "text-primary"}`}>
                      {providerInfo?.label ?? detectedLLMProvider.toUpperCase()}
                    </span>
                    {llmApiKey.trim() && (
                      <button
                        type="button"
                        onClick={() => setLlmApiKey("")}
                        className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                        title="Clear LLM key"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Supported providers list */}
              <div className="space-y-2">
                <p className="text-[11px] font-mono text-muted-foreground">SUPPORTED PROVIDERS</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(LLM_PROVIDERS).map(([key, info]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        const existing = llmApiKey.trim();
                        // Replace or set provider prefix
                        const withoutPrefix = existing.replace(/^[^=]+=/, "");
                        setLlmApiKey(`${key}=${withoutPrefix}`);
                      }}
                      className={[
                        "text-[11px] font-mono px-2 py-1 rounded border transition-all",
                        detectedLLMProvider === key
                          ? `border-current/50 bg-current/10 ${info.color}`
                          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      ].join(" ")}
                    >
                      {info.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Example formats */}
              <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-[11px] font-mono text-muted-foreground font-bold mb-2">EXAMPLES</p>
                {[
                  "0g=<your-api-key>",
                  "openai=sk-proj-...",
                  "openrouter=sk-or-v1-...",
                  "groq=gsk_...",
                  "anthropic=sk-ant-...",
                ].map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setLlmApiKey(ex.replace(/\.\.\.$/, ""))}
                    className="block w-full text-left text-[11px] font-mono text-muted-foreground hover:text-primary transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>

              <Button
                type="button"
                onClick={handleSaveLLMKey}
                className="w-full font-mono tracking-widest"
                variant={llmApiKey.trim() ? "default" : "outline"}
              >
                <Save className="w-4 h-4 mr-2" />
                SAVE LLM KEY
              </Button>
            </div>
          </Card>
        </div>

        {/* Right: status + wallet */}
        <div className="space-y-6">

          {/* Active Mode indicator */}
          {(hasKey || llmApiKey.trim()) && (
            <Card className="p-4 bg-card border-border glow-card">
              <h2 className="font-mono font-bold text-xs text-muted-foreground mb-3">ACTIVE INFERENCE MODE</h2>
              <div className="space-y-2">
                <div className={`flex items-center gap-2 p-2 rounded-md border ${llmApiKey.trim() ? "border-border bg-muted/20" : "border-primary/30 bg-primary/5"}`}>
                  <div className={`w-2 h-2 rounded-full ${!llmApiKey.trim() ? "bg-primary animate-pulse" : "bg-muted-foreground"}`} />
                  <span className={`text-xs font-mono font-bold ${!llmApiKey.trim() ? "text-primary" : "text-muted-foreground"}`}>0G NETWORK</span>
                  {!llmApiKey.trim() && !hasKey && (
                    <span className="ml-auto text-[10px] text-yellow-500 font-mono">NEEDS KEY</span>
                  )}
                  {!llmApiKey.trim() && hasKey && (
                    <span className="ml-auto text-[10px] text-green-500 font-mono">ACTIVE</span>
                  )}
                </div>
                {llmApiKey.trim() && providerInfo && (
                  <div className="flex items-center gap-2 p-2 rounded-md border border-primary/30 bg-primary/5">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className={`text-xs font-mono font-bold ${providerInfo.color}`}>{providerInfo.label.toUpperCase()}</span>
                    <span className="ml-auto text-[10px] text-green-500 font-mono">ACTIVE</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Wallet Info */}
          <Card className="p-6 bg-card border-border glow-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-mono font-bold text-sm text-muted-foreground">WALLET</h2>
              {hasKey && (
                <button
                  type="button"
                  onClick={handleRefreshWallet}
                  className="text-muted-foreground hover:text-primary transition-colors p-1 rounded hover:bg-primary/10"
                  title="Refresh balance"
                  disabled={walletLoading || refreshing}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${(walletLoading || refreshing) ? "animate-spin" : ""}`} />
                </button>
              )}
            </div>

            {!hasKey ? (
              <div className="flex items-center gap-2 text-yellow-500">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <p className="text-xs font-mono">Enter a private key to see wallet info.</p>
              </div>
            ) : walletLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-4 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : walletInfo ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-muted-foreground">ADDRESS</span>
                  <div className="flex items-center gap-2">
                    <Wallet className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-mono text-xs text-foreground break-all">{walletInfo.address}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <span className="text-[10px] font-mono text-muted-foreground block mb-1">BALANCE</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-mono font-bold text-primary">
                      {walletInfo.balanceEther.toFixed(4)}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">0G</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-xs font-mono text-muted-foreground">NETWORK</span>
                  <div className="flex items-center gap-2">
                    <Globe className="w-3 h-3 text-muted-foreground" />
                    <span className={`text-xs font-mono font-bold ${NETWORKS[walletInfo.network as keyof typeof NETWORKS]?.color ?? "text-foreground"}`}>
                      {walletInfo.network.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-xs font-mono text-muted-foreground">CHAIN ID</span>
                  <span className="text-xs font-mono text-foreground">{walletInfo.chainId}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs font-mono text-destructive">Failed to load wallet info</p>
            )}
          </Card>

          {/* Token Usage Per Network */}
          <Card className="p-6 bg-card border-border glow-card">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-primary" />
              <h2 className="font-mono font-bold text-sm text-muted-foreground">TOKEN USAGE</h2>
            </div>
            <div className="space-y-4">
              {(["testnet", "mainnet"] as const).map((net) => {
                const n = NETWORKS[net];
                const tokens = walletInfo
                  ? (net === "testnet" ? walletInfo.testnetTokensUsed : walletInfo.mainnetTokensUsed)
                  : null;
                return (
                  <div key={net} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${n.dot}`} />
                        <span className="text-xs font-mono text-muted-foreground">{n.label}</span>
                      </div>
                      <span className="text-xs font-mono text-foreground font-bold">
                        {tokens != null ? tokens.toLocaleString() : "—"}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${net === "mainnet" ? "bg-green-400" : "bg-yellow-400"} transition-all`}
                        style={{
                          width: tokens && walletInfo
                            ? `${Math.min(100, (tokens / Math.max(1, walletInfo.testnetTokensUsed + walletInfo.mainnetTokensUsed)) * 100)}%`
                            : "0%"
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-border flex justify-between">
                <span className="text-xs font-mono text-muted-foreground">TOTAL</span>
                <span className="text-xs font-mono text-primary font-bold">
                  {walletInfo ? (walletInfo.testnetTokensUsed + walletInfo.mainnetTokensUsed).toLocaleString() : "—"}
                </span>
              </div>
            </div>
          </Card>

          {/* Security notice */}
          <Card className="p-6 bg-yellow-500/5 border-yellow-500/20 glow-card">
            <div className="flex gap-3">
              <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-mono text-yellow-500 font-bold">SECURITY NOTICE</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Keys are stored in browser localStorage and sent to the server for signing.
                  Use dedicated wallets/keys with minimal access. Never use your main wallet or production API keys.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
