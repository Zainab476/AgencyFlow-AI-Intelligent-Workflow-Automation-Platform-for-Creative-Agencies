---
name: Gemini model IDs
description: Which Gemini model IDs work in this project and related pdfkit dependency fix.
---

## Gemini model names
- `gemini-2.5-flash` — deprecated for new API keys (returns HTTP 404 "no longer available to new users")
- **Use `gemini-2.0-flash`** — stable, works for both FLASH_MODEL and PRO_MODEL slots

## pdfkit / fontkit dependency
- pdfkit pulls in fontkit which requires `@swc/helpers`
- Must install: `pnpm --filter @workspace/api-server add @swc/helpers`
- Without it, the API server crashes at startup with `Cannot find module '@swc/helpers/cjs/_define_property.cjs'`

**Why:** The @google/genai SDK sends the model ID as `models/<name>` to the REST API; older names like gemini-2.5-flash were removed from the models registry.

**How to apply:** Always use `gemini-2.0-flash` in `artifacts/api-server/src/lib/ai/client.ts`.
