import 'server-only';
import { updateChangeRequestSchema } from '@/lib/contracts/change-request';
import { changeRequestService } from '@/lib/server/services/change-request-service';
import { ok, badRequest, notFound, internalError } from '@/lib/server/response';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return badRequest('Invalid id');

  try {
    const cr = await changeRequestService.get(id);
    return cr ? ok(cr) : notFound('Change request not found');
  } catch (err) {
    return internalError(err);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return badRequest('Invalid id');

  const parsed = updateChangeRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest('Validation failed', parsed.error);

  try {
    const cr = await changeRequestService.update(id, parsed.data);
    return cr ? ok(cr) : notFound('Change request not found');
  } catch (err) {
    return internalError(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return badRequest('Invalid id');

  try {
    const removed = await changeRequestService.remove(id);
    if (!removed) return notFound('Change request not found');
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return internalError(err);
  }
}
