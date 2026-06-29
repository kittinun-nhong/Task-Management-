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

/** `YYYY-MM-DD` calendar date (the ช่วงเวลา is now a real start–end range). */
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันที่ไม่ถูกต้อง');

/** Response shape the API returns (what the client renders). */
export const taskSchema = z.object({
  id: z.number().int().positive(),
  code: z.string(),
  title: z.string(),
  desc: z.string().optional(),
  group: groupKeySchema,
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  /** ช่วงเวลา — start/end of the task. Null = not scheduled (hidden from the timeline). */
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  owner: z.string(),
  /** @deprecated legacy preset period / fixed timeline column — kept for back-compat. */
  period: z.string().optional(),
  week: z.number().int().min(1).max(7).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().optional(),
});
export type Task = z.infer<typeof taskSchema>;

/** Mutable fields shared by create + update (so the date-range rule lives in one place). */
const taskMutableFields = z.object({
  title: z.string().min(1, 'กรุณาระบุชื่องาน').max(200),
  desc: z.string().min(1, 'กรุณาระบุรายละเอียด'),
  group: groupKeySchema,
  status: taskStatusSchema.default('pend'),
  priority: taskPrioritySchema.default('med'),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  owner: z.string().min(1).default('PMO Team'),
});

const endNotBeforeStart = (d: { startDate?: string; endDate?: string }) =>
  !d.startDate || !d.endDate || d.endDate >= d.startDate;
const rangeError = { message: 'วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น', path: ['endDate'] };

/** Create request — the ONE schema the Route Handler validates AND the form resolves. */
export const createTaskSchema = taskMutableFields.refine(endNotBeforeStart, rangeError);
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

/** Update — derived, every field optional, same range rule when both are present. */
export const updateTaskSchema = taskMutableFields.partial().refine(endNotBeforeStart, rangeError);
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
