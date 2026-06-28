'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiFetchPaged, toQuery } from '@/lib/api/client';
import type {
  ChangeRequest,
  CreateChangeRequestInput,
  UpdateChangeRequestInput,
  ChangeRequestQuery,
} from '@/lib/contracts/change-request';

export const crKeys = {
  all: ['change-requests'] as const,
  list: (q: Partial<ChangeRequestQuery>) => ['change-requests', 'list', q] as const,
};

export function useGetChangeRequests(q: Partial<ChangeRequestQuery> = {}) {
  return useQuery({
    queryKey: crKeys.list(q),
    queryFn: () => apiFetchPaged<ChangeRequest>(`/change-requests${toQuery(q)}`),
    placeholderData: (prev) => prev,
  });
}

export function useCreateChangeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateChangeRequestInput) =>
      apiFetch<ChangeRequest>('/change-requests', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: crKeys.all }),
  });
}

export function useUpdateChangeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateChangeRequestInput }) =>
      apiFetch<ChangeRequest>(`/change-requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: crKeys.all }),
  });
}

export function useDeleteChangeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/change-requests/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: crKeys.all }),
  });
}
