import 'server-only';
import {
  changeRequestRepository,
  type ChangeRequestRepository,
} from '@/lib/server/repositories/change-request-repository';
import type {
  CreateChangeRequestInput,
  UpdateChangeRequestInput,
  ChangeRequestQuery,
} from '@/lib/contracts/change-request';

export function createChangeRequestService(
  repo: ChangeRequestRepository = changeRequestRepository,
) {
  return {
    list: (q: ChangeRequestQuery) => repo.findAll(q),
    get: (id: number) => repo.findById(id),
    create: (input: CreateChangeRequestInput) => repo.create(input),
    update: (id: number, input: UpdateChangeRequestInput) => repo.update(id, input),
    remove: (id: number) => repo.softDelete(id),
  };
}

export const changeRequestService = createChangeRequestService();
