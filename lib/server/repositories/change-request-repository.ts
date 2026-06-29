import 'server-only';
import type {
  ChangeRequest,
  CreateChangeRequestInput,
  UpdateChangeRequestInput,
  ChangeRequestQuery,
} from '@/lib/contracts/change-request';
import { readDb, mutateDb } from '@/lib/server/db/json-store';

export interface ChangeRequestRepository {
  findAll(q: ChangeRequestQuery): Promise<{ items: ChangeRequest[]; total: number }>;
  findById(id: number): Promise<ChangeRequest | null>;
  create(input: CreateChangeRequestInput): Promise<ChangeRequest>;
  update(id: number, input: UpdateChangeRequestInput): Promise<ChangeRequest | null>;
  softDelete(id: number): Promise<boolean>;
}

function nextCode(existing: ChangeRequest[]): string {
  let max = 0;
  for (const cr of existing) {
    const m = cr.code.match(/^CR-(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `CR-${String(max + 1).padStart(3, '0')}`;
}

/** JSON-file-backed implementation. Reads come from the file; writes rewrite the file. */
function createJsonChangeRequestRepository(): ChangeRequestRepository {
  return {
    async findAll(q) {
      const db = await readDb();
      let items = db.changeRequests.filter((c) => !c.deletedAt);

      if (q.flow) items = items.filter((c) => c.flow === q.flow);
      if (q.search) {
        const s = q.search.toLowerCase();
        items = items.filter(
          (c) =>
            c.title.toLowerCase().includes(s) ||
            c.code.toLowerCase().includes(s) ||
            c.desc.toLowerCase().includes(s),
        );
      }

      const dir = q.order === 'asc' ? 1 : -1;
      items.sort((a, b) => {
        const av = (a as unknown as Record<string, unknown>)[q.sort];
        const bv = (b as unknown as Record<string, unknown>)[q.sort];
        return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
      });

      const total = items.length;
      const start = (q.page - 1) * q.limit;
      return { items: items.slice(start, start + q.limit), total };
    },

    async findById(id) {
      const db = await readDb();
      return db.changeRequests.find((c) => c.id === id && !c.deletedAt) ?? null;
    },

    create(input) {
      return mutateDb((db) => {
        const id = db.counters.changeRequest + 1;
        db.counters.changeRequest = id;
        const now = new Date().toISOString();
        const cr: ChangeRequest = {
          id,
          code: nextCode(db.changeRequests),
          title: input.title,
          desc: input.desc,
          flow: input.flow,
          status: input.status ?? 'open',
          startDate: input.startDate ?? null,
          endDate: input.endDate ?? null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        db.changeRequests.push(cr);
        return cr;
      });
    },

    update(id, input) {
      return mutateDb((db) => {
        const cr = db.changeRequests.find((c) => c.id === id && !c.deletedAt);
        if (!cr) return null;
        Object.assign(cr, input, { updatedAt: new Date().toISOString() });
        return cr;
      });
    },

    softDelete(id) {
      return mutateDb((db) => {
        const cr = db.changeRequests.find((c) => c.id === id && !c.deletedAt);
        if (!cr) return false;
        cr.deletedAt = new Date().toISOString();
        cr.updatedAt = cr.deletedAt;
        return true;
      });
    },
  };
}

export const changeRequestRepository: ChangeRequestRepository =
  createJsonChangeRequestRepository();
