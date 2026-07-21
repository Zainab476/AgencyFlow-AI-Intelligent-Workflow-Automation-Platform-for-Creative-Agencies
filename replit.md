# AgencyFlow AI

A production-ready SaaS foundation for creative agencies to manage clients and projects — with AI-powered proposals, contracts, and workflows planned for future phases.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/agency-flow run dev` — run the frontend (port 22730)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run seed` — seed demo data (creates demo@agencyflow.ai / password123)
- Required env: `DATABASE_URL` — Postgres connection string

## Demo Credentials

- Email: `demo@agencyflow.ai`
- Password: `password123`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite 7 + Tailwind CSS v4 + shadcn/ui
- API: Express 5 + JWT authentication (jsonwebtoken + bcryptjs)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (v3), drizzle-zod
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle for API server)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle ORM schema (users, clients, projects)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/middlewares/auth.ts` — JWT middleware + signToken
- `artifacts/agency-flow/src/` — React frontend
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — generated Zod validators (do not edit)

## Architecture decisions

- OpenAPI-first: all API contracts are defined in `lib/api-spec/openapi.yaml` and code-generated into React Query hooks and Zod validators. Never hand-write types that codegen produces.
- JWT stored in localStorage under key `af_token`; attached via `Authorization: Bearer` header in `lib/api-client-react/src/custom-fetch.ts`.
- All routes are user-scoped: every query filters by `userId` from the JWT payload, so users only see their own data.
- `lib/db` is a composite library package — after schema changes, run `pnpm run typecheck:libs` before leaf artifact typechecks.

## Product

- **Auth** — Register, login, JWT-protected routes, user profile
- **Dashboard** — Stats cards (total clients, projects, active count, budget), recent projects list
- **Clients** — Full CRUD, searchable table, company name / contact / email / phone
- **Projects** — Full CRUD, filter by status/client/search, budget / dates / campaign name / status

## User preferences

_Populate as you build._

## Gotchas

- After any `lib/api-spec/openapi.yaml` change, always run codegen before touching the frontend.
- After any `lib/db/src/schema/` change, run `pnpm --filter @workspace/db run push` then `pnpm run typecheck:libs`.
- Do not add `format: email` to OpenAPI fields — Orval generates `zod.email()` which is Zod v4 syntax incompatible with the v3 catalog version.
- `pg` is NOT in the pnpm catalog — use explicit version strings when adding pg as a dep to a new package.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
