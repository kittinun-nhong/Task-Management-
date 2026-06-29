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

/** Map a legacy change-request `period` label to the matching timeline week range. */
const LEGACY_PERIOD_WEEK: Record<string, number> = {
  'มิ.ย.': 1,
  'ก.ค. w1': 2,
  'ก.ค. w2': 3,
  'ก.ค. w3': 4,
  'ก.ค. w4': 5,
  'ส.ค. w1': 6,
  'ส.ค. w2': 7,
};

/** Convert a legacy `period` label (e.g. 'ก.ค. w1', 'ไม่ระบุ') to [startDate, endDate]. */
export function legacyPeriodRange(period: string | null | undefined): [string | null, string | null] {
  return legacyWeekRange(period ? LEGACY_PERIOD_WEEK[period] : undefined);
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

// Cleared before deploy — the app ships with no demo task rows.
// (Earlier curated seed rows are preserved in git history if ever needed.)
const SEED_GROUPS: SeedGroup[] = [];

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

// Cleared before deploy — the app ships with no demo change-request rows.
const SEED_CRS: SeedCr[] = [];

function buildChangeRequests(): ChangeRequest[] {
  return SEED_CRS.map((cr, i) => {
    const [startDate, endDate] = legacyPeriodRange(cr.period);
    return {
      id: i + 1,
      code: cr.code,
      title: cr.title,
      desc: cr.desc,
      flow: cr.flow,
      status: cr.status,
      startDate,
      endDate,
      createdAt: iso(1000 + i),
      updatedAt: iso(1000 + i),
      deletedAt: null,
    };
  });
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
