'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { Group, CreateGroupInput } from '@/lib/contracts/groups';

export const groupKeys = {
  all: ['groups'] as const,
  list: () => ['groups', 'list'] as const,
};

export function useGetGroups() {
  return useQuery({
    queryKey: groupKeys.list(),
    queryFn: () => apiFetch<Group[]>('/groups'),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGroupInput) =>
      apiFetch<Group>('/groups', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: groupKeys.all }),
  });
}
