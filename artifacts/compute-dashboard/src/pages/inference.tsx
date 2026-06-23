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
import { Cpu, Send, Loader2, AlertCircle, CheckCircle2, Bot, Zap, RefreshCw, Copy, Check, Download } from "lucide-react";

// ──────────────────────────────────────────────────────────────
// Markdown renderer (no external dep)
// ──────────────────────────────────────────────────────────────
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      parts.push(<strong key={m.index} className="font-bold text-foreground">{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("*")) {
      parts.push(<em key={m.index} className="italic">{tok.slice(1, -1)}</em>);
    } else {
      parts.push(<code key={m.index} className="bg-muted/60 text-primary px-1 py-0.5 rounded text-[0.82em] font-mono">{tok.slice(1, -1)}</code>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function MarkdownOutput({ text }: { text: string }) {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Fenced code block
    if (line.trimStart().startsWith("```")) {
      const fence = line.trimStart().slice(3);
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <pre key={i} className="bg-muted/40 border border-border rounded-md p-3 overflow-x-auto my-3">
          <code className="text-xs font-mono text-foreground/90 whitespace-pre">{codeLines.join("\n")}</code>
        </pre>
      );
    }
    // Headings
    else if (/^### /.test(line)) {
      nodes.push(<h3 key={i} className="text-sm font-bold text-foreground mt-4 mb-1">{renderInline(line.slice(4))}</h3>);
    } else if (/^## /.test(line)) {
      nodes.push(<h2 key={i} className="text-base font-bold text-foreground mt-5 mb-1.5 border-b border-border pb-1">{renderInline(line.slice(3))}</h2>);
    } else if (/^# /.test(line)) {
      nodes.push(<h1 key={i} className="text-lg font-bold text-foreground mt-5 mb-2 border-b border-border pb-1">{renderInline(line.slice(2))}</h1>);
    }
    // Bullet list
    else if (/^[-*] /.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(<li key={i} className="leading-relaxed">{renderInline(lines[i].slice(2))}</li>);
        i++;
      }
      nodes.push(<ul key={`ul-${i}`} className="list-disc list-inside space-y-0.5 my-2 pl-1 text-foreground/90">{items}</ul>);
      continue;
    }
    // Numbered list
    else if (/^\d+\. /.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(<li key={i} className="leading-relaxed">{renderInline(lines[i].replace(/^\d+\. /, ""))}</li>);
        i++;
      }
      nodes.push(<ol key={`ol-${i}`} className="list-decimal list-inside space-y-0.5 my-2 pl-1 text-foreground/90">{items}</ol>);
      continue;
    }
    // Horizontal rule
    else if (/^---+$/.test(line.trim())) {
      nodes.push(<hr key={i} className="border-border my-3" />);
    }
    // Empty line → spacer
    else if (line.trim() === "") {
      nodes.push(<div key={i} className="h-2" />);
    }
    // Paragraph
    else {
      nodes.push(<p key={i} className="leading-relaxed text-foreground/90">{renderInline(line)}</p>);
    }
    i++;
  }
  return <div className="text-sm space-y-0.5">{nodes}</div>;
}

// ──────────────────────────────────────────────────────────────
// LLM Provider model presets
// ──────────────────────────────────────────────────────────────
const PROVIDER_MODELS: Record<string, { label: string; models: string[] }> = {
  "0g": {
    label: "0G Private Computer",
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
  },
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
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "meta-llama/llama-4-scout-17b-16e-instruct",
      "qwen/qwen3-32b",
      "qwen/qwen3.6-27b",
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
  "0g": "text-primary",
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
  // mainnet URL is "https://evmrpc.0g.ai" — no "mainnet" in it, so check "testnet" absence instead
  const network = (rpcUrl.includes("evmrpc.0g.ai") && !rpcUrl.includes("testnet")) ? "mainnet" : "testnet";

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
  const [copied, setCopied] = useState(false);
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
          <h1 className="text-3xl font-mono font-bold tracking-tight text-foreground">0G TOKENOMICS AGENT</h1>
          <p className="text-muted-foreground mt-1">
            {isExternalMode
              ? `Submit inference via ${providerInfo?.label ?? detectedProvider}`
              : "AI-driven Tokenomics & 0G Ecosystem Analyzer"}
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
                {/* Suggested prompts */}
                <div className="flex flex-col gap-1.5 pt-1">
                  {[
                    "Design a tokenomics model for an AI agent on the 0G Network",
                    "Explain how 0G Storage integrates with decentralized AI inference",
                    "Analyze the benefits of 0G Data Availability for scalable applications",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      disabled={isRunning}
                      onClick={() => setPrompt(suggestion)}
                      className="text-left text-[11px] font-mono text-muted-foreground hover:text-primary border border-border hover:border-primary/40 rounded px-2.5 py-1.5 transition-colors bg-muted/20 hover:bg-primary/5 disabled:opacity-40"
                    >
                      ↳ {suggestion}
                    </button>
                  ))}
                </div>
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
                    <>
                      <span className="flex items-center gap-1.5 text-xs font-mono text-green-500">
                        <CheckCircle2 className="w-3 h-3" />
                        COMPLETED
                        {activeJob.latencyMs && ` · ${activeJob.latencyMs}ms`}
                      </span>
                      {activeJob.result && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(activeJob.result ?? "");
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono border border-border hover:border-primary/40 hover:text-primary text-muted-foreground transition-colors"
                            title="Copy output"
                          >
                            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                            {copied ? "COPIED" : "COPY"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const content = [
                                `# 0G Inference Output`,
                                `**Model:** ${activeJob.model}`,
                                activeJob.latencyMs ? `**Latency:** ${activeJob.latencyMs}ms` : "",
                                "",
                                "## Prompt",
                                activeJob.prompt,
                                "",
                                "## Output",
                                activeJob.result ?? "",
                              ].filter(Boolean).join("\n");
                              const blob = new Blob([content], { type: "text/markdown" });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `0g-inference-${activeJob.id.slice(0, 8)}.md`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono border border-border hover:border-primary/40 hover:text-primary text-muted-foreground transition-colors"
                            title="Download as markdown"
                          >
                            <Download className="w-3 h-3" />
                            EXPORT
                          </button>
                        </div>
                      )}
                    </>
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

              <div className="bg-background rounded-md border border-border p-4 min-h-[120px] overflow-y-auto max-h-[600px]">
                {activeJob.status === "completed" && activeJob.result ? (
                  <MarkdownOutput text={activeJob.result} />
                ) : activeJob.status === "failed" ? (
                  <span className="text-destructive text-sm font-mono">ERROR: {activeJob.errorMessage ?? "Unknown error"}</span>
                ) : (
                  <span className="text-muted-foreground text-sm font-mono animate-pulse">
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
                  max={2000}
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
