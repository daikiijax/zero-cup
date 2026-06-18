---
name: setExtraHeadersGetter
description: Per-request extra header injection added to lib/api-client-react custom-fetch.ts.
---

Added `setExtraHeadersGetter` to `lib/api-client-react/src/custom-fetch.ts` and exported from `src/index.ts`.

**Pattern:** Allows callers to register a getter `() => Record<string, string>` that is called before every fetch. The returned headers are merged into the request. Used by the 0G compute dashboard to forward `x-zg-private-key`, `x-zg-rpc-url`, `x-zg-service-url`, and `x-llm-api-key` from localStorage on every API call.

**How to apply:**
- Call `setExtraHeadersGetter(fn)` once at app startup (e.g. in `App.tsx` before `QueryClientProvider`).
- The getter is async-compatible (`Record<string, string> | Promise<Record<string, string>>`).
- Pass `null` to clear.
