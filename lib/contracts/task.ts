import { z } from 'zod';
import { groupKeySchema } from './groups';

/** Task status keys (match the Thai status palette in the design). */
export const TASK_STATUSES = ['done', 'prog', 'review', 'pend', 'cancel'] as const;
export const taskStatusSchema = z.enum(TASK_STATUSES);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

/** Priority keys. */
export const TASK_PRIORITIES = ['high', 'med', 'low'] as const;
export const taskPrioritySchema = z.enum(TASK_PRIORITIES);
export type TaskPriority = z.infer<typeof taskPrioritySchema>;

/** Response shape the API returns (what the client renders). */
export const taskSchema = z.object({
  id: z.number().int().positive(),
  code: z.string(),
  title: z.string(),
  group: groupKeySchema,
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  period: z.string(),
  owner: z.string(),
  /** Timeline column 1..7 (optional — only set for items shown on the board). */
  week: z.number().int().min(1).max(7).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().optional(),
});
export type Task = z.infer<typeof taskSchema>;

/** Create request — the ONE schema the Route Handler validates AND the form resolves. */
export const createTaskSchema = z.object({
  title: z.string().min(1, 'กรุณาระบุชื่องาน').max(200),
  group: groupKeySchema,
  status: taskStatusSchema.default('pend'),
  priority: taskPrioritySchema.default('med'),
  period: z.string().min(1, 'กรุณาระบุช่วงเวลา'),
  owner: z.string().min(1).default('PMO Team'),
  week: z.coerce.number().int().min(1).max(7).nullable().optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

/** Update — derived, never re-declared. */
export const updateTaskSchema = createTaskSchema.partial();
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

/** Shared pagination + filter contract for the task list endpoint. */
export const taskQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  group: groupKeySchema.optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
});
export type TaskQuery = z.infer<typeof taskQuerySchema>;
