---
name: Orval body schema naming
description: How Orval derives Zod schema names and how to avoid TS2308 collisions in api-zod.
---

Orval generates Zod schema names from the **operationId**, not from the `$ref` component name.

For `operationId: submitInference` with a body schema `$ref: "#/components/schemas/InferenceInput"`, Orval still generates:
- `export const SubmitInferenceBody = zod.object(...)` in `generated/api.ts`
- `export interface InferenceInput { ... }` in `generated/types/inferenceInput.ts`

**Why:** Orval derives the Zod wrapper name as `<OperationIdPascal>Body`, regardless of the component name.

**How to apply:**
- In routes, import the Zod schema using the operationId-derived name (e.g. `SubmitInferenceBody`), not the component name.
- To avoid TS2308 in `lib/api-zod/src/index.ts`, either:
  1. Use `export type *` for the types barrel (allows value export from api.ts to take precedence), OR
  2. Name components with entity-shaped names that differ from `<OperationIdPascal>Body` (e.g. `InferenceInput` vs `SubmitInferenceBody`).
- Option 2 is cleaner — use `InferenceInput` (entity) instead of `SubmitInferenceBody` (operation-shaped) in openapi.yaml.
