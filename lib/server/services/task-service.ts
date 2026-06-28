import 'server-only';
import {
  taskRepository,
  type TaskRepository,
} from '@/lib/server/repositories/task-repository';
import type { CreateTaskInput, UpdateTaskInput, TaskQuery } from '@/lib/contracts/task';

export function createTaskService(repo: TaskRepository = taskRepository) {
  return {
    list: (q: TaskQuery) => repo.findAll(q),
    get: (id: number) => repo.findById(id),
    create: (input: CreateTaskInput) => repo.create(input),
    update: (id: number, input: UpdateTaskInput) => repo.update(id, input),
    remove: (id: number) => repo.softDelete(id),
  };
}

export const taskService = createTaskService();
