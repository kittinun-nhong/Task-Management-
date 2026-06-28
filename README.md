# ProHub — Task Management (Next.js)

Full-stack implementation of the ProHub product-task dashboard, built from the prototype in
`ref/Task management/` following the `prohub-*` skill conventions. **Next.js is the backend** —
Route Handlers + layered service/repository. Persistence is a **JSON file on disk** (no DB): every
read loads it, every mutation rewrites it atomically.

## Run

```bash
npm install --legacy-peer-deps
npm run dev          # http://localhost:3000
# or: npm run build && npm start
```

`npm run typecheck` runs `tsc --noEmit` (the "are the contracts in sync" check — no codegen).

## Deploy (Netlify)

Connect the repo in Netlify — it auto-detects Next.js and installs the official Next.js Runtime
(`@netlify/plugin-nextjs`), which serves the Route Handlers and Server Actions as functions. The
build settings live in [`netlify.toml`](./netlify.toml); `NPM_FLAGS=--legacy-peer-deps` is required
(same reason as the local install).

**Persistence:** Netlify functions have an ephemeral filesystem, so in production the store switches
from the local `data.json` to **Netlify Blobs** automatically (`lib/server/db/json-store.ts` checks
`process.env.NETLIFY`). Data lives in the `prohub-db` store under key `data`, auto-seeded from
`seed.ts` on the first request and persisted across deploys/cold starts. No env vars or dashboard
setup needed — Blobs is wired by the Next.js Runtime. Local `npm run dev` is unchanged and still uses
`lib/server/db/data.json`.

The `ref/` design prototype is reference-only and isn't imported by the app, so the Next.js build
never bundles or serves it — it's already excluded from the deployed site.

## Architecture

```
lib/contracts/            Zod schemas = single source of truth (shared by server + client)
  groups.ts               flow/group taxonomy (key + Thai title + accent + icon)
  task.ts  change-request.ts
lib/server/
  db/json-store.ts        ← THE JSON STORE: readDb() reads the file, mutateDb() rewrites it
  db/seed.ts              initial data (built from the prototype's hardcoded tables)
  db/data.json            runtime data file (gitignored; auto-created on first request)
  repositories/           data access, JSON-backed (interface + impl)
  services/               business logic (depends on the repository interface)
  response.ts             standard success/list/error envelope
app/api/tasks|change-requests/route.ts + [id]/route.ts   thin Route Handlers
lib/api/                  typed fetcher + TanStack Query hooks (client)
components/features/      Dashboard (3 tabs), TimelineView, TaskListView, ChangeRequestView, forms
```

### How data is recorded / read (the JSON-file requirement)

- **Read** → `readDb()` in `lib/server/db/json-store.ts` reads `data.json` and returns it; the
  repositories filter/sort/paginate in memory.
- **Record** → `mutateDb(fn)` reads the file, applies the change, and writes it back via a temp-file
  rename. Writes are serialized through a promise chain so concurrent requests can't corrupt the file.

Swapping in a real database later means writing one new repository impl — services, handlers, and the
contracts stay untouched.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/tasks?page&limit&sort&order&search&group&status&priority` | list (read JSON) |
| POST | `/api/tasks` | create (write JSON) |
| GET/PATCH/DELETE | `/api/tasks/[id]` | get / update / soft-delete |
| GET/POST | `/api/change-requests` | list / create |
| GET/PATCH/DELETE | `/api/change-requests/[id]` | get / update / soft-delete |

All responses use the standard envelope; mutations validate with the same Zod schema the forms use.
