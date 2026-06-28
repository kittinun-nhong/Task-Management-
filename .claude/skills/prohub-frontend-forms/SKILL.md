---
name: prohub-frontend-forms
description: >
  How to build a create/edit form in ProHub's frontend: import the Zod schema from the contract
  (lib/contracts/<entity>.ts — the SAME schema the server validates), wire it to react-hook-form via
  zodResolver, submit through a TanStack Query mutation hook (or a Server Action), with
  notifications.show toasts. USE WHEN: building a form, validating user input, create/update flows,
  modals with inputs. Trigger on: "form", "zod", "react-hook-form", "zodResolver", "schema",
  "validation", "create product", "edit", "useCreateProduct", "server action", "notifications.show".
---

# ProHub Frontend Forms (Zod + react-hook-form)

Forms use `react-hook-form` + `@hookform/resolvers/zod` — **never uncontrolled, unvalidated
inputs**. The Zod schema is **imported from the contract** (`lib/contracts/<entity>.ts`) — the exact
same object the Route Handler / Server Action validates with — so the form can never silently drift
from the API. There is no separate `src/schemas/` folder and no `satisfies z.ZodType<...>` dance:
the schema *is* the contract, so it is correct by construction.

## Import the contract schema (do not re-declare it)
```typescript
// lib/contracts/product.ts  (already the source of truth — see prohub-type-contract)
export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  sku: z.string().min(1, 'SKU is required').regex(/^[A-Z0-9-]+$/, 'SKU must be uppercase alphanumeric'),
  price: z.coerce.number().positive('Price must be positive'),
  stock: z.coerce.number().int().nonnegative(),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;
```
> Use `z.coerce.number()` for numeric inputs and `.nonnegative()` for non-negative integers. The
> form below imports `createProductSchema` directly — one schema, validated identically on both sides.

## Form component (mutation via TanStack Query hook)
```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, NumberInput, Stack, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useCreateProduct } from '@/lib/api/products';
import { createProductSchema, type CreateProductInput } from '@/lib/contracts/product';

export function CreateProductForm({ onDone }: { onDone?: () => void }) {
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } =
    useForm<CreateProductInput>({ resolver: zodResolver(createProductSchema) });

  const { mutateAsync } = useCreateProduct();   // invalidates the products query on success (see hook)

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutateAsync(values);
      notifications.show({ message: 'Product created', color: 'green' });
      onDone?.();
    } catch {
      notifications.show({ message: 'Failed to create product', color: 'red' });
    }
  });

  return (
    <form onSubmit={onSubmit}>
      <Stack>
        <TextInput label="Name" error={errors.name?.message} {...register('name')} />
        <TextInput label="SKU" error={errors.sku?.message} {...register('sku')} />
        <NumberInput label="Price" error={errors.price?.message}
          onChange={(v) => setValue('price', Number(v))} />
        <NumberInput label="Stock" error={errors.stock?.message}
          onChange={(v) => setValue('stock', Number(v))} />
        <Button type="submit" loading={isSubmitting}>Save</Button>
      </Stack>
    </form>
  );
}
```

## Alternative: submit through a Server Action
For progressive enhancement and `revalidatePath`, submit to a Server Action instead of a query hook.
The action validates with the *same* `createProductSchema` and returns an `ActionResult`
(see `prohub-backend-route-handler`); branch on `result.ok` and map `result.fieldErrors` back onto
the form with `setError`:
```tsx
const result = await createProductAction(values);
if (!result.ok) {
  Object.entries(result.fieldErrors ?? {}).forEach(([field, msgs]) =>
    setError(field as keyof CreateProductInput, { message: msgs?.[0] }));
  notifications.show({ message: result.message, color: 'red' });
  return;
}
notifications.show({ message: 'Product created', color: 'green' });
```

## Rules
- Schema is **imported from `@/lib/contracts/*`**, never re-declared in the component.
- Resolve with `zodResolver`; surface `errors.<field>.message` on each input.
- Submit through the generated-by-hand TanStack Query mutation hook **or** a Server Action; either
  way invalidate the relevant query / `revalidatePath` on success.
- Toasts via `notifications.show` (success green / error red). Never expose raw API errors.
- Mantine controlled numeric/select inputs use `setValue`/`Controller`, not bare `register`.

## Related skills
- `prohub-type-contract` — the contract schema + mutation hook used here.
- `prohub-frontend-datatable` — the list page that refetches after a successful submit.
- `prohub-backend-route-handler` — the Route Handler / Server Action that validates with the same schema.
