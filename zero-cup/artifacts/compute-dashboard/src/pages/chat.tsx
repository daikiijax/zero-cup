import { useState, useEffect, useRef } from "react";
import { useSubmitInference, useGetInferenceJob, getGetInferenceJobQueryKey } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Bot, User, Send, Loader2, AlertCircle, Trash2, Download, Zap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

// ── Types ──────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  jobId?: string;
  latencyMs?: number;
  model?: string;
}

// ── Inline markdown for chat bubbles ──────────────────────────
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /(~~[^~]+~~|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("~~")) parts.push(<s key={m.index} className="opacity-60">{tok.slice(2, -2)}</s>);
    else if (tok.startsWith("**")) parts.push(<strong key={m.index} className="font-semibold">{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("*")) parts.push(<em key={m.index} className="italic">{tok.slice(1, -1)}</em>);
    else parts.push(<code key={m.index} className="bg-black/30 px-1 py-0.5 rounded text-[0.8em] font-mono">{tok.slice(1, -1)}</code>);
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function ChatMarkdown({ text }: { text: string }) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const lines = normalized.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0, key = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) { codeLines.push(lines[i]); i++; }
      nodes.push(
        <div key={key++} className="my-2 rounded-md overflow-hidden border border-white/10">
          {lang && <div className="px-3 py-1 bg-black/40 text-[10px] font-mono text-white/50 uppercase tracking-widest">{lang}</div>}
          <pre className="bg-black/30 p-3 overflow-x-auto"><code className="text-xs font-mono whitespace-pre">{codeLines.join("\n")}</code></pre>
        </div>
      );
      i++; continue;
    }
    if (/^#{1,3} /.test(trimmed)) {
      const level = trimmed.match(/^(#{1,3}) /)?.[1].length ?? 1;
      const sizes = ["text-base font-bold", "text-sm font-bold", "text-sm font-semibold"];
      nodes.push(<p key={key++} className={`${sizes[level - 1]} mt-3 mb-1`}>{renderInline(trimmed.replace(/^#{1,3} /, ""))}</p>);
      i++; continue;
    }
    if (/^[-*+] /.test(trimmed)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[-*+] /.test(lines[i].trim())) {
        items.push(<li key={i} className="flex gap-1.5"><span className="mt-1 opacity-50">•</span><span>{renderInline(lines[i].trim().slice(2))}</span></li>);
        i++;
      }
      nodes.push(<ul key={key++} className="space-y-1 my-1.5 pl-0">{items}</ul>);
      continue;
    }
    if (/^\d+\. /.test(trimmed)) {
      const items: React.ReactNode[] = [];
      let n = 1;
      while (i < lines.length && /^\d+\. /.test(lines[i].trim())) {
        items.push(<li key={i} className="flex gap-2"><span className="opacity-50 font-mono text-xs mt-1">{n}.</span><span>{renderInline(lines[i].trim().replace(/^\d+\. /, ""))}</span></li>);
        i++; n++;
      }
      nodes.push(<ol key={key++} className="space-y-1 my-1.5">{items}</ol>);
      continue;
    }
    if (/^---+$/.test(trimmed)) { nodes.push(<hr key={key++} className="border-white/20 my-3" />); i++; continue; }
    if (trimmed === "") { i++; continue; }
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^(#{1,3} |[-*+] |\d+\. |```|---+)/.test(lines[i].trim())) {
      paraLines.push(lines[i].trim()); i++;
    }
    if (paraLines.length > 0) nodes.push(<p key={key++} className="leading-relaxed">{paraLines.flatMap((l, pi) => pi < paraLines.length - 1 ? [...renderInline(l), " "] : renderInline(l))}</p>);
  }
  return <div className="text-sm space-y-1">{nodes}</div>;
}

// ── Models ─────────────────────────────────────────────────────
const QUICK_MODELS = [
  { value: "0g:deepseek-v3", label: "DeepSeek V3 (0G)" },
  { value: "0g:glm-s1", label: "GLM-S1 (0G)" },
  { value: "openai:gpt-4o", label: "GPT-4o (OpenAI)" },
  { value: "groq:llama-3.3-70b-versatile", label: "Llama 3.3 70B (Groq)" },
  { value: "anthropic:claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
];

function buildConversationPrompt(history: Message[], newMessage: string): string {
  if (history.length === 0) return newMessage;
  const lines: string[] = ["[Conversation history]"];
  for (const msg of history) {
    if (msg.role === "user") lines.push(`User: ${msg.content}`);
    else if (msg.role === "assistant") lines.push(`Assistant: ${msg.content}`);
  }
  lines.push("", "[Continue the conversation — respond only to the latest user message below]");
  lines.push(`User: ${newMessage}`);
  return lines.join("\n");
}

// ── Poller component ───────────────────────────────────────────
function JobPoller({ jobId, onDone }: { jobId: string; onDone: (result: string, latencyMs: number | null) => void }) {
  const queryClient = useQueryClient();
  const doneRef = useRef(false);
  const { data: job } = useGetInferenceJob(jobId, {
    query: {
      enabled: true,
      queryKey: getGetInferenceJobQueryKey(jobId),
      refetchInterval: 1500,
    },
  });
  useEffect(() => {
    if (!job || doneRef.current) return;
    if (job.status === "completed") {
      doneRef.current = true;
      queryClient.cancelQueries({ queryKey: getGetInferenceJobQueryKey(jobId) });
      onDone(job.result ?? "", job.latencyMs ?? null);
    } else if (job.status === "failed") {
      doneRef.current = true;
      queryClient.cancelQueries({ queryKey: getGetInferenceJobQueryKey(jobId) });
      onDone(`__error__:${job.errorMessage ?? "Unknown error"}`, null);
    }
  }, [job?.status]);
  return null;
}

// ── Main component ─────────────────────────────────────────────
export function Chat() {
  const { toast } = useToast();
  const submitInference = useSubmitInference();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm your **0G Tokenomics Agent** — an expert in Web3 economy design, the 0G ecosystem, decentralized AI, and crypto tokenomics.\n\nAsk me anything about 0G Storage, 0G Compute, token design, or the broader DeFi ecosystem.",
    },
  ]);
  const [input, setInput] = useState("");
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("0g:deepseek-v3");

  const llmKey = localStorage.getItem("LLM_API_KEY") ?? "";

  const [provider, model] = selectedModel.split(":");

  const isWaiting = !!pendingJobId;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isWaiting]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isWaiting) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantHistory = messages.filter((m) => m.role === "user" || m.role === "assistant");
    const fullPrompt = buildConversationPrompt(assistantHistory, text);

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Determine model based on provider prefix
    const submitModel = model;
    if (provider !== "0g" && !llmKey.trim()) {
      toast({ title: "API Key Required", description: `Set your ${provider.toUpperCase()} API key in Settings (format: ${provider}=YOUR_KEY).`, variant: "destructive" });
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      return;
    }

    submitInference.mutate(
      { data: { prompt: fullPrompt, model: submitModel, maxTokens: 1500, temperature: 0.7 } },
      {
        onSuccess: (job) => setPendingJobId(job.id),
        onError: (err: any) => {
          const errMsg = err?.data?.error ?? "Failed to submit request.";
          setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "error", content: errMsg }]);
          toast({ title: "Error", description: errMsg, variant: "destructive" });
        },
      }
    );
  }

  function handleJobDone(result: string, latencyMs: number | null) {
    setPendingJobId(null);
    if (result.startsWith("__error__:")) {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "error", content: result.slice(10) },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: result, latencyMs: latencyMs ?? undefined, model: selectedModel },
      ]);
    }
  }

  function handleClear() {
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "Conversation cleared. How can I help you?",
    }]);
    setPendingJobId(null);
  }

  function handleExport() {
    const lines: string[] = ["# 0G Tokenomics Agent — Chat Export", `_Exported: ${new Date().toLocaleString()}_`, ""];
    for (const msg of messages) {
      if (msg.role === "user") lines.push(`## You\n\n${msg.content}\n`);
      else if (msg.role === "assistant") lines.push(`## Agent\n\n${msg.content}\n`);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `0g-chat-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col h-[calc(100vh-56px)] lg:h-screen"
    >
      {pendingJobId && <JobPoller jobId={pendingJobId} onDone={handleJobDone} />}

      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 border-b border-border bg-card shrink-0 gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-mono font-bold text-xs">0G TOKENOMICS AGENT</h1>
            <p className="text-[10px] text-muted-foreground font-mono">Multi-turn chat</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-1 justify-end">
          <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isWaiting}>
            <SelectTrigger className="w-[140px] sm:w-[190px] font-mono text-xs h-8 bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="font-mono bg-card border-border w-[220px]">
              {QUICK_MODELS.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={handleExport}
            className="p-2 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors shrink-0"
            title="Export conversation"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClear}
            disabled={isWaiting}
            className="p-2 rounded border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors disabled:opacity-40 shrink-0"
            title="Clear conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4 terminal-scroll">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center border ${
                msg.role === "user"
                  ? "bg-primary/10 border-primary/30"
                  : msg.role === "error"
                  ? "bg-destructive/10 border-destructive/30"
                  : "bg-secondary/10 border-secondary/30"
              }`}>
                {msg.role === "user"
                  ? <User className="w-3.5 h-3.5 text-primary" />
                  : msg.role === "error"
                  ? <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                  : <Bot className="w-3.5 h-3.5 text-secondary" />}
              </div>

              {/* Bubble */}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : msg.role === "error"
                  ? "bg-destructive/10 border border-destructive/30 text-destructive rounded-tl-sm"
                  : "bg-card border border-border rounded-tl-sm"
              }`}>
                {msg.role === "user" ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                ) : msg.role === "error" ? (
                  <p className="text-sm font-mono">Error: {msg.content}</p>
                ) : (
                  <ChatMarkdown text={msg.content} />
                )}
                {msg.latencyMs && (
                  <p className="text-[10px] text-muted-foreground font-mono mt-2 opacity-60">{msg.latencyMs}ms</p>
                )}
              </div>
            </motion.div>
          ))}

          {/* Thinking bubble */}
          {isWaiting && (
            <motion.div
              key="thinking"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="w-7 h-7 rounded-full shrink-0 bg-secondary/10 border border-secondary/30 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-secondary" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground font-mono animate-pulse">Thinking...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border bg-card px-4 sm:px-6 py-4">
        {!llmKey && provider !== "0g" && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <Zap className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
            <p className="text-xs text-yellow-400 font-mono">Set your {provider.toUpperCase()} API key in Settings to use this model.</p>
          </div>
        )}
        <form onSubmit={handleSend} className="flex gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e as any); }
            }}
            placeholder="Ask about tokenomics, 0G ecosystem, DeFi mechanisms... (Enter to send)"
            className="flex-1 font-mono text-sm resize-none min-h-[44px] max-h-[160px] bg-background border-border"
            disabled={isWaiting}
            rows={1}
          />
          <Button
            type="submit"
            disabled={isWaiting || !input.trim()}
            className="shrink-0 font-mono px-4 h-auto"
          >
            {isWaiting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
        <p className="text-[10px] text-muted-foreground font-mono mt-2 text-center">
          {messages.filter(m => m.role !== "error").length - 1} messages · Shift+Enter for new line
        </p>
      </div>
    </motion.div>
  );
}
