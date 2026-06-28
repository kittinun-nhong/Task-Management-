import 'server-only';
import type { Task, TaskStatus, TaskPriority } from '@/lib/contracts/task';
import type { ChangeRequest, CrStatus } from '@/lib/contracts/change-request';
import type { GroupKey, Group } from '@/lib/contracts/groups';
import { GROUP_LIST } from '@/lib/contracts/groups';
import type { DbShape } from './json-store';

/** Deterministic base timestamp so seeded rows sort predictably by createdAt. */
const BASE = Date.parse('2026-06-01T00:00:00.000Z');
const iso = (offsetSeconds: number) => new Date(BASE + offsetSeconds * 1000).toISOString();

/**
 * Calendar range for each legacy timeline column 1..7 (`YYYY-MM-DD`). Used to seed
 * the new start/end dates and to migrate older stores that only had `week`.
 */
const LEGACY_WEEK_DATES: Record<number, [string, string]> = {
  1: ['2026-06-23', '2026-06-29'],
  2: ['2026-07-01', '2026-07-07'],
  3: ['2026-07-08', '2026-07-14'],
  4: ['2026-07-15', '2026-07-21'],
  5: ['2026-07-22', '2026-07-28'],
  6: ['2026-07-29', '2026-08-04'],
  7: ['2026-08-05', '2026-08-11'],
};

/** Map a legacy `week` (1..7 or null) to a [startDate, endDate] pair (or nulls). */
export function legacyWeekRange(week: number | null | undefined): [string | null, string | null] {
  return (week != null && LEGACY_WEEK_DATES[week]) || [null, null];
}

interface SeedRow {
  code: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  period: string;
}

interface SeedGroup {
  key: GroupKey;
  count: number;
  prefix: string;
  baseName: string;
  rows: SeedRow[];
}

const r = (
  code: string,
  title: string,
  status: TaskStatus,
  priority: TaskPriority,
  period: string,
): SeedRow => ({ code, title, status, priority, period });

const SEED_GROUPS: SeedGroup[] = [
  {
    key: 'foundation',
    count: 14,
    prefix: 'FD',
    baseName: 'รากฐานระบบ',
    rows: [
      r('FD-USR', 'จัดการผู้ใช้และสิทธิ (User & Permissions) — role-based, scope Plant/Warehouse', 'done', 'high', 'มิ.ย. 2026'),
      r('FD-PLT', 'จัดการโรงงานและคลัง (Plant & Warehouse) — NTX1/NTX2', 'done', 'high', 'มิ.ย. 2026'),
      r('FD-LOC', 'จัดการตำแหน่งจัดเก็บ (Location) — Zone>Area>Sub-Area>Bin', 'prog', 'med', 'มิ.ย. 2026'),
    ],
  },
  {
    key: 'po',
    count: 11,
    prefix: 'PO',
    baseName: 'การรับเข้า PO',
    rows: [
      r('PO-001', 'POC: PO Receipt end-to-end (scan > Pull > Operate > Push)', 'prog', 'high', 'มิ.ย. 2026'),
      r('PO-002', 'QA Inspection (Pass/Fail, หน่วยนับ, partial 98%)', 'review', 'med', 'มิ.ย. 2026'),
      r('PO-003', 'พิมพ์ INSP Label + ลงทะเบียน RFID Tag', 'pend', 'low', 'มิ.ย. 2026'),
    ],
  },
  {
    key: 'other',
    count: 4,
    prefix: 'OTR',
    baseName: 'การรับเข้าอื่น ๆ',
    rows: [
      r('OTR-001', 'ค้างส่งสินค้า (WMS-only, ไม่มี PO)', 'prog', 'med', 'มิ.ย. 2026'),
      r('OTR-002', 'รับสินค้า (เบิก 10 ถึง 9, Lot เต็ม)', 'review', 'low', 'มิ.ย. 2026'),
    ],
  },
  {
    key: 'transfer',
    count: 4,
    prefix: 'TR',
    baseName: 'การย้ายคลัง',
    rows: [
      r('TR-001', 'ย้าย Bin-to-Bin + RFID Gate ยืนยัน', 'done', 'med', 'มิ.ย. 2026'),
      r('TR-002', 'Move Log / audit trail ทุกการย้าย', 'prog', 'med', 'มิ.ย. 2026'),
    ],
  },
  {
    key: 'job',
    count: 12,
    prefix: 'JOB',
    baseName: 'งานผลิต',
    rows: [
      r('JOB-001', 'Spike: RFID/Barcode scan + Label/Tag print', 'prog', 'high', 'มิ.ย. 2026'),
      r('JOB-002', 'Issue Material 2.0 (Pull Job + Operate + Push Issue)', 'review', 'high', 'มิ.ย. 2026'),
    ],
  },
  {
    key: 'shipment',
    count: 5,
    prefix: 'SHP',
    baseName: 'การจัดส่ง',
    rows: [
      r('SHP-001', 'Import Shipping Request/Pack ฯ จาก Epicor', 'prog', 'high', 'มิ.ย. 2026'),
      r('SHP-002', 'Checker สถานะ/โหลด Actual Qty/Lot (handheld)', 'done', 'med', 'มิ.ย. 2026'),
    ],
  },
  {
    key: 'cycle',
    count: 4,
    prefix: 'CNT',
    baseName: 'ตรวจนับสต็อก',
    rows: [
      r('CNT-001', 'Lock Part เพื่อการนับยอด', 'review', 'med', 'มิ.ย. 2026'),
      r('CNT-002', 'Sync Adjust + Epicor (รอตั้งใหม่) [TBD]', 'pend', 'low', 'มิ.ย. 2026'),
    ],
  },
  {
    key: 'writeoff',
    count: 3,
    prefix: 'NC',
    baseName: 'ตั้งจ่าย/NC',
    rows: [
      r('NC-001', 'เลือก Part + สร้าง Holding List + Lock', 'prog', 'med', 'มิ.ย. 2026'),
      r('NC-002', 'Write-off + Epicor (รอตั้งใหม่) [TBD]', 'review', 'med', 'มิ.ย. 2026'),
    ],
  },
];

