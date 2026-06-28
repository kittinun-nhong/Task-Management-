import 'server-only';
import { taskQuerySchema, createTaskSchema } from '@/lib/contracts/task';
import { taskService } from '@/lib/server/services/task-service';
import { paginated, created, badRequest, internalError } from '@/lib/server/response';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const parsed = taskQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return badRequest('Invalid query parameters', parsed.error);

  try {
    const { items, total } = await taskService.list(parsed.data);
    return paginated(items, total, parsed.data);
  } catch (err) {
    return internalError(err);
  }
}

export async function POST(req: Request) {
  const parsed = createTaskSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest('Validation failed', parsed.error);

  try {
    return created(await taskService.create(parsed.data));
  } catch (err) {
    return internalError(err);
  }
}
