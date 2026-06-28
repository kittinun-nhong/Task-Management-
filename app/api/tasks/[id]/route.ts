import 'server-only';
import { updateTaskSchema } from '@/lib/contracts/task';
import { taskService } from '@/lib/server/services/task-service';
import { ok, badRequest, notFound, internalError } from '@/lib/server/response';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return badRequest('Invalid id');

  try {
    const task = await taskService.get(id);
    return task ? ok(task) : notFound('Task not found');
  } catch (err) {
    return internalError(err);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return badRequest('Invalid id');

  const parsed = updateTaskSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest('Validation failed', parsed.error);

  try {
    const task = await taskService.update(id, parsed.data);
    return task ? ok(task) : notFound('Task not found');
  } catch (err) {
    return internalError(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return badRequest('Invalid id');

  try {
    const removed = await taskService.remove(id);
    if (!removed) return notFound('Task not found');
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return internalError(err);
  }
}
