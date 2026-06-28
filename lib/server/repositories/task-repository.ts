import 'server-only';
import type { Task, CreateTaskInput, UpdateTaskInput, TaskQuery } from '@/lib/contracts/task';
import { readDb, mutateDb } from '@/lib/server/db/json-store';

export interface TaskRepository {
  findAll(q: TaskQuery): Promise<{ items: Task[]; total: number }>;
  findById(id: number): Promise<Task | null>;
  create(input: CreateTaskInput): Promise<Task>;
  update(id: number, input: UpdateTaskInput): Promise<Task | null>;
  softDelete(id: number): Promise<boolean>;
}

const PRIORITY_RANK: Record<string, number> = { high: 0, med: 1, low: 2 };

/** Single auto-increment code sequence shared by every task: FC-001, FC-002, … */
function formatCode(id: number): string {
  return `FC-${String(id).padStart(3, '0')}`;
}

function compare(a: Task, b: Task, sort: string, order: 'asc' | 'desc'): number {
  const dir = order === 'asc' ? 1 : -1;
  if (sort === 'priority') {
    return (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) * dir;
  }
  const av = (a as unknown as Record<string, unknown>)[sort];
  const bv = (b as unknown as Record<string, unknown>)[sort];
  if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
  return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
}

/** JSON-file-backed implementation. Reads come from the file; writes rewrite the file. */
function createJsonTaskRepository(): TaskRepository {
  return {
    async findAll(q) {
      const db = await readDb();
      let items = db.tasks.filter((t) => !t.deletedAt);

      if (q.group) items = items.filter((t) => t.group === q.group);
      if (q.status) items = items.filter((t) => t.status === q.status);
      if (q.priority) items = items.filter((t) => t.priority === q.priority);
      if (q.search) {
        const s = q.search.toLowerCase();
        items = items.filter(
          (t) => t.title.toLowerCase().includes(s) || t.code.toLowerCase().includes(s),
        );
      }

      items.sort((a, b) => compare(a, b, q.sort, q.order));

      const total = items.length;
      const start = (q.page - 1) * q.limit;
      return { items: items.slice(start, start + q.limit), total };
    },

    async findById(id) {
      const db = await readDb();
      return db.tasks.find((t) => t.id === id && !t.deletedAt) ?? null;
    },

    create(input) {
      return mutateDb((db) => {
        const id = db.counters.task + 1;
        db.counters.task = id;
        const now = new Date().toISOString();
        const task: Task = {
          id,
          code: formatCode(id),
          title: input.title,
          group: input.group,
          status: input.status ?? 'pend',
          priority: input.priority ?? 'med',
          period: input.period,
          owner: input.owner ?? 'PMO Team',
          week: input.week ?? null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        db.tasks.push(task);
        return task;
      });
    },

    update(id, input) {
      return mutateDb((db) => {
        const task = db.tasks.find((t) => t.id === id && !t.deletedAt);
        if (!task) return null;
        Object.assign(task, input, { updatedAt: new Date().toISOString() });
        return task;
      });
    },

    softDelete(id) {
      return mutateDb((db) => {
        const task = db.tasks.find((t) => t.id === id && !t.deletedAt);
        if (!task) return false;
        task.deletedAt = new Date().toISOString();
        task.updatedAt = task.deletedAt;
        return true;
      });
    },
  };
}

export const taskRepository: TaskRepository = createJsonTaskRepository();
