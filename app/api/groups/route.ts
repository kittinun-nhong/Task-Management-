import 'server-only';
import { createGroupSchema } from '@/lib/contracts/groups';
import { groupService } from '@/lib/server/services/group-service';
import { ok, created, badRequest, internalError } from '@/lib/server/response';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return ok(await groupService.list());
  } catch (err) {
    return internalError(err);
  }
}

export async function POST(req: Request) {
  const parsed = createGroupSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest('Validation failed', parsed.error);

  try {
    return created(await groupService.create(parsed.data));
  } catch (err) {
    return internalError(err);
  }
}
