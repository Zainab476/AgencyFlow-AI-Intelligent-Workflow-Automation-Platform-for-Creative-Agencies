---
name: DB lib rebuild after schema change
description: Required sequence after adding or modifying Drizzle schema files in lib/db/src/schema/.
---

## Rule
After any change to `lib/db/src/schema/`, run these in order:
1. `pnpm --filter @workspace/db run push` — applies schema to the Postgres database
2. `pnpm run typecheck:libs` — rebuilds composite TypeScript declarations for all lib packages

**Why:** `@workspace/api-server` and other artifacts reference `@workspace/db` via TypeScript project references. The `.d.ts` declarations are cached; without a rebuild, leaf artifact typechecks will fail with "Module has no exported member" even though the schema file exists.

## How to apply
Always run both commands together after schema changes before running any leaf-package typecheck.
The codegen script (`pnpm --filter @workspace/api-spec run codegen`) also calls `pnpm run typecheck:libs` internally — so if you ran codegen after the schema change, step 2 is already done.
