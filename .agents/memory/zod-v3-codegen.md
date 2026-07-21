---
name: Zod v3 codegen constraints
description: OpenAPI spec rules to avoid Orval generating Zod v4-incompatible code in the pnpm catalog (v3) environment.
---

## Rule
The workspace pnpm catalog pins `zod` to v3. Orval's codegen targets Zod v3 by default but certain OpenAPI field types trigger v4-only syntax.

**Why:** `format: email` generates `zod.email()` (v4 only). Multipart file fields generate `zod.instanceof(File)` and `Blob` which are DOM types unavailable in lib/node contexts.

## How to apply
- Never add `format: email` to any OpenAPI string field.
- Never add multipart `requestBody` with `format: binary` fields to OpenAPI spec.
- Safe: all standard types (string, integer, boolean, object, enum, array) work fine.
- After any openapi.yaml change, run `pnpm --filter @workspace/api-spec run codegen` which runs Orval + `pnpm run typecheck:libs`. Both must pass.
