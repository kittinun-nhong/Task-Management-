import 'server-only';
import {
  groupRepository,
  type GroupRepository,
} from '@/lib/server/repositories/group-repository';
import type { CreateGroupInput, UpdateGroupInput } from '@/lib/contracts/groups';

export function createGroupService(repo: GroupRepository = groupRepository) {
  return {
    list: () => repo.findAll(),
    get: (id: number) => repo.findById(id),
    create: (input: CreateGroupInput) => repo.create(input),
    update: (id: number, input: UpdateGroupInput) => repo.update(id, input),
    remove: (id: number) => repo.softDelete(id),
  };
}

export const groupService = createGroupService();
