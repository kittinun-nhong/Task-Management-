import { z } from 'zod';
import { groupKeySchema } from './groups';

/** Change-request status keys. */
export const CR_STATUSES = ['done', 'prog', 'open', 'block'] as const;
export const crStatusSchema = z.enum(CR_STATUSES);
export type CrStatus = z.infer<typeof crStatusSchema>;

/** Preset ช่วงเวลา (period) options — shared by the add/edit form and inline editing. */
export const CR_PERIODS = ['ไม่ระบุ', 'มิ.ย.', 'ก.ค. w1', 'ก.ค. w2', 'ก.ค. w3', 'ก.ค. w4', 'ส.ค. w1', 'ส.ค. w2'] as const;

/** Response shape the API returns. */
export const changeRequestSchema = z.object({
  id: z.number().int().positive(),
  code: z.string(),
  title: z.string(),
  desc: z.string(),
  flow: groupKeySchema,
  status: crStatusSchema,
  period: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().optional(),
});
export type ChangeRequest = z.infer<typeof changeRequestSchema>;

/** Create request — the ONE schema validated on the server AND resolved by the form. */
export const createChangeRequestSchema = z.object({
  title: z.string().min(1, 'กรุณาระบุหัวข้อ').max(200),
  desc: z.string().min(1, 'กรุณาระบุรายละเอียด'),
  flow: groupKeySchema,
  status: crStatusSchema.default('open'),
  period: z.string().min(1, 'กรุณาระบุช่วงเวลา').default('ไม่ระบุ'),
});
export type CreateChangeRequestInput = z.infer<typeof createChangeRequestSchema>;

/** Update — derived. */
export const updateChangeRequestSchema = createChangeRequestSchema.partial();
export type UpdateChangeRequestInput = z.infer<typeof updateChangeRequestSchema>;

/** Query / pagination contract for the change-request list endpoint. */
export const changeRequestQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(100),
  sort: z.string().default('createdAt'),
  order: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().optional(),
  flow: groupKeySchema.optional(),
});
export type ChangeRequestQuery = z.infer<typeof changeRequestQuerySchema>;
