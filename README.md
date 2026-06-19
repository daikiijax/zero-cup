# 0G Tokenomics Agent

AI-driven Tokenomics & 0G Ecosystem Analyzer — submit inference jobs to the [0G Compute Network](https://0g.ai) or external LLM providers, with a built-in expert persona focused on Web3 tokenomics and the 0G ecosystem.

---

## Features

- **AI Inference** — submit prompts to 0G Compute Network on-chain providers or external LLMs
- **0G Tokenomics Agent persona** — system prompt preloaded as a Web3 / 0G ecosystem expert
- **Live provider discovery** — auto-fetches available model providers from the 0G network
- **Multi-provider LLM** — 0G Private Computer, Groq, OpenAI, OpenRouter, Anthropic, Mistral, DeepSeek, xAI
- **Wallet panel** — shows address, OG balance, chain ID, and network (mainnet / testnet)
- **Activity log** — history of inference jobs with status, latency, and token usage
- **Markdown output** — responses rendered with headings, lists, code blocks, bold/italic
- **Copy to clipboard** — one-click copy of any output
- **Suggested prompts** — quick-start tokenomics questions

---

## Stack

| Layer | Tech |
|---|---|
| Monorepo | pnpm workspaces |
| Language | TypeScript 5.9 |
| Frontend | React + Vite + Tailwind CSS + Radix UI (shadcn/ui) |
| Routing | Wouter |
| Data fetching | TanStack Query |
| Backend | Express 5 |
| 0G SDK | `@0gfoundation/0g-compute-ts-sdk` |
| Blockchain | Ethers v6 |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod |
| API codegen | Orval (OpenAPI → React Query hooks + Zod schemas) |
| Logger | Pino |
| Build | esbuild |

---

## Project Structure

```
.
├── artifacts/
│   ├── compute-dashboard/    # React + Vite frontend
│   └── api-server/           # Express API server
├── lib/
│   ├── api-spec/             # OpenAPI spec + Orval config
│   ├── api-client-react/     # Generated React Query hooks
│   ├── api-zod/              # Generated Zod schemas
│   └── db/                   # Drizzle ORM schema & migrations
├── scripts/                  # Utility scripts
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+

---

## Deploy to Vercel

The easiest way to make the app publicly accessible.

### 1. Database (required)

Create a free Postgres database — [Neon](https://neon.tech) or [Supabase](https://supabase.com) work well. Copy the connection string.

### 2. Push DB schema to production

```bash
DATABASE_URL=your-connection-string pnpm --filter @workspace/db run push
```

### 3. Import repo to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → select `zero-cup`
2. Leave **Framework Preset** as *Other* — `vercel.json` handles everything
3. Add these **Environment Variables** before deploying:

| Variable | Required | Value |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string |
| `SESSION_SECRET` | ✅ | Any long random string |
| `ZG_RPC_URL` | — | Default: testnet `https://evmrpc-testnet.0g.ai` |
| `ZG_SERVICE_URL` | — | Default: testnet indexer |
| `ZG_PRIVATE_KEY` | — | Wallet key for on-chain inference (can set in UI) |
| `LLM_API_KEY` | — | `provider=apikey` format (e.g. `groq=gsk_...`) |

4. Click **Deploy**

The app frontend + API serverless function will deploy together to a single `.vercel.app` domain.

---

## Local Setup

### 1. Clone & install

```bash
git clone https://github.com/daikiijax/zero-cup.git
cd zero-cup
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string |
| `SESSION_SECRET` | ✅ | Random string for session signing |
| `ZG_RPC_URL` | — | 0G RPC endpoint (defaults to testnet) |
| `ZG_SERVICE_URL` | — | 0G storage indexer URL |
| `ZG_PRIVATE_KEY` | — | Wallet private key for on-chain inference |
| `LLM_API_KEY` | — | External provider key (e.g. `groq=gsk_...`) |

### 3. Push database schema

```bash
pnpm --filter @workspace/db run push
```

### 4. Run API server

```bash
PORT=5000 pnpm --filter @workspace/api-server run dev
```

### 5. Run frontend (separate terminal)

```bash
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/compute-dashboard run dev
```

Frontend: `http://localhost:5173` — API: `http://localhost:5000`

---

## 0G Network Endpoints

| Network | Chain ID | RPC | Service Indexer |
|---|---|---|---|
| Testnet | 16602 | `https://evmrpc-testnet.0g.ai` | `https://indexer-storage-testnet-standard.0g.ai` |
| Mainnet | 16661 | `https://evmrpc.0g.ai` | `https://indexer-storage-mainnet-standard.0g.ai` |

---

## External LLM Providers

Set `LLM_API_KEY` in the format `provider=apikey`:

```
0g=your-api-key           # 0G Private Computer (router-api.0g.ai)
groq=gsk_...              # Groq
openai=sk-...             # OpenAI
openrouter=sk-or-...      # OpenRouter
anthropic=sk-ant-...      # Anthropic
deepseek=sk-...           # DeepSeek
mistral=...               # Mistral
xai=xai-...               # xAI (Grok)
```

---

## API Routes

| Method | Path | Description |
|---|---|---|
| GET | `/api/healthz` | Health check |
| POST | `/api/inference` | Submit inference job |
| GET | `/api/inference/:id` | Get job status & result |
| GET | `/api/providers` | List 0G network providers |
| GET | `/api/activity` | Inference job history |
| GET | `/api/stats` | Dashboard stats |
| GET | `/api/wallet/info` | Wallet balance & network |

---

## Useful Commands

```bash
# Full typecheck
pnpm run typecheck

# Regenerate API client from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes (dev only)
pnpm --filter @workspace/db run push

# Build all
pnpm run build
```

---

## License

MIT