const FILL_STATUS: TaskStatus[] = ['prog', 'review', 'pend', 'done'];
const FILL_PRIORITY: TaskPriority[] = ['high', 'med', 'low'];

/** Build the full task list, reproducing the reference's filler-row expansion. */
function buildTasks(): Task[] {
  const tasks: Task[] = [];
  let id = 0;
  let clock = 0;

  for (const g of SEED_GROUPS) {
    const rows: SeedRow[] = g.rows.slice();
    while (rows.length < g.count) {
      const n = rows.length + 1;
      rows.push(
        r(
          `${g.prefix}-${String(n).padStart(3, '0')}`,
          `${g.baseName} — งานย่อยที่ ${n}`,
          FILL_STATUS[rows.length % 4],
          FILL_PRIORITY[rows.length % 3],
          rows.length % 2 ? 'มิ.ย. 2026' : 'มิ.ย. 2026',
        ),
      );
    }

    rows.forEach((row, localIndex) => {
      id += 1;
      clock += 1;
      const week = localIndex < 6 ? (localIndex % 6) + 2 : null;
      const [startDate, endDate] = legacyWeekRange(week);
      tasks.push({
        id,
        code: `FC-${String(id).padStart(3, '0')}`,
        title: row.title,
        group: g.key,
        status: row.status,
        priority: row.priority,
        startDate,
        endDate,
        owner: 'PMO Team',
        createdAt: iso(clock),
        updatedAt: iso(clock),
        deletedAt: null,
      });
    });
  }

  return tasks;
}

interface SeedCr {
  code: string;
  title: string;
  desc: string;
  flow: GroupKey;
  status: CrStatus;
  period: string;
}

const SEED_CRS: SeedCr[] = [
  { code: 'CR-001', title: 'Add Epicor id to warehouse for prototype', desc: 'เพิ่ม Epicor id ของ Warehouse ให้เข้าไปในแต่ละระบบ', flow: 'foundation', status: 'done', period: 'มิ.ย.' },
  { code: 'CR-002', title: 'Add Base epicor id for location', desc: 'Add Base epicor id for location for bin 1 bin using one base bin from epicor', flow: 'foundation', status: 'prog', period: 'ก.ค. w1' },
  { code: 'CR-003', title: 'พิมพ์ Label ของ Bin ทีละอันได้', desc: 'พิมพ์ Label ของ Bin ทีละอันได้', flow: 'foundation', status: 'prog', period: 'ก.ค. w1' },
  { code: 'CR-004', title: 'รองรับ partial receipt มากกว่า 100%', desc: 'ปรับ logic ให้รับเกินจำนวน PO ได้ตามนโยบาย', flow: 'po', status: 'open', period: 'ก.ค. w2' },
  { code: 'CR-005', title: 'QA reject flow + ระบุเหตุผล', desc: 'เพิ่มขั้นตอน reject พร้อมบันทึกเหตุผลและรูปถ่าย', flow: 'po', status: 'block', period: 'ก.ค. w3' },
  { code: 'CR-006', title: 'Issue material แบบ partial ต่อ job', desc: 'เบิกวัตถุดิบบางส่วนต่อ job และทยอยเบิกได้', flow: 'job', status: 'prog', period: 'ส.ค. w1' },
];

function buildChangeRequests(): ChangeRequest[] {
  return SEED_CRS.map((cr, i) => ({
    id: i + 1,
    code: cr.code,
    title: cr.title,
    desc: cr.desc,
    flow: cr.flow,
    status: cr.status,
    period: cr.period,
    createdAt: iso(1000 + i),
    updatedAt: iso(1000 + i),
    deletedAt: null,
  }));
}

/** The built-in 8 sections, as persisted group rows (also used to backfill old data.json). */
export function seedGroups(): Group[] {
  return GROUP_LIST.map((g, i) => ({
    id: i + 1,
    key: g.key,
    title: g.title,
    accent: g.accent,
    icon: g.icon,
    order: i,
    createdAt: iso(2000 + i),
    updatedAt: iso(2000 + i),
    deletedAt: null,
  }));
}

/** Initial database written to disk when data.json does not yet exist. */
export function seedData(): DbShape {
  const tasks = buildTasks();
  const changeRequests = buildChangeRequests();
  const groups = seedGroups();
  return {
    tasks,
    changeRequests,
    groups,
    counters: {
      task: tasks.length,
      changeRequest: changeRequests.length,
      group: groups.length,
    },
  };
}
