---
name: prohub-frontend-datatable
description: >
  How to build a paginated list page in ProHub's frontend using mantine-datatable wired to a
  TanStack Query hook from lib/api/<entity>.ts (typed from the Zod contract — no codegen). USE WHEN:
  creating or editing a dashboard list/index page, a products/orders/etc. table, server-side
  pagination, search, or sorting. Trigger on: "datatable", "list page", "table", "pagination",
  "search box", "sortable columns", "useGetProducts", "mantine-datatable", "records per page".
---

# ProHub Frontend DataTable Page

A list page is a `'use client'` component that drives a TanStack Query hook (from
`lib/api/<entity>.ts`, see `prohub-type-contract`) with `page` / `limit` / `search` / `sort` /
`order` state and renders `mantine-datatable`. The row type comes from the **contract**
(`@/lib/contracts/*`), never hand-written.

## Required wiring (always)
- `fetching` ← the hook's `isFetching`
- `totalRecords` ← `data?.pagination?.total ?? 0`
- `page` / `onPageChange`, `recordsPerPage` / `onRecordsPerPageChange`
- Search debounced with `useDebouncedValue` from `@mantine/hooks` at **300ms**
- Records come from `data?.data ?? []` (the fetch client unwraps the envelope to its payload)
- Reset `page` to 1 when `limit` or `search` changes

## Template
```tsx
// app/dashboard/products/page.tsx
'use client';

import { useState } from 'react';
import { DataTable, type DataTableSortStatus } from 'mantine-datatable';
import { Button, Group, TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useGetProducts } from '@/lib/api/products';
import type { Product } from '@/lib/contracts/product';

const PAGE_SIZES = [10, 20, 50];

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Product>>({
    columnAccessor: 'createdAt',
    direction: 'desc',
  });
  const [debouncedSearch] = useDebouncedValue(search, 300);

  const { data, isFetching } = useGetProducts({
    page,
    limit,
    search: debouncedSearch,
    sort: String(sortStatus.columnAccessor),
    order: sortStatus.direction,
  });

  return (
    <>
      <Group justify="space-between" mb="md">
        <TextInput
          placeholder="Search..."
          value={search}
          onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
        />
        <Button>Add Product</Button>
      </Group>

      <DataTable<Product>
        withTableBorder
        highlightOnHover
        records={data?.data ?? []}
        totalRecords={data?.pagination?.total ?? 0}
        recordsPerPage={limit}
        page={page}
        onPageChange={setPage}
        recordsPerPageOptions={PAGE_SIZES}
        onRecordsPerPageChange={(size) => { setLimit(size); setPage(1); }}
        fetching={isFetching}
        sortStatus={sortStatus}
        onSortStatusChange={setSortStatus}
        columns={[
          { accessor: 'id', title: 'ID', sortable: true, width: 80 },
          { accessor: 'name', title: 'Name', sortable: true },
          { accessor: 'sku', title: 'SKU' },
          {
            accessor: 'createdAt',
            title: 'Created',
            sortable: true,
            render: ({ createdAt }) => new Date(createdAt).toLocaleDateString(),
          },
        ]}
      />
    </>
  );
}
```

## Notes
- The page holds interactive state, so it is `'use client'`. Keep the boundary tight: a Server
  Component route can render this client table while doing its own server work around it.
- Do not re-declare the row type; import it from `@/lib/contracts/*`. The hook in `lib/api/*` is
  thin and typed from the same contract (see `prohub-type-contract`).
- The query-param names (`page`, `limit`, `sort`, `order`, `search`) match the backend pagination
  contract — see `prohub-conventions-and-contract`.
- For a server-rendered first page you may instead call the **service** directly in a Server
  Component and hydrate TanStack Query; for interactive tables the client hook above is the default.

## Related skills
- `prohub-type-contract` — the TanStack Query hook and contract types used here.
- `prohub-frontend-forms` — the create/edit form behind the "Add" button.
- `prohub-conventions-and-contract` — pagination query params and envelope shape.
