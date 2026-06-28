'use client';

import { useMemo } from 'react';
import { Button, Loader } from '@mantine/core';
import { Icon } from '@/components/ui/Icon';
import type { Task } from '@/lib/contracts/task';
import { STATUS } from '@/lib/ui/palette';
import { useGetTasks } from '@/lib/api/tasks';
import { useGetGroups } from '@/lib/api/groups';

const WEEK_COLS = [
  { month: 'มิ.ย.', big: 'Kickoff', range: '23–29 มิ.ย.', sub: 'สัปดาห์ที่ 29', bigColor: '#6B7388' },
  { month: 'ก.ค. - สัปดาห์', big: '1', range: '1–7 ก.ค.', sub: ' ', bigColor: '#1B2138' },
  { month: ' ', big: '2', range: '8–14 ก.ค.', sub: ' ', bigColor: '#1B2138' },
  { month: ' ', big: '3', range: '15–21 ก.ค.', sub: ' ', bigColor: '#1B2138' },
  { month: ' ', big: '4', range: '22–28 ก.ค.', sub: ' ', bigColor: '#1B2138' },
  { month: 'ส.ค. - สัปดาห์', big: '1', range: '29 ก.ค. – 4 ส.ค.', sub: ' ', bigColor: '#1B2138' },
  { month: 'ส.ค. - สัปดาห์', big: '2', range: '5–11 ส.ค.', sub: ' ', bigColor: '#1B2138' },
];

export function TimelineView({ accent, onAdd }: { accent: string; onAdd: () => void }) {
  const { data, isFetching } = useGetTasks({ limit: 100, sort: 'createdAt', order: 'asc' });
  const { data: groups } = useGetGroups();

  const lanes = useMemo(() => {
    const byGroup = new Map<string, Task[]>();
    for (const t of data?.data ?? []) {
      if (t.week == null) continue;
      const arr = byGroup.get(t.group) ?? [];
      arr.push(t);
      byGroup.set(t.group, arr);
    }
    return (groups ?? []).map((g) => ({ meta: g, tasks: byGroup.get(g.key) ?? [] }));
  }, [data, groups]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginBottom: 16 }}>
        {isFetching && <Loader size="sm" />}
        <Button
          onClick={onAdd}
          leftSection={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          }
        >
          เพิ่มงาน
        </Button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #ECEEF3', borderRadius: 16, overflowX: 'auto', boxShadow: '0 1px 2px rgba(20,24,40,.03)' }}>
        <div style={{ minWidth: 1240 }}>
          {/* header */}
          <div style={{ display: 'grid', gridTemplateColumns: '172px repeat(7,1fr)', borderBottom: '1px solid #ECEEF3', background: '#FCFCFE' }}>
            <div style={{ padding: '18px 16px', fontSize: 12.5, fontWeight: 600, color: '#8A92A6', borderRight: '1px solid #EFF0F5' }}>
              สายงาน / กลุ่มงาน
            </div>
            {WEEK_COLS.map((c, i) => (
              <div key={i} style={{ padding: '14px 14px', borderLeft: '1px solid #EFF0F5' }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: '#9AA1B2' }}>{c.month}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: c.bigColor, marginTop: 2 }}>{c.big}</div>
                <div style={{ fontSize: 11, color: '#AEB5C4', marginTop: 3 }}>{c.range}</div>
                <div style={{ fontSize: 11, color: '#AEB5C4' }}>{c.sub}</div>
              </div>
            ))}
          </div>

          {/* lanes */}
          {lanes.map(({ meta, tasks }) => (
            <div key={meta.key} style={{ display: 'grid', gridTemplateColumns: '172px 1fr', borderBottom: '1px solid #F1F2F7', background: meta.accent + '07' }}>
              <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 9, borderRight: '1px solid #EFF0F5' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: meta.accent + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon path={meta.icon} color={meta.accent} size={18} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1B2138', lineHeight: 1.35 }}>{meta.title}</div>
                <div style={{ fontSize: 12, color: '#9AA1B2' }}>{tasks.length} งาน</div>
              </div>
              <div style={{ position: 'relative', padding: '16px 0' }}>
                <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', pointerEvents: 'none' }}>
                  {Array.from({ length: 7 }, (_, i) => (
                    <div key={i} style={{ borderLeft: '1px solid #F1F2F7' }} />
                  ))}
                </div>
                <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', rowGap: 10, alignItems: 'start' }}>
                  {tasks.map((t) => {
                    const st = STATUS[t.status];
                    return (
                      <div
                        key={t.id}
                        style={{
                          gridColumn: t.week ?? 1,
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
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#5B6478' }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.dot }} />
                          {st.label}
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
