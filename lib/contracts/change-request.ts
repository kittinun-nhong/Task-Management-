import { z } from 'zod';
import { groupKeySchema } from './groups';

/** Change-request status keys. */
export const CR_STATUSES = ['done', 'prog', 'open', 'block'] as const;
export const crStatusSchema = z.enum(CR_STATUSES);
export type CrStatus = z.infer<typeof crStatusSchema>;

/** Preset ช่วงเวลา (period) options — kept only to migrate legacy `period` labels to dates. */
export const CR_PERIODS = ['ไม่ระบุ', 'มิ.ย.', 'ก.ค. w1', 'ก.ค. w2', 'ก.ค. w3', 'ก.ค. w4', 'ส.ค. w1', 'ส.ค. w2'] as const;

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันที่ไม่ถูกต้อง');

/** Response shape the API returns. */
export const changeRequestSchema = z.object({
  id: z.number().int().positive(),
  code: z.string(),
  title: z.string(),
  desc: z.string(),
  flow: groupKeySchema,
  status: crStatusSchema,
  /** ช่วงเวลา start/end dates (`YYYY-MM-DD`) — same range model as tasks. */
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  /** @deprecated legacy preset period label — kept for back-compat / migration. */
  period: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().optional(),
});
export type ChangeRequest = z.infer<typeof changeRequestSchema>;

const endNotBeforeStart = (d: { startDate?: string | null; endDate?: string | null }) =>
  !d.startDate || !d.endDate || d.endDate >= d.startDate;
const rangeError = { message: 'วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น', path: ['endDate'] };

const crMutableFields = z.object({
  title: z.string().min(1, 'กรุณาระบุหัวข้อ').max(200),
  desc: z.string().min(1, 'กรุณาระบุรายละเอียด'),
  flow: groupKeySchema,
  status: crStatusSchema.default('open'),
  // Optional so a CR can be left without a date range (renders as "—").
  startDate: isoDateSchema.nullable().optional(),
  endDate: isoDateSchema.nullable().optional(),
});

/** Create request — the ONE schema validated on the server AND resolved by the form. */
export const createChangeRequestSchema = crMutableFields.refine(endNotBeforeStart, rangeError);
export type CreateChangeRequestInput = z.infer<typeof createChangeRequestSchema>;

/** Update — derived, every field optional, same range rule when both are present. */
export const updateChangeRequestSchema = crMutableFields.partial().refine(endNotBeforeStart, rangeError);
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
