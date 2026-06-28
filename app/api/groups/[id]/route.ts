import 'server-only';
import { groupService } from '@/lib/server/services/group-service';
import { badRequest, notFound, internalError } from '@/lib/server/response';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return badRequest('Invalid id');

  try {
    const removed = await groupService.remove(id);
    if (!removed) return notFound('Group not found');
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return internalError(err);
  }
}
