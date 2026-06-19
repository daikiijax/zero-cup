# 0G Tokenomics Agent

AI-driven Tokenomics & 0G Ecosystem Analyzer — built on the [0G Compute Network](https://0g.ai).

Submit AI inference jobs, track on-chain providers, view activity logs, and analyze tokenomics with a built-in expert persona.

---

## Features

- **AI Inference** — submit prompts to 0G Compute Network providers or external LLMs (Groq, OpenAI, Anthropic, etc.)
- **0G Tokenomics Agent persona** — every response is guided by a Web3 / 0G ecosystem expert system prompt
- **Live provider list** — auto-fetches available model providers from the 0G network
- **Wallet panel** — shows address, balance, chain ID, and network (mainnet / testnet)
- **Activity log** — full history of inference jobs with status, latency, and token counts
- **Markdown output** — responses rendered with headings, lists, code blocks, bold/italic
- **Copy to clipboard** — one-click copy of any output
- **Suggested prompts** — quick-start buttons for tokenomics questions
- **Multi-provider support** — 0G Private Computer, Groq, OpenAI, OpenRouter, Anthropic, Mistral, DeepSeek, xAI

---

## Stack

| Layer | Tech |
|---|---|
| Monorepo | pnpm workspaces |
| Runtime | Node.js 24 |
| Language | TypeScript 5.9 |
| Frontend | React 18 + Vite + Tailwind CSS + shadcn/ui |
| Backend | Express 5 |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod v4 |
| API contract | OpenAPI → Orval codegen |
| AI SDK | 0G Compute SDK (`@0glabs/0g-serving-broker`) |

---

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+

---

## Local Setup

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/0g-testing.git
cd 0g-testing
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string |
| `SESSION_SECRET` | ✅ | Random string for session signing |
| `PORT` | ✅ | API server port (e.g. `8080`) |
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
PORT=8080 pnpm --filter @workspace/api-server run dev
```

### 5. Run frontend (separate terminal)

```bash
pnpm --filter @workspace/compute-dashboard run dev
```

Frontend runs on `http://localhost:5173` by default.
API server runs on `http://localhost:8080`.

---

## 0G Network Endpoints

| Network | RPC | Service |
|---|---|---|
| Testnet | `https://evmrpc-testnet.0g.ai` | `https://indexer-storage-testnet-standard.0g.ai` |
| Mainnet | `https://evmrpc.0g.ai` | `https://indexer-storage-mainnet-standard.0g.ai` |

---

## External LLM Providers

Set `LLM_API_KEY` in the format `provider=apikey`:

```
0g=your-pc-api-key            # 0G Private Computer (pc.0g.ai)
groq=gsk_...                  # Groq
openai=sk-...                 # OpenAI
openrouter=sk-or-...          # OpenRouter
anthropic=sk-ant-...          # Anthropic
deepseek=sk-...               # DeepSeek
mistral=...                   # Mistral
xai=xai-...                   # xAI (Grok)
```

---

## Project Structure

```
.
├── artifacts/
│   ├── compute-dashboard/    # React + Vite frontend
│   └── api-server/           # Express API server
├── lib/
│   ├── api-spec/             # OpenAPI spec + Orval codegen
│   ├── api-client-react/     # Generated React Query hooks
│   └── db/                   # Drizzle ORM schema & migrations
├── scripts/                  # Utility scripts
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

## Useful Commands

```bash
# Full typecheck
pnpm run typecheck

# Regenerate API client from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes (dev only)
pnpm --filter @workspace/db run push

# Build all packages
pnpm run build
```

---

## License

MIT
