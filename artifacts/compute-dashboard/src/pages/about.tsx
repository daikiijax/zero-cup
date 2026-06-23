import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowRight, Bot, Cpu, Database, Globe, Lock, MessageSquare, Network, Zap } from "lucide-react";

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

export function About() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 sm:p-8 max-w-4xl mx-auto space-y-10"
    >
      {/* Hero */}
      <div className="text-center space-y-4 py-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Bot className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-foreground">0G Tokenomics Agent</h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          An AI-native inference dashboard built on the <span className="text-primary font-semibold">0G Compute Network</span> — the world's first decentralized AI marketplace. Ask anything about Web3 tokenomics, DeFi mechanisms, and the 0G ecosystem.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link href="/chat">
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-mono text-sm font-medium hover:opacity-90 transition-opacity">
              Start Chatting <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          <Link href="/inference">
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-border text-foreground font-mono text-sm hover:border-primary/40 hover:text-primary transition-colors">
              Single Inference <Cpu className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </div>

      {/* What is 0G */}
      <div>
        <h2 className="font-mono font-bold text-xl mb-4 text-foreground">What is 0G?</h2>
        <Card className="p-6 bg-card border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Cpu, title: "0G Compute", desc: "Decentralized AI inference marketplace. Submit jobs to permissionless GPU providers and pay with 0G tokens. Powers this entire app.", color: "text-primary", bg: "bg-primary/10 border-primary/20" },
              { icon: Database, title: "0G Storage", desc: "Decentralized, permanent data storage with cryptographic proofs. Store AI outputs, datasets, and model weights on-chain.", color: "text-secondary", bg: "bg-secondary/10 border-secondary/20" },
              { icon: Network, title: "0G DA", desc: "Data Availability layer enabling high-throughput, low-latency data publishing for AI and Web3 applications at scale.", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
            ].map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="space-y-3">
                <div className={`w-10 h-10 rounded-lg ${bg} border flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <h3 className="font-mono font-bold text-sm">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Features */}
      <div>
        <h2 className="font-mono font-bold text-xl mb-4 text-foreground">Features</h2>
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: MessageSquare, title: "Multi-turn Chat", desc: "Persistent conversation history with the 0G Tokenomics Agent. Ask follow-up questions and refine analyses interactively." },
            { icon: Cpu, title: "0G Compute Inference", desc: "Submit AI jobs directly to decentralized providers on the 0G network. No centralized API — fully permissionless." },
            { icon: Globe, title: "Multi-Provider Support", desc: "Also supports OpenAI, Groq, Anthropic, OpenRouter, Mistral, DeepSeek, and more — all through one interface." },
            { icon: Bot, title: "Tokenomics Expertise", desc: "Pre-loaded system prompt tuned for Web3 token design, DeFi mechanics, and 0G ecosystem analysis." },
            { icon: Zap, title: "Real-time Provider Network", desc: "Discover live 0G compute providers, their latency, available models, and network status in real time." },
            { icon: Lock, title: "Your Keys, Your Data", desc: "Private keys and API credentials are stored only in your browser's localStorage — never sent to our servers." },
          ].map(({ icon: Icon, title, desc }) => (
            <motion.div key={title} variants={item}>
              <Card className="p-5 bg-card border-border h-full">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-mono font-bold text-sm mb-1">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* How it works */}
      <div>
        <h2 className="font-mono font-bold text-xl mb-4 text-foreground">How It Works</h2>
        <Card className="p-6 bg-card border-border">
          <ol className="space-y-5">
            {[
              { step: "01", title: "Configure Your Wallet", desc: "Add your 0G wallet private key and RPC endpoint in Settings. For external LLMs, add your API key in format provider=key." },
              { step: "02", title: "Choose Your Mode", desc: "Use 0G Compute for fully decentralized inference, or pick an external provider (OpenAI, Groq, etc.) for faster responses." },
              { step: "03", title: "Start a Conversation", desc: "Head to Chat for multi-turn dialogue, or Inference for single-shot analysis. The agent is pre-tuned on 0G tokenomics expertise." },
              { step: "04", title: "Results On-chain", desc: "Every inference job is logged with model, latency, and token usage. Provider payments happen trustlessly on the 0G network." },
            ].map(({ step, title, desc }) => (
              <li key={step} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="font-mono font-bold text-xs text-primary">{step}</span>
                </div>
                <div>
                  <h3 className="font-mono font-bold text-sm mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* Built for Zero Cup */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <div className="flex items-start gap-4">
          <Zap className="w-6 h-6 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-mono font-bold text-sm mb-2">Built for The Zero Cup 2026</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This project was built during The Zero Cup — 0G's Global Vibe Coding Tournament (June 15–July 8, 2026). It demonstrates AI-native development on the 0G Compute Network with real decentralized inference, multi-turn conversation, and live provider discovery.
            </p>
            <a href="https://github.com/daikiijax/zero-cup" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-xs font-mono text-primary hover:underline">
              View source on GitHub <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
