---
name: prohub-type-contract
description: >
  The end-to-end type-safety contract that is the spine of ProHub: a single Zod schema per shape
  in lib/contracts/ is the source of truth, types are derived with z.infer, and the SAME schema
  validates on the server (Route Handlers / Server Actions) and drives the client (react-hook-form
  + TanStack Query). There is NO codegen (no swaggo, no orval) — both sides are TypeScript, so the
  schema is shared by import. USE WHEN: defining a new entity's request/response shapes, wiring a
  typed fetch client, writing TanStack Query hooks, or deciding where a type lives. Trigger on:
  "contract", "Zod schema", "shared types", "type safety", "z.infer", "fetcher", "query hook",
  "TanStack Query", "types out of sync", "single source of truth".
---

# ProHub Type Contract (Zod as the single source of truth)

This is the central architecture. **Types flow one direction and are never hand-duplicated.**
Because the server and client are both TypeScript, there is no OpenAPI / orval / swaggo step — the
Zod schema *is* the contract and is imported by both sides.

```
lib/contracts/<entity>.ts          # Zod schemas (request + response) — the single source of truth
        │  z.infer<typeof schema>
        ├──────────────► SERVER  app/api/**/route.ts + app/**/actions.ts
        │                        parse & validate with schema.safeParse(input)
        └──────────────► CLIENT  react-hook-form zodResolver(schema)  +  TanStack Query hooks
                                 import type { Product } from '@/lib/contracts/product'
```

## Iron rules
- **The Zod schema is the only place a shape is declared.** Everything else uses `z.infer`.
- **Never hand-write a TS `interface`/`type` that mirrors a contract** — import it from
  `@/lib/contracts/*`.
- **The server validation schema and the client form schema are the same object.** If the client
  form needs the schema, it imports it; it does not re-declare fields.
- **Never put `'server-only'` imports in a contract file.** Contracts are shared by both runtimes,
  so they must contain *only* Zod + pure types — no DB, no `jose`, no `process.env` secrets.
- Request schemas live next to the response schema for the same entity; derive create/update
  variants with `.omit`/`.partial`/`.pick` instead of re-declaring.

## A contract file
```typescript
// lib/contracts/product.ts
import { z } from 'zod';

// Response shape the API returns (what the client renders).
export const productSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  sku: z.string(),
  price: z.number(),
  stock: z.number().int(),
  createdAt: z.string(),          // ISO 8601 over the wire
  updatedAt: z.string(),
});
export type Product = z.infer<typeof productSchema>;

// Create request — the ONE schema the Route Handler validates AND the form resolves.
export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  sku: z.string().min(1, 'SKU is required').regex(/^[A-Z0-9-]+$/, 'SKU must be uppercase alphanumeric'),
  price: z.coerce.number().positive('Price must be positive'),
  stock: z.coerce.number().int().nonnegative(),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

// Update — derived, never re-declared.
export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// Shared pagination contract (reuse across every list endpoint).
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
```

## The typed fetch client — `lib/api/client.ts`
One fetch wrapper is the single place where the access token is injected, the 401 is handled, and
the response **envelope is unwrapped**, so callers receive the payload directly (mirrors the old
orval mutator's job, but hand-written and fully typed).

```typescript
// lib/api/client.ts   (client-side fetcher)
import { useAuthStore } from '@/stores/authStore';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

type Envelope<T> =
  | { success: true; message: string; data: T; pagination?: Pagination }
  | { success: false; message: string; errors?: { field: string; message: string }[] };

export interface Pagination { page: number; limit: number; total: number; totalPages: number; }
export interface Paged<T> { data: T[]; pagination: Pagination; }

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (res.status === 401) useAuthStore.getState().logout();        // silent-refresh hook: see prohub-auth-architecture
  const body = (await res.json()) as Envelope<T>;
  if (!body.success) throw new ApiError(body.message, 'errors' in body ? body.errors : undefined);
  return body.data;
}

export class ApiError extends Error {
  constructor(message: string, public fieldErrors?: { field: string; message: string }[]) {
    super(message);
  }
}
```

## TanStack Query hooks — `lib/api/<entity>.ts` (thin, typed from the contract)
With no codegen, hooks are hand-written but trivial: a typed `apiFetch` call plus a stable query
key. Types come from the **contract**, never re-declared here.

```typescript
// lib/api/products.ts
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, type Paged } from '@/lib/api/client';
import type { Product, CreateProductInput, PaginationQuery } from '@/lib/contracts/product';

export const productKeys = {
  all: ['products'] as const,
  list: (q: Partial<PaginationQuery>) => ['products', 'list', q] as const,
};

export function useGetProducts(q: Partial<PaginationQuery>) {
  const params = new URLSearchParams(
    Object.entries(q).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
  );
  return useQuery({
    queryKey: productKeys.list(q),
    queryFn: () => apiFetch<Paged<Product>>(`/products?${params}`),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductInput) =>
      apiFetch<Product>('/products', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
}
```

> Wrap the app in a `<QueryClientProvider>` (a `'use client'` `Providers` component rendered in
> `app/layout.tsx`). Server Component pages that fetch directly call the **service layer**, not
> these client hooks — see `prohub-backend-route-handler`.

## What replaces "regenerate types"
Nothing to run — changing `lib/contracts/<entity>.ts` instantly updates every consumer because
they `import` from it. TypeScript (`npx tsc --noEmit`) is the verification step that used to be
"types out of sync": if a Route Handler, an action, a hook, or a form drifts from the contract, the
build fails. Run `npm run build` / `npx tsc --noEmit` after editing a contract.

## Related skills
- `prohub-backend-route-handler` — the Route Handlers / Server Actions that validate with these schemas.
- `prohub-frontend-datatable` / `prohub-frontend-forms` — consume these hooks and schemas.
- `prohub-conventions-and-contract` — the response envelope these types describe.
