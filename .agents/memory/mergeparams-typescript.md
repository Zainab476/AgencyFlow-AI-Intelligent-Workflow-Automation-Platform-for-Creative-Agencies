---
name: Express mergeParams TypeScript
description: TypeScript workaround for Express Router with mergeParams:true — parent route params not statically visible.
---

## Rule
When a child Express Router uses `mergeParams: true`, TypeScript doesn't know about the inherited parent params.

**Why:** The Express typings infer params strictly from the router's own route strings. Parent params (e.g. `:id` from `/projects/:id`) are merged at runtime but not in types.

## How to apply
Cast inside each handler:
```typescript
const p = req.params as Record<string, string>;
const projectId = parseInt(p["id"] ?? "");
```

Do NOT use `req.params["id" as string]` — that doesn't satisfy the index signature either.
The cast `as Record<string, string>` is the cleanest solution.
