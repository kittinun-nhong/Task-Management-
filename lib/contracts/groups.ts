import { z } from 'zod';

/**
 * Flow / group taxonomy — shared by tasks and change requests.
 * Pure data (key + Thai label + accent colour + icon path); safe on both runtimes.
 */
export const GROUP_KEYS = [
  'foundation',
  'po',
  'other',
  'transfer',
  'job',
  'shipment',
  'cycle',
  'writeoff',
] as const;

/**
 * A group key. Was a fixed `z.enum` of GROUP_KEYS; now a string so users can add new sections.
 * GROUP_KEYS / GROUPS / GROUP_LIST below remain the seed defaults for the built-in 8 sections.
 */
export const groupKeySchema = z.string().min(1);
export type GroupKey = z.infer<typeof groupKeySchema>;

export interface GroupMeta {
  key: GroupKey;
  /** Full Thai title, e.g. "รากฐานระบบ (Foundation)" */
  title: string;
  accent: string;
  /** SVG path `d` for the group icon */
  icon: string;
}

export const GROUPS: Record<GroupKey, GroupMeta> = {
  foundation: {
    key: 'foundation',
    title: 'รากฐานระบบ (Foundation)',
    accent: '#6C5DD3',
    icon: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  },
  po: {
    key: 'po',
    title: 'การรับเข้า PO (PO Receipt)',
    accent: '#2F6BED',
    icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h6',
  },
  other: {
    key: 'other',
    title: 'การรับเข้าอื่น ๆ (Other Receipt)',
    accent: '#8B6CF0',
    icon: 'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
  },
  transfer: {
    key: 'transfer',
    title: 'การย้ายคลัง (Transfer)',
    accent: '#16A77C',
    icon: 'M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7',
  },
  job: {
    key: 'job',
    title: 'งานผลิต (Job Operation)',
    accent: '#F08A24',
    icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96 12 12.01l8.73-5.05M12 22.08V12',
  },
  shipment: {
    key: 'shipment',
    title: 'การจัดส่ง (Shipment)',
    accent: '#3B82F6',
    icon: 'M1 3h15v13H1zM16 8h4l3 3v5h-7M5.5 18.5a2 2 0 1 0 .01 0M18.5 18.5a2 2 0 1 0 .01 0',
  },
  cycle: {
    key: 'cycle',
    title: 'ตรวจนับสต็อก (Cycle Count)',
    accent: '#7C5CFC',
    icon: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  },
  writeoff: {
    key: 'writeoff',
    title: 'ตั้งจ่าย/NC (Write-off / NC)',
    accent: '#14B8A6',
    icon: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z',
  },
};

export const GROUP_LIST: GroupMeta[] = GROUP_KEYS.map((k) => GROUPS[k]);

/* ── Persisted group (section) entity ─────────────────────────────────────────
   Groups are stored in the JSON datastore so users can add new sections. The
   built-in 8 above seed the store; new ones get key `g-<id>`. */

/** Response shape returned by the API (a superset of GroupMeta). */
export const groupSchema = z.object({
  id: z.number().int().positive(),
  key: z.string(),
  title: z.string(),
  accent: z.string(),
  icon: z.string(),
  order: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().optional(),
});
export type Group = z.infer<typeof groupSchema>;

/** Create request — the ONE schema validated on the server AND resolved by the form. */
export const createGroupSchema = z.object({
  title: z.string().min(1, 'กรุณาระบุชื่อหมวดหมู่').max(200),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'สีไม่ถูกต้อง'),
  icon: z.string().min(1, 'กรุณาเลือกไอคอน'),
});
export type CreateGroupInput = z.infer<typeof createGroupSchema>;

/** Update — derived (reserved for a future edit flow). */
export const updateGroupSchema = createGroupSchema.partial();
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;

/** Preset accent swatches offered in the Add-Section form. */
export const PRESET_ACCENTS: string[] = [
  ...GROUP_LIST.map((g) => g.accent),
  '#E8590C',
  '#0EA5E9',
  '#DB2777',
];

/** Preset icons offered in the Add-Section form (the built-in 8 icon paths). */
export const PRESET_ICONS: { key: string; path: string }[] = GROUP_LIST.map((g) => ({
  key: g.key,
  path: g.icon,
}));
