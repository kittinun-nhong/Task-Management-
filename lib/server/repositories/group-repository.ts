import 'server-only';
import type { Group, CreateGroupInput, UpdateGroupInput } from '@/lib/contracts/groups';
import { readDb, mutateDb } from '@/lib/server/db/json-store';

export interface GroupRepository {
  findAll(): Promise<Group[]>;
  findById(id: number): Promise<Group | null>;
  create(input: CreateGroupInput): Promise<Group>;
  update(id: number, input: UpdateGroupInput): Promise<Group | null>;
  softDelete(id: number): Promise<boolean>;
}

/** JSON-file-backed implementation. Reads come from the file; writes rewrite the file. */
function createJsonGroupRepository(): GroupRepository {
  return {
    async findAll() {
      const db = await readDb();
      return db.groups.filter((g) => !g.deletedAt).sort((a, b) => a.order - b.order);
    },

    async findById(id) {
      const db = await readDb();
      return db.groups.find((g) => g.id === id && !g.deletedAt) ?? null;
    },

    create(input) {
      return mutateDb((db) => {
        const id = db.counters.group + 1;
        db.counters.group = id;
        const now = new Date().toISOString();
        const group: Group = {
          id,
          key: `g-${id}`,
          title: input.title,
          accent: input.accent,
          icon: input.icon,
          order: db.groups.length,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        db.groups.push(group);
        return group;
      });
    },

    update(id, input) {
      return mutateDb((db) => {
        const group = db.groups.find((g) => g.id === id && !g.deletedAt);
        if (!group) return null;
        Object.assign(group, input, { updatedAt: new Date().toISOString() });
        return group;
      });
    },

    softDelete(id) {
      return mutateDb((db) => {
        const group = db.groups.find((g) => g.id === id && !g.deletedAt);
        if (!group) return false;
        group.deletedAt = new Date().toISOString();
        group.updatedAt = group.deletedAt;
        return true;
      });
    },
  };
}

export const groupRepository: GroupRepository = createJsonGroupRepository();
