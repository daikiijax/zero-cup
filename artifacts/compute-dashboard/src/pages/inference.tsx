import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSubmitInference,
  useListProviders,
  useGetInferenceJob,
  getListInferenceJobsQueryKey,
  getGetInferenceJobQueryKey,
  getGetDashboardStatsQueryKey,
  getListActivityQueryKey,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Cpu, Send, Loader2, AlertCircle, CheckCircle2, Bot, Zap, RefreshCw } from "lucide-react";

// ──────────────────────────────────────────────────────────────
// LLM Provider model presets
// ──────────────────────────────────────────────────────────────
const PROVIDER_MODELS: Record<string, { label: string; models: string[] }> = {
  openai: {
    label: "OpenAI",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  },
  openrouter: {
    label: "OpenRouter",
    models: [
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
      "anthropic/claude-3.5-sonnet",
      "anthropic/claude-3.5-haiku",
      "meta-llama/llama-3.1-70b-instruct",
      "meta-llama/llama-3.1-8b-instruct",
      "google/gemini-flash-1.5",
      "mistralai/mistral-large",
      "deepseek/deepseek-chat",
      "x-ai/grok-2",
    ],
  },
  anthropic: {
    label: "Anthropic",
    models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
  },
  groq: {
    label: "Groq",
    models: [
      "llama-3.1-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
      "gemma2-9b-it",
    ],
  },
  mistral: {
    label: "Mistral",
    models: ["mistral-large-latest", "mistral-medium-latest", "mistral-small-latest"],
  },
  deepseek: {
    label: "DeepSeek",
    models: ["deepseek-chat", "deepseek-coder"],
  },
  together: {
    label: "Together AI",
    models: ["meta-llama/Llama-3-70b-chat-hf", "mistralai/Mixtral-8x7B-Instruct-v0.1"],
  },
  xai: {
    label: "xAI",
    models: ["grok-2", "grok-2-mini"],
  },
};

const PROVIDER_COLORS: Record<string, string> = {
  openai: "text-emerald-400",
  openrouter: "text-purple-400",
  anthropic: "text-orange-400",
  groq: "text-blue-400",
  mistral: "text-red-400",
  deepseek: "text-cyan-400",
  together: "text-pink-400",
  xai: "text-zinc-300",
};

function detectLLMProvider(rawKey: string): string | null {
  const trimmed = rawKey.trim();
  const match = trimmed.match(/^([^=]+)=/);
  if (match) return match[1].toLowerCase().trim();
  if (trimmed.startsWith("sk-") && trimmed.length > 20) return "openai";
  return null;
}

// ──────────────────────────────────────────────────────────────
// Hooks
// ──────────────────────────────────────────────────────────────
function JobResultPoller({ jobId, onDone }: { jobId: string; onDone: (status: string) => void }) {
  const queryClient = useQueryClient();
  const [poll, setPoll] = useState(true);
  const { data: job } = useGetInferenceJob(jobId, {
    query: {
      enabled: poll,
      queryKey: getGetInferenceJobQueryKey(jobId),
      refetchInterval: poll ? 2000 : false,
    },
  });

  useEffect(() => {
    if (job && (job.status === "completed" || job.status === "failed")) {
      setPoll(false);
      onDone(job.status);
      queryClient.invalidateQueries({ queryKey: getListInferenceJobsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListActivityQueryKey() });
    }
  }, [job?.status]);  // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function useCurrentRpcUrl() {
  const [rpcUrl, setRpcUrl] = useState(
    () => localStorage.getItem("ZG_RPC_URL") ?? "https://evmrpc-testnet.0g.ai"
  );
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "ZG_RPC_URL") {
        setRpcUrl(e.newValue ?? "https://evmrpc-testnet.0g.ai");
      }
    }
    function onConfigChanged(e: Event) {
      const detail = (e as CustomEvent<{ rpcUrl: string }>).detail;
      if (detail?.rpcUrl) setRpcUrl(detail.rpcUrl);
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("zg-config-changed", onConfigChanged);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("zg-config-changed", onConfigChanged);
    };
  }, []);
  return rpcUrl;
}

