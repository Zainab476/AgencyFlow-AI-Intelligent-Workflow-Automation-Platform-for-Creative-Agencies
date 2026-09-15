# AgencyFlow AI

AgencyFlow AI is a TypeScript monorepo for an intelligent workflow automation platform for creative agencies. The product combines a React + Vite front end, an Express + Drizzle API, a shared database schema package, and an OpenAPI-generated client layer for internal tooling and UI workflows.

## Product Overview

AgencyFlow AI centralizes client relationships, campaign planning, project operations, document generation, task execution, analytics, and workflow automation for agencies. It is designed around a single source of truth for project data and automates the translation from raw project details into polished client-facing materials.

Core product areas include:

- Client and project lifecycle management.
- Project team and membership management.
- AI-assisted campaign analysis and content generation.
- Document generation for proposals, contracts, and deliverables.
- Google Sheets integration and n8n workflow hooks.
- Notifications, activities, dashboards, and analytics for operations.

## Repository Layout

```text
.
├── artifacts/
│   ├── agency-flow/            # Vite React application
│   └── api-server/             # Express TypeScript API
├── lib/
│   ├── api-client-react/       # Generated React API client
│   ├── api-zod/                # Zod validation primitives and generated docs
│   └── db/                     # Drizzle schema and database access layer
├── db/                          # Database migrations/seeding package
└── package.json                 # Monorepo scripts and workspace package metadata
```

## Architecture

The top-level architecture looks like this:

```text
Browser UI (React + Vite)
        │
        ▼
REST API (Express + TypeScript)
        │
        ├── Auth + JWT middleware
        ├── CRUD routes for clients, projects, tasks, documents, sheets, analytics
        ├── AI routes for generation and chat
        └── Webhook routes for automation
        │
        ▼
PostgreSQL via Drizzle ORM
```

## Workspace Packages

### Frontend: artifacts/agency-flow

The user-facing application is a Vite React single-page app built with TypeScript, Tailwind, and shadcn/ui inspired components. It communicates with the API through the generated API client package.

Primary UI areas are:

- Dashboard and analytics screens.
- Client and project operations.
- Profile and settings management.
- Uploads, documents, sheets, and workflows.

### Backend: artifacts/api-server

The backend is an Express 5 server with route modules under `src/routes`. Authentication uses JWT signed with a shared secret and role-aware middleware. Business logic uses the shared Drizzle schema library.

### Database: lib/db

The database package exports the shared Drizzle schema. It includes PostgreSQL tables for users, clients, projects, tasks, documents, notifications, sheets, and webhook automation.

### Generated API Layer: lib/api-client-react

The generated React hooks and fetch wrappers in `lib/api-client-react/src/generated` are used by the web UI to call the REST API.

## Role-Based Access Control

AgencyFlow ships with a role model for three workspace roles:

- `admin`
- `manager`
- `employee`

The backend password and JWT middleware expose a reusable middleware factory:

```ts
requireAuth
requireRole(["admin", "manager"])
requireAdmin
requireManager
requireEmployee
```

Where:

- `requireAuth` verifies the bearer JWT token.
- `requireRole` allows a route or router to accept an explicit list of whitelisted roles.
- `requireAdmin` restricts access to administrative users.
- `requireManager` allows admins and managers.
- `requireEmployee` allows admins, managers, and employees.

Role data is now included in the JWT payload and in the `GET /api/auth/me` response.

## Environment Variables

The server and database packages read environment variables from the process environment.

Required variables:

```env
PORT=3001
DATABASE_URL=postgres://username:password@host:5432/agencyflow
JWT_SECRET=replace-with-a-secure-random-secret
```

Optional or feature-specific variables:

```env
GOOGLE_API_KEY=your-gemini-key
GOOGLE_GENAI_API_KEY=your-gemini-key
RESEND_API_KEY=your-resend-key
WEBHOOK_SECRET=your-webhook-secret
```

The workspace uses `DATABASE_URL` for the Drizzle/PostgreSQL connection pool exported by `lib/db/src/index.ts`. The API process also reads `PORT` from the process environment and must be available before the server starts.

## Local Development Commands

From the repository root:

```bash
pnpm install
pnpm --filter @workspace/api-server dev
pnpm --filter @workspace/agency-flow dev
```

Or use workspace scripts from the root:

```bash
pnpm run typecheck
pnpm run build
```

## API Documentation

The repository includes an OpenAPI specification in:

```text
lib/api-spec/openapi.yaml
```

It is used as the source of generated TypeScript types and client hooks. The API surface includes the following route families:

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Clients

- `GET /api/clients`
- `POST /api/clients`
- `GET /api/clients/:id`
- `PUT /api/clients/:id`
- `DELETE /api/clients/:id`

### Projects

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`

### Tasks

- `GET /api/tasks`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`

### Documents

- `GET /api/documents`
- `POST /api/documents`
- `GET /api/documents/:id`
- `DELETE /api/documents/:id`

### Analytics and dashboard

- `GET /api/dashboard`
- `GET /api/analytics`

### Notifications and activity

- `GET /api/notifications`
- `GET /api/activity`

### Webhooks and automation

- `POST /api/webhooks/*`
- `GET /api/webhooks/*`
- `POST /api/sheets/*`

## Settings and User Experience

The UI now includes a dedicated Settings page in the React workspace that supports:

- Light and dark mode switching.
- Profile editing fields for name and email.
- Email preference toggles for project updates, weekly digests, documents, and workflow alerts.
- Role-aware profile and security display in the account panel.

## Security Notes

- All private routes and business routes are expected to use `requireAuth` or a role-aware middleware factory.
- JWTs should be signed with a strong environment-provided secret in production.
- The API uses `cors()` and bearer-token auth in the current Express setup.
- Production deployments should enforce TLS, secrets management, stricter CORS, and database-level access policies.

## Roadmap

Phase 8 completes, in the repository, the Production Polish layer by adding:

- RBAC middleware with `admin`, `manager`, and `employee` role enforcement.
- A complete settings screen with UI-driven profile and preference management.
- End-user-focused documentation for installation, architecture, runtime config, and API endpoints.
