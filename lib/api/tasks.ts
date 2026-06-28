'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiFetchPaged, toQuery, type Paged } from '@/lib/api/client';
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskQuery,
} from '@/lib/contracts/task';

export const taskKeys = {
  all: ['tasks'] as const,
  list: (q: Partial<TaskQuery>) => ['tasks', 'list', q] as const,
};

export function useGetTasks(q: Partial<TaskQuery>) {
  return useQuery({
    queryKey: taskKeys.list(q),
    queryFn: () => apiFetchPaged<Task>(`/tasks${toQuery(q)}`),
    placeholderData: (prev) => prev,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaskInput) =>
      apiFetch<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTaskInput }) =>
      apiFetch<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export type { Paged };
