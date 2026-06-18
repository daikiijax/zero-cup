---
name: api-zod dual export
description: How lib/api-zod/src/index.ts exports both Zod schemas and TypeScript types without TS2308.
---

`lib/api-zod/src/index.ts` currently exports:
```ts
export * from "./generated/api";       // Zod schemas (values + types)
export type * from "./generated/types"; // TypeScript interfaces (types only)
```

**Why this works:** `export type *` only re-exports type declarations, so when `generated/api.ts` and `generated/types/` both have a name like `SubmitInferenceBody`, the value export from `api.ts` wins and the type-only export from `types/` is shadowed without error.

**Why:** The old `export * from "./generated/types"` caused TS2308 because it tried to re-export a value that was already exported by `generated/api.ts`. Switching to `export type *` makes it a type-only re-export, eliminating the collision.
