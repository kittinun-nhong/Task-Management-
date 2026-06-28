import 'server-only';
import {
  changeRequestQuerySchema,
  createChangeRequestSchema,
} from '@/lib/contracts/change-request';
import { changeRequestService } from '@/lib/server/services/change-request-service';
import { paginated, created, badRequest, internalError } from '@/lib/server/response';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const parsed = changeRequestQuerySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsed.success) return badRequest('Invalid query parameters', parsed.error);

  try {
    const { items, total } = await changeRequestService.list(parsed.data);
    return paginated(items, total, parsed.data);
  } catch (err) {
    return internalError(err);
  }
}

export async function POST(req: Request) {
  const parsed = createChangeRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest('Validation failed', parsed.error);

  try {
    return created(await changeRequestService.create(parsed.data));
  } catch (err) {
    return internalError(err);
  }
}
