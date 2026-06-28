'use client';

import { useMemo } from 'react';
import { Loader } from '@mantine/core';
import dayjs from 'dayjs';
import { Icon } from '@/components/ui/Icon';
import type { Task } from '@/lib/contracts/task';
import { STATUS } from '@/lib/ui/palette';
import { THAI_MONTHS_ABBR, thaiRange } from '@/lib/ui/date';
import { useGetTasks } from '@/lib/api/tasks';
import { useGetGroups } from '@/lib/api/groups';

const COL_MIN = 150;
const LANE_W = 172;

/** Monday (00:00) of the week containing `d`. */
function weekStart(d: dayjs.Dayjs): dayjs.Dayjs {
  return d.startOf('day').subtract((d.day() + 6) % 7, 'day');
}

interface WeekCol {
  start: dayjs.Dayjs;
  /** Thai month label, shown only when the month changes from the previous column. */
  month: string;
  index: number;
  range: string;
}

export function TimelineView({ accent }: { accent: string }) {
  const { data, isFetching } = useGetTasks({ limit: 100, sort: 'createdAt', order: 'asc' });
  const { data: groups } = useGetGroups();

  // Only tasks with a real start–end range live on the timeline.
  const dated = useMemo(
    () => (data?.data ?? []).filter((t) => t.startDate && t.endDate),
    [data],
  );

  // Build weekly columns spanning the earliest start → latest end across all tasks.
  const { weeks, anchor } = useMemo(() => {
    if (dated.length === 0) return { weeks: [] as WeekCol[], anchor: null as dayjs.Dayjs | null };
    let min = dayjs(dated[0].startDate);
    let max = dayjs(dated[0].endDate);
    for (const t of dated) {
      const s = dayjs(t.startDate);
      const e = dayjs(t.endDate);
      if (s.isBefore(min)) min = s;
      if (e.isAfter(max)) max = e;
    }
    const a = weekStart(min);
    const last = weekStart(max);
    const count = Math.max(1, last.diff(a, 'week') + 1);
    let prevMonth = -1;
    const cols: WeekCol[] = Array.from({ length: count }, (_, i) => {
      const start = a.add(i, 'week');
      const end = start.add(6, 'day');
      const showMonth = start.month() !== prevMonth;
      prevMonth = start.month();
      return {
        start,
        index: i,
        month: showMonth ? THAI_MONTHS_ABBR[start.month()] : ' ',
        range: thaiRange(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')),
      };
    });
    return { weeks: cols, anchor: a };
  }, [dated]);

  const lanes = useMemo(() => {
    const byGroup = new Map<string, Task[]>();
    for (const t of dated) {
      const arr = byGroup.get(t.group) ?? [];
      arr.push(t);
      byGroup.set(t.group, arr);
    }
    return (groups ?? []).map((g) => ({ meta: g, tasks: byGroup.get(g.key) ?? [] }));
  }, [dated, groups]);

  /** 1-based timeline column for a date, clamped into the visible range. */
  const colOf = (date: string) => {
    if (!anchor) return 1;
    const i = Math.floor(dayjs(date).startOf('day').diff(anchor, 'day') / 7);
    return Math.min(weeks.length, Math.max(1, i + 1));
  };

  const n = weeks.length;
  const minWidth = LANE_W + n * COL_MIN;
  const colsTemplate = `repeat(${n},minmax(${COL_MIN}px,1fr))`;

  if (!isFetching && n === 0) {
    return (
      <div style={{ background: '#fff', border: '1px solid #ECEEF3', borderRadius: 16, padding: 40, textAlign: 'center', color: '#9AA1B2' }}>
        ยังไม่มีงานที่กำหนดช่วงเวลา — เพิ่มหรือแก้ไขช่วงเวลาของงานเพื่อแสดงบนไทม์ไลน์
      </div>
    );
  }

  return (
    <div>
      {isFetching && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 16 }}>
          <Loader size="sm" />
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #ECEEF3', borderRadius: 16, overflowX: 'auto', boxShadow: '0 1px 2px rgba(20,24,40,.03)' }}>
        <div style={{ minWidth }}>
          {/* header */}
          <div style={{ display: 'grid', gridTemplateColumns: `${LANE_W}px ${colsTemplate}`, borderBottom: '1px solid #ECEEF3', background: '#FCFCFE' }}>
            <div style={{ padding: '18px 16px', fontSize: 12.5, fontWeight: 600, color: '#8A92A6', borderRight: '1px solid #EFF0F5' }}>
              สายงาน / กลุ่มงาน
            </div>
            {weeks.map((c) => (
              <div key={c.index} style={{ padding: '14px 14px', borderLeft: '1px solid #EFF0F5' }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: '#9AA1B2' }}>{c.month}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1B2138', marginTop: 2 }}>{c.index + 1}</div>
                <div style={{ fontSize: 11, color: '#AEB5C4', marginTop: 3 }}>{c.range}</div>
                <div style={{ fontSize: 11, color: '#AEB5C4' }}>สัปดาห์ที่ {c.index + 1}</div>
              </div>
            ))}
          </div>

          {/* lanes */}
          {lanes.map(({ meta, tasks }) => (
            <div key={meta.key} style={{ display: 'grid', gridTemplateColumns: `${LANE_W}px 1fr`, borderBottom: '1px solid #F1F2F7', background: meta.accent + '07' }}>
              <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 9, borderRight: '1px solid #EFF0F5' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: meta.accent + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon path={meta.icon} color={meta.accent} size={18} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1B2138', lineHeight: 1.35 }}>{meta.title}</div>
                <div style={{ fontSize: 12, color: '#9AA1B2' }}>{tasks.length} งาน</div>
              </div>
              <div style={{ position: 'relative', padding: '16px 0' }}>
                <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: colsTemplate, pointerEvents: 'none' }}>
                  {weeks.map((c) => (
                    <div key={c.index} style={{ borderLeft: '1px solid #F1F2F7' }} />
                  ))}
                </div>
                <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: colsTemplate, rowGap: 10, alignItems: 'start' }}>
                  {tasks.map((t) => {
                    const st = STATUS[t.status];
                    const startCol = colOf(t.startDate!);
                    const endCol = colOf(t.endDate!);
                    return (
                      <div
                        key={t.id}
                        style={{
                          gridColumn: `${startCol} / ${endCol + 1}`,
                          margin: '0 8px',
                          background: '#fff',
                          border: '1px solid #EBEDF3',
                          borderLeft: `3px solid ${st.dot}`,
                          borderRadius: 10,
                          padding: '10px 11px',
                          boxShadow: '0 1px 2px rgba(20,24,40,.05)',
                          minHeight: 78,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: 9,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#2B3146',
                            lineHeight: 1.4,
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {t.title}
                        </span>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: 10.5, color: '#9AA1B2', fontWeight: 600 }}>
                            {thaiRange(t.startDate, t.endDate)}
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#5B6478' }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.dot }} />
                            {st.label}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
