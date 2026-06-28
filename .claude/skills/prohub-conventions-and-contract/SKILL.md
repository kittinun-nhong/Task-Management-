---
name: prohub-conventions-and-contract
description: >
  The cross-cutting conventions and API contract for ProHub (all-TypeScript Next.js full-stack): the
  standard JSON response envelope (success/list/error + pagination), the Server Action ActionResult,
  pagination query params, HTTP status codes, naming rules (frontend/server/contracts), folder
  layout, environment variables, and the shared rules for IDs, dates, and soft deletes. USE WHEN:
  deciding a response shape, naming a file/route/contract, choosing where code goes, configuring
  env, or any "how does this project do X" convention question. Trigger on: "response envelope",
  "ActionResult", "pagination", "status code", "naming", "folder structure", "env vars",
  "soft delete", "number vs UUID", "UTC dates".
---

# ProHub Conventions & API Contract

The rules every layer obeys. When in doubt, this skill is the tie-breaker. ProHub is a single
Next.js + TypeScript app (App Router) — there is no separate backend service.

## Standard response envelope (Route Handlers — never return bare data)
```jsonc
// Success — list
{ "success": true, "message": "OK", "data": [ ... ],
  "pagination": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 } }

// Success — single
{ "success": true, "message": "OK", "data": { ... } }

// Error
{ "success": false, "message": "Validation failed",
  "errors": [ { "field": "email", "message": "must be a valid email address" } ] }
```
Produced by `lib/server/response.ts`; the client `apiFetch` unwraps it so callers receive the
payload directly (see `prohub-type-contract`).

## Server Action result (mutations — not an HTTP envelope)
```typescript
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string[] | undefined> };
```
Components branch on `result.ok` — no try/catch around the action call.

## Pagination query params (identical everywhere)
```
GET /api/products?page=1&limit=20&sort=createdAt&order=desc&search=keyword
```
Defined once as `paginationQuerySchema` in the contract and reused by every list endpoint.

## HTTP status codes
| Scenario | Code |  | Scenario | Code |
|---|---|---|---|---|
| Read OK | 200 |  | Unauthorized | 401 |
| Created | 201 |  | Forbidden | 403 |
| No content (delete) | 204 |  | Not found | 404 |
| Bad request / validation | 400 |  | Internal error | 500 |

## Naming conventions
**Frontend** — Components `PascalCase.tsx` (`ProductTable.tsx`); custom hooks `useThing.ts`;
TanStack Query hooks `useGetProducts` / `useCreateProduct` in `lib/api/<entity>.ts`; stores
`camelCaseStore` (`authStore.ts`); route segments kebab-case; CSS modules `Name.module.css`.

**Contracts (`lib/contracts/`)** — file per entity, `kebab-or-singular.ts` (`product.ts`); schemas
`camelCaseSchema` (`createProductSchema`); inferred types `PascalCase` (`Product`,
`CreateProductInput`). The schema is the source of truth — types are `z.infer`, never hand-written.

**Server (`lib/server/`, `app/api/`, `app/**/actions.ts`)** — files `kebab-case.ts`
(`product-service.ts`, `product-repository.ts`); Route Handlers are `route.ts` exporting
`GET`/`POST`/`PATCH`/`DELETE`; Server Actions in `actions.ts` named `<verb><Entity>Action`
(`createProductAction`); services/repositories `create<Entity>Service` / `<entity>Repository`.
Every server-only module starts with `import 'server-only'`.

**API routes** — REST under `app/api/<entity>/` (`route.ts`) and `app/api/<entity>/[id]/route.ts`.
No `/v1/` prefix unless a public versioned API is required.

## Folder layout (where code goes)
```
app/
  layout.tsx, page.tsx            # App Router pages (Server Components by default)
  api/<entity>/route.ts           # Route Handlers (REST contract)
  <feature>/actions.ts            # Server Actions (mutations)
  providers.tsx                   # 'use client' — QueryClientProvider, MantineProvider
components/
  ui/                             # generic presentational components
  features/                       # feature-scoped components (ProductTable, CreateProductForm)
lib/
  contracts/<entity>.ts           # Zod schemas + inferred types — SINGLE SOURCE OF TRUTH (shared)
  api/client.ts, api/<entity>.ts  # typed fetcher + TanStack Query hooks (client)
  server/
    services/                     # business logic (server-only)
    repositories/                 # data access interfaces + impls (server-only)
    auth/                         # jose signing, session helpers (server-only)
    response.ts                   # envelope + ActionResult helpers
stores/                           # Zustand stores (authStore.ts)
middleware.ts                     # route protection (root level)
```
- `lib/contracts/` is the **only** place imported by both server and client — keep it pure
  (Zod + types, no secrets, no DB).
- `lib/server/**` is **server-only** — never import it from a Client Component.

## Environment variables
**Server (`.env.local`, never `NEXT_PUBLIC_`)**: `JWT_SECRET` (min 32 chars in prod),
`JWT_ACCESS_EXPIRY=15m`, `JWT_REFRESH_EXPIRY=7d`, `DATABASE_URL` (when a real DB is added), OAuth
client IDs/secrets (only those enabled).
**Public (client-readable)**: `NEXT_PUBLIC_API_URL` — usually unset/`/api` since the API is
same-origin in this monolith; set it only when pointing at a different origin.

> No CORS config is needed for the same-origin API. Add CORS headers in the Route Handler only if an
> external origin must call it.

## Shared rules
- IDs are `number` — **no UUIDs** unless explicitly required.
- Dates stored UTC, serialized as ISO 8601 strings (`Date` ↔ `string` over the wire).
- Soft deletes via `deletedAt` — never hard-delete user/order/product records.
- The Zod contract is the source of truth for every shape; run `npx tsc --noEmit` to catch drift
  (replaces "regenerate types").

## Related skills
- `prohub-backend-route-handler` — produces the envelope / ActionResult and obeys these naming rules.
- `prohub-type-contract` — the Zod contracts and typed client that consume this contract.
- `prohub-frontend-datatable` / `prohub-frontend-forms` — consume pagination params and the error shape.
