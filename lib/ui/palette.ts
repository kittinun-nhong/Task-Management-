import type { TaskStatus, TaskPriority } from '@/lib/contracts/task';
import type { CrStatus } from '@/lib/contracts/change-request';

/** Presentation-only palettes (pure data — safe in client and server components). */

export interface StatusStyle {
  label: string;
  dot: string;
  bg: string;
  tx: string;
}

export const STATUS: Record<TaskStatus, StatusStyle> = {
  done: { label: 'เสร็จสิ้น', dot: '#16A34A', bg: '#E7F6EE', tx: '#0F8A4D' },
  prog: { label: 'กำลังดำเนินการ', dot: '#2563EB', bg: '#E9F0FE', tx: '#2563EB' },
  review: { label: 'รอทบทวน', dot: '#7C5CFC', bg: '#EEEAFD', tx: '#6D4AE0' },
  pend: { label: 'รอการพิจารณา', dot: '#F59E0B', bg: '#FEF2E0', tx: '#C2730A' },
  cancel: { label: 'ยกเลิก', dot: '#94A3B8', bg: '#EEF1F5', tx: '#64748B' },
};

export interface PriorityStyle {
  label: string;
  bg: string;
  tx: string;
  arrow: string;
  rank: number;
}

export const PRIORITY: Record<TaskPriority, PriorityStyle> = {
  high: { label: 'สูง', bg: '#FDECEC', tx: '#DC2626', arrow: '↑', rank: 0 },
  med: { label: 'กลาง', bg: '#FFF5E3', tx: '#B45309', arrow: '↑', rank: 1 },
  low: { label: 'ต่ำ', bg: '#E8F7F1', tx: '#0E9F6E', arrow: '↑', rank: 2 },
};

export interface CrStatusStyle {
  label: string;
  sq: string;
}

export const CR_STATUS: Record<CrStatus, CrStatusStyle> = {
  done: { label: 'เสร็จสิ้น', sq: '#16A34A' },
  prog: { label: 'กำลังดำเนินการ', sq: '#7C5CFC' },
  open: { label: 'เปิด', sq: '#94A3B8' },
  block: { label: 'ติดบล็อก', sq: '#EF4444' },
};

export const LEGEND = [
  { label: 'เสร็จสิ้น', color: '#16A34A' },
  { label: 'กำลังทำ', color: '#2563EB' },
  { label: 'วางแผนไว้', color: '#7C5CFC' },
  { label: 'ติดบล็อก', color: '#EF4444' },
  { label: 'ยกเลิก', color: '#94A3B8' },
];

export const ACCENT = '#6C5DD3';
