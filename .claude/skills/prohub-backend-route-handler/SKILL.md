---
name: prohub-backend-route-handler
description: >
  How to build a server-side feature in ProHub's all-TypeScript Next.js backend: thin Route
  Handlers (app/api/**/route.ts) for the REST contract and Server Actions for mutations, both
  layered handler/action → service → repository, validating with the Zod contract and returning the
  lib/server/response.ts envelope (Route Handlers) or an ActionResult (Server Actions). USE WHEN:
  adding or extending an endpoint, writing a Route Handler, a Server Action, a service, a repository
  (interface + impls), or wiring data access. Trigger on: "add endpoint", "route handler", "server
  action", "CRUD", "repository", "service", "validate", "safeParse", "NextResponse", "app/api",
  "list/create/update/delete products".
---

# ProHub Backend Pattern (Next.js Route Handlers + Server Actions, layered)

Next.js *is* the backend. Dependency-inversion layering, same shape as a classic service
architecture: each layer has one job. Server-only modules live under `lib/server/` and carry
`import 'server-only'` so they can never be pulled into a Client Component bundle.

```
app/api/**/route.ts   (thin handler: parse → validate → call service → envelope)   ← REST contract
app/**/actions.ts     ('use server' action: parse → validate → call service → ActionResult) ← mutations
   │ both depend on
lib/server/services/  (business logic; pure TS, takes plain args, returns domain results)
   │ depends on the INTERFACE
lib/server/repositories/  (interface + impls: in-memory for now, swap a real DB impl later)
```

## Rules (do not violate)
- Handlers/actions are **thin**: parse → validate → call service → respond. No business logic in them.
- **No DB queries in services** — all data access goes through repository interfaces. Services
  depend on the interface, never the concrete impl.
- Validate every input with the **Zod contract** (`schema.safeParse`) — the *same* schema the client
  uses (see `prohub-type-contract`). On failure return `badRequest` with field errors.
- **Never leak a thrown error to the client.** Catch in the handler/action, log internally, return a
  generic message via the envelope / `ActionResult`.
- Route Handlers return the standard envelope via `lib/server/response.ts`. Server Actions return a
  discriminated `ActionResult<T>` (so the calling component can branch without try/catch).
- DB / `jose` / secrets → set `export const runtime = 'nodejs'` in the route (not Edge).
- After changing a contract, run `npx tsc --noEmit` — there is no codegen to run (see
  `prohub-type-contract`).

## Repository (interface + swappable impl)
```typescript
// lib/server/repositories/product-repository.ts
import 'server-only';
import type { Product, CreateProductInput, PaginationQuery } from '@/lib/contracts/product';

export interface ProductRepository {
  findAll(q: PaginationQuery): Promise<{ items: Product[]; total: number }>;
  findById(id: number): Promise<Product | null>;
  create(input: CreateProductInput): Promise<Product>;
  update(id: number, input: Partial<CreateProductInput>): Promise<Product | null>;
  softDelete(id: number): Promise<boolean>;
}

// Swap this implementation (in-memory → Prisma/Drizzle/pg) without touching services or handlers.
export const productRepository: ProductRepository = createInMemoryProductRepository();
```

## Service (business logic, depends on the interface)
```typescript
// lib/server/services/product-service.ts
import 'server-only';
import { productRepository, type ProductRepository } from '@/lib/server/repositories/product-repository';
import type { CreateProductInput, PaginationQuery } from '@/lib/contracts/product';

export function createProductService(repo: ProductRepository = productRepository) {
  return {
    list: (q: PaginationQuery) => repo.findAll(q),
    create: (input: CreateProductInput) => repo.create(input),     // add business rules here
  };
}
export const productService = createProductService();
```

## Route Handler (list + create, with the response envelope)
```typescript
// app/api/products/route.ts
import 'server-only';
import { paginationQuerySchema, createProductSchema } from '@/lib/contracts/product';
import { productService } from '@/lib/server/services/product-service';
import { paginated, created, badRequest, internalError } from '@/lib/server/response';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const parsed = paginationQuerySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsed.success) return badRequest('Invalid query parameters', parsed.error);

  try {
    const { items, total } = await productService.list(parsed.data);
    return paginated(items, total, parsed.data);
  } catch (err) {
    return internalError(err);
  }
}

export async function POST(req: Request) {
  const parsed = createProductSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest('Validation failed', parsed.error);

  try {
    return created(await productService.create(parsed.data));
  } catch (err) {
    return internalError(err);
  }
}
```
Per-item routes go in `app/api/products/[id]/route.ts` exporting `GET`/`PATCH`/`DELETE`, reading
`params.id` (`Number(...)`, 404 via `notFound` helper if missing).

## Server Action (mutation invoked from a form/component)
```typescript
// app/products/actions.ts
'use server';
import { createProductSchema } from '@/lib/contracts/product';
import { productService } from '@/lib/server/services/product-service';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/lib/server/response';

export async function createProductAction(input: unknown): Promise<ActionResult<{ id: number }>> {
  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors };
  }
  try {
    const product = await productService.create(parsed.data);
    revalidatePath('/products');
    return { ok: true, data: { id: product.id } };
  } catch {
    return { ok: false, message: 'Failed to create product' };
  }
}
```
> Use **Route Handlers** for the read/contract surface consumed by TanStack Query hooks; use
> **Server Actions** for form mutations that benefit from `revalidatePath`/`revalidateTag` and
> progressive enhancement. They share the same service + contract, so the rule of "thin → validate →
> service" never changes.

## lib/server/response.ts (the envelope + ActionResult — never return bare data)
```typescript
// lib/server/response.ts
import 'server-only';
import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';
import type { PaginationQuery } from '@/lib/contracts/product';

export const ok = <T>(data: T) =>
  NextResponse.json({ success: true, message: 'OK', data });

export const created = <T>(data: T) =>
  NextResponse.json({ success: true, message: 'Created', data }, { status: 201 });

export const paginated = <T>(data: T[], total: number, q: PaginationQuery) =>
  NextResponse.json({
    success: true, message: 'OK', data,
    pagination: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
  });

export const badRequest = (message: string, error?: ZodError) =>
  NextResponse.json({
    success: false, message,
    errors: error?.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
  }, { status: 400 });

export const unauthorized = (message = 'Unauthorized') =>
  NextResponse.json({ success: false, message }, { status: 401 });
export const forbidden = (message = 'Forbidden') =>
  NextResponse.json({ success: false, message }, { status: 403 });
export const notFound = (message = 'Not found') =>
  NextResponse.json({ success: false, message }, { status: 404 });

export const internalError = (err: unknown) => {
  console.error(err);                                   // log internally, never expose
  return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
};

// Server Actions return this discriminated result instead of an HTTP envelope.
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string[] | undefined> };
```

## Checklist for a new endpoint
1. Zod schemas (request + response) in `lib/contracts/<entity>.ts` (see `prohub-type-contract`).
2. Repository method on the interface + its impl.
3. Service method (pure TS, depends on the interface).
4. Thin Route Handler in `app/api/<entity>/route.ts` (and `[id]/route.ts`) — and/or a Server Action.
5. A TanStack Query hook in `lib/api/<entity>.ts` for the client to consume.
6. `npx tsc --noEmit` to confirm the whole chain type-checks.

## Related skills
- `prohub-type-contract` — the Zod contracts these handlers validate against and the client hooks.
- `prohub-conventions-and-contract` — envelope shape, naming, status codes, pagination params.
- `prohub-auth-architecture` — the middleware / `requireAuth` that protects routes.