function useLLMApiKey() {
  const [llmKey, setLlmKey] = useState(
    () => localStorage.getItem("LLM_API_KEY") ?? ""
  );
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "LLM_API_KEY") {
        setLlmKey(e.newValue ?? "");
      }
    }
    function onConfigChanged(e: Event) {
      const detail = (e as CustomEvent<{ llmApiKey?: string | null }>).detail;
      if (detail && "llmApiKey" in detail) {
        setLlmKey(detail.llmApiKey ?? "");
      }
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("zg-config-changed", onConfigChanged);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("zg-config-changed", onConfigChanged);
    };
  }, []);
  return llmKey;
}

// ──────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────
export function Inference() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const rpcUrl = useCurrentRpcUrl();
  const llmKey = useLLMApiKey();
  const network = rpcUrl.includes("mainnet") ? "mainnet" : "testnet";

  const detectedProvider = llmKey.trim() ? detectLLMProvider(llmKey) : null;
  const isExternalMode = !!detectedProvider;
  const providerInfo = detectedProvider ? PROVIDER_MODELS[detectedProvider] : null;
  const providerColor = detectedProvider ? (PROVIDER_COLORS[detectedProvider] ?? "text-primary") : "text-primary";

  // 0G network providers (only fetch when in 0G mode)
  const { data: providers, isLoading: providersLoading, refetch: refetchProviders } = useListProviders({
    query: {
      enabled: !isExternalMode,
      queryKey: ["/api/providers", rpcUrl],
      staleTime: 0,
    },
  });

  const submitInference = useSubmitInference();

  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [useCustomModel, setUseCustomModel] = useState(false);
  const [maxTokens, setMaxTokens] = useState(512);
  const [temperature, setTemperature] = useState(0.7);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const { data: activeJob } = useGetInferenceJob(activeJobId ?? "", {
    query: {
      enabled: !!activeJobId,
      queryKey: getGetInferenceJobQueryKey(activeJobId ?? ""),
      refetchInterval: activeJobId && (jobStatus === "pending" || jobStatus === "running") ? 1000 : false,
    },
  });

  // 0G models from providers
  const zgModels = Array.from(new Set(providers?.flatMap((p) => p.models) ?? []));

  // Models to display in the select
  const selectModels = isExternalMode
    ? (providerInfo?.models ?? [])
    : zgModels;

  // Reset model when mode/network/models change
  useEffect(() => {
    if (isExternalMode) {
      const presets = providerInfo?.models ?? [];
      setModel(presets[0] ?? "");
      setUseCustomModel(false);
    }
  }, [detectedProvider]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isExternalMode && zgModels.length > 0) {
      setModel((prev) => (zgModels.includes(prev) ? prev : zgModels[0]));
    }
  }, [network, zgModels.join(",")]);  // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveModel = useCustomModel ? customModel.trim() : model;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || !effectiveModel) return;
    setActiveJobId(null);
    setJobStatus(null);

    submitInference.mutate(
      {
        data: {
          prompt: prompt.trim(),
          model: effectiveModel,
          maxTokens,
          temperature,
        },
      },
      {
        onSuccess: (job) => {
          setActiveJobId(job.id);
          setJobStatus(job.status);
          queryClient.invalidateQueries({ queryKey: getListInferenceJobsQueryKey() });
          setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        },
        onError: (err: any) => {
          toast({
            title: "Inference Failed",
            description: err?.data?.error ?? "Failed to submit inference request.",
            variant: "destructive",
          });
        },
      }
    );
  }

  function handleJobDone(status: string) {
    setJobStatus(status);
    if (status === "failed") {
      toast({
        title: "Inference Failed",
        description: activeJob?.errorMessage ?? "The inference job failed.",
        variant: "destructive",
      });
    }
  }

  const isRunning =
    submitInference.isPending ||
    (activeJobId !== null && (jobStatus === "pending" || jobStatus === "running"));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 sm:p-8 space-y-6 sm:space-y-8"
    >
      {activeJobId && <JobResultPoller jobId={activeJobId} onDone={handleJobDone} />}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-mono font-bold tracking-tight text-foreground">AI INFERENCE</h1>
          <p className="text-muted-foreground mt-1">
            {isExternalMode
              ? `Submit inference via ${providerInfo?.label ?? detectedProvider}`
              : "Submit inference requests to the 0G Compute Network"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mode badge */}
          {isExternalMode ? (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-current/30 bg-current/10 font-mono text-xs font-bold ${providerColor}`}>
              <Bot className="w-3 h-3" />
              <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-current" />
              {(providerInfo?.label ?? detectedProvider ?? "").toUpperCase()}
            </div>
          ) : (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border font-mono text-xs font-bold ${
              network === "mainnet"
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
            }`}>
              <Zap className="w-3 h-3" />
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${network === "mainnet" ? "bg-green-400" : "bg-yellow-400"}`} />
              0G {network.toUpperCase()}
              {providersLoading && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 bg-card border-border glow-card">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="prompt-input" className="font-mono text-xs text-muted-foreground">
                  PROMPT
                </Label>
                <Textarea
                  id="prompt-input"
                  data-testid="input-prompt"
                  className="font-mono text-sm min-h-[200px] bg-background border-border resize-none focus:ring-primary"
                  placeholder="Enter your prompt here..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isRunning}
                  maxLength={8000}
                />
                <p className="text-xs text-muted-foreground text-right font-mono">
                  {prompt.length}/8000
                </p>
              </div>

              {/* Model selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-mono text-xs text-muted-foreground">MODEL</Label>
                  {isExternalMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setUseCustomModel((v) => !v);
                        if (!useCustomModel) setCustomModel(model);
                      }}
                      className="text-[11px] font-mono text-muted-foreground hover:text-primary transition-colors underline"
                    >
                      {useCustomModel ? "← use preset" : "custom model →"}
                    </button>
                  )}
                </div>

                {useCustomModel && isExternalMode ? (
                  <div className="relative">
                    <Input
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      placeholder={`e.g. ${providerInfo?.models[0] ?? "model-name"}`}
                      className="font-mono text-sm bg-background border-border"
                      disabled={isRunning}
                    />
                  </div>
                ) : (
                  <Select
                    value={model}
                    onValueChange={setModel}
                    disabled={isRunning}
                  >
                    <SelectTrigger data-testid="select-model" className="font-mono bg-background border-border">
                      <SelectValue placeholder={selectModels.length === 0 ? "Loading models..." : "Select a model"} />
                    </SelectTrigger>
                    <SelectContent
                      className="font-mono bg-card border-border max-w-[calc(100vw-2rem)]"
                      position="popper"
                      align="start"
                      sideOffset={4}
                    >
                      {selectModels.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {isExternalMode && providerInfo && (
                  <p className="text-[11px] font-mono text-muted-foreground">
                    <span className={providerColor}>{providerInfo.label}</span> — showing preset models for this provider
                  </p>
                )}
              </div>

              <Button
                type="submit"
                data-testid="button-submit-inference"
                disabled={isRunning || !prompt.trim() || !effectiveModel}
                className="w-full font-mono tracking-widest"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {jobStatus === "running" ? "COMPUTING..." : "SUBMITTING..."}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    RUN INFERENCE
                  </>
                )}
              </Button>
            </form>
          </Card>

          {/* Result */}
          {activeJobId && activeJob && (
            <Card ref={resultRef} className="p-6 bg-card border-border glow-card" data-testid="inference-result">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-mono font-bold text-sm text-muted-foreground">OUTPUT</h2>
                <div className="flex items-center gap-2">
                  {activeJob.status === "completed" && (
                    <span className="flex items-center gap-1.5 text-xs font-mono text-green-500">
                      <CheckCircle2 className="w-3 h-3" />
                      COMPLETED
                      {activeJob.latencyMs && ` · ${activeJob.latencyMs}ms`}
                    </span>
                  )}
                  {activeJob.status === "running" && (
                    <span className="flex items-center gap-1.5 text-xs font-mono text-primary animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      RUNNING
                    </span>
                  )}
                  {activeJob.status === "pending" && (
                    <span className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      PENDING
                    </span>
                  )}
                  {activeJob.status === "failed" && (
                    <span className="flex items-center gap-1.5 text-xs font-mono text-destructive">
                      <AlertCircle className="w-3 h-3" />
                      FAILED
                    </span>
                  )}
                </div>
              </div>

              <div className="font-mono text-sm bg-background rounded-md border border-border p-4 min-h-[120px] terminal-scroll overflow-y-auto max-h-[400px] whitespace-pre-wrap leading-relaxed">
                {activeJob.status === "completed" && activeJob.result ? (
                  <span className="text-green-400">{activeJob.result}</span>
                ) : activeJob.status === "failed" ? (
                  <span className="text-destructive">ERROR: {activeJob.errorMessage ?? "Unknown error"}</span>
                ) : (
                  <span className="text-muted-foreground animate-pulse">
                    {activeJob.status === "running" ? "▋ Generating..." : "▋ Waiting for network..."}
                  </span>
                )}
              </div>

              {activeJob.status === "completed" && (
                <div className="mt-3 flex gap-6 text-xs font-mono text-muted-foreground">
                  {activeJob.inputTokens != null && (
                    <span>IN: {activeJob.inputTokens} tokens</span>
                  )}
                  {activeJob.outputTokens != null && (
                    <span>OUT: {activeJob.outputTokens} tokens</span>
                  )}
                  {activeJob.providerAddress && (
                    <span>VIA: {activeJob.providerAddress.slice(0, 10)}...</span>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Parameters */}
          <Card className="p-6 bg-card border-border glow-card">
            <h2 className="font-mono font-bold text-sm text-muted-foreground mb-4">PARAMETERS</h2>
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="font-mono text-xs text-muted-foreground">MAX TOKENS</Label>
                  <span className="font-mono text-xs text-primary">{maxTokens}</span>
                </div>
                <Slider
                  data-testid="slider-max-tokens"
                  value={[maxTokens]}
                  onValueChange={([v]) => setMaxTokens(v)}
                  min={64}
                  max={4096}
                  step={64}
                  disabled={isRunning}
                  className="w-full"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="font-mono text-xs text-muted-foreground">TEMPERATURE</Label>
                  <span className="font-mono text-xs text-primary">{temperature.toFixed(1)}</span>
                </div>
                <Slider
                  data-testid="slider-temperature"
                  value={[temperature * 10]}
                  onValueChange={([v]) => setTemperature(v / 10)}
                  min={0}
                  max={20}
                  step={1}
                  disabled={isRunning}
                  className="w-full"
                />
              </div>
            </div>
          </Card>

          {/* Providers / Mode info */}
          {isExternalMode ? (
            <Card className="p-6 bg-card border-border glow-card">
              <div className="flex items-center gap-2 mb-4">
                <Bot className={`w-4 h-4 ${providerColor}`} />
                <h2 className="font-mono font-bold text-sm text-muted-foreground">
                  {providerInfo?.label?.toUpperCase() ?? detectedProvider?.toUpperCase() ?? "EXTERNAL"} MODE
                </h2>
              </div>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-[11px] font-mono text-muted-foreground mb-1">STATUS</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${providerColor.replace("text-", "bg-")}`} />
                    <span className={`text-xs font-mono font-bold ${providerColor}`}>API KEY CONFIGURED</span>
                  </div>
                </div>
                <p className="text-[11px] font-mono text-muted-foreground">
                  Requests go directly to the {providerInfo?.label ?? detectedProvider} API.
                  Token costs are billed by your provider.
                </p>
                <p className="text-[11px] font-mono text-muted-foreground">
                  Available presets: <span className="text-foreground">{(providerInfo?.models ?? []).length} models</span>
                </p>
              </div>
            </Card>
          ) : (
            <Card className="p-6 bg-card border-border glow-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-mono font-bold text-sm text-muted-foreground">PROVIDERS</h2>
                <button
                  type="button"
                  onClick={() => refetchProviders()}
                  className="text-muted-foreground hover:text-primary transition-colors p-1 rounded hover:bg-primary/10"
                  title="Refresh providers"
                  disabled={providersLoading}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${providersLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
              <div className="space-y-3">
                {providersLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : providers && providers.length > 0 ? (
                  providers.slice(0, 5).map((p) => (
                    <div key={p.address} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            p.status === "online" ? "bg-green-500" : "bg-muted-foreground"
                          }`}
                        />
                        <span className="text-xs font-mono truncate max-w-[120px]">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-mono text-muted-foreground">{p.models.length}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 space-y-2">
                    <p className="text-xs font-mono text-muted-foreground">No providers found</p>
                    <button
                      type="button"
                      onClick={() => refetchProviders()}
                      className="text-xs font-mono text-primary hover:underline"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
}
