'use client';

import { useMemo, useState } from 'react';
import {
  Button,
  Loader,
  Menu,
  Popover,
  Select,
  TextInput,
} from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { Icon } from '@/components/ui/Icon';
import type { GroupKey, Group } from '@/lib/contracts/groups';
import { TASK_STATUSES, TASK_PRIORITIES, type Task, type TaskPriority } from '@/lib/contracts/task';
import { STATUS, PRIORITY } from '@/lib/ui/palette';
import { thaiRange, toISODate, fromISODate } from '@/lib/ui/date';
import { useGetTasks, useUpdateTask, useDeleteTask } from '@/lib/api/tasks';
import { useGetGroups, useDeleteGroup } from '@/lib/api/groups';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const PER_PAGE = 10;

const ALL = 'ALL';
const statusOptions = [{ value: ALL, label: 'ทั้งหมด' }, ...TASK_STATUSES.map((s) => ({ value: s, label: STATUS[s].label }))];
const priorityOptions = [{ value: ALL, label: 'ทั้งหมด' }, ...TASK_PRIORITIES.map((p) => ({ value: p, label: PRIORITY[p].label }))];

export function TaskListView({ accent }: { accent: string }) {
  const [search, setSearch] = useState('');
  const [debounced] = useDebouncedValue(search, 300);
  const [group, setGroup] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [priority, setPriority] = useState<string>(ALL);
  const [pages, setPages] = useState<Record<string, number>>({});
  const [confirm, setConfirm] = useState<Task | null>(null);
  const [confirmGroup, setConfirmGroup] = useState<{ meta: Group; count: number } | null>(null);

  const { data, isFetching } = useGetTasks({
    limit: 100,
    sort: 'priority',
    order: 'asc',
    search: debounced || undefined,
    group: group !== ALL ? (group as GroupKey) : undefined,
    status: status !== ALL ? (status as Task['status']) : undefined,
    priority: priority !== ALL ? (priority as TaskPriority) : undefined,
  });

  const { data: groups } = useGetGroups();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const deleteGroup = useDeleteGroup();

  const groupOptions = useMemo(
    () => [{ value: ALL, label: 'ทั้งหมด' }, ...(groups ?? []).map((g) => ({ value: g.key, label: g.title }))],
    [groups],
  );

  const filterActive = !!debounced || group !== ALL || status !== ALL || priority !== ALL;

  const grouped = useMemo(() => {
    const byGroup = new Map<string, Task[]>();
    for (const t of data?.data ?? []) {
      const arr = byGroup.get(t.group) ?? [];
      arr.push(t);
      byGroup.set(t.group, arr);
    }
    return (groups ?? [])
      .map((g) => ({ meta: g, rows: byGroup.get(g.key) ?? [] }))
      .filter(({ rows }) => !filterActive || rows.length > 0);
  }, [data, groups, filterActive]);

  const setPage = (key: string, p: number) => setPages((s) => ({ ...s, [key]: p }));

  const clearFilters = () => {
    setSearch('');
    setGroup(ALL);
    setStatus(ALL);
    setPriority(ALL);
  };

  const onChangePriority = async (task: Task, p: TaskPriority) => {
    try {
      await updateTask.mutateAsync({ id: task.id, data: { priority: p } });
    } catch {
      notifications.show({ message: 'แก้ไขความสำคัญไม่สำเร็จ', color: 'red' });
    }
  };

  const onChangeStatus = async (task: Task, s: Task['status']) => {
    try {
      await updateTask.mutateAsync({ id: task.id, data: { status: s } });
    } catch {
      notifications.show({ message: 'แก้ไขสถานะไม่สำเร็จ', color: 'red' });
    }
  };

  const onChangeDates = async (task: Task, startDate: string, endDate: string) => {
    try {
      await updateTask.mutateAsync({ id: task.id, data: { startDate, endDate } });
    } catch {
      notifications.show({ message: 'แก้ไขช่วงเวลาไม่สำเร็จ', color: 'red' });
    }
  };

  const onConfirmDelete = async () => {
    if (!confirm) return;
    try {
      await deleteTask.mutateAsync(confirm.id);
      notifications.show({ message: 'ลบรายการแล้ว', color: 'green' });
    } catch {
      notifications.show({ message: 'ลบรายการไม่สำเร็จ', color: 'red' });
    } finally {
      setConfirm(null);
    }
  };

  const onConfirmDeleteGroup = async () => {
    if (!confirmGroup) return;
    try {
      await deleteGroup.mutateAsync(confirmGroup.meta.id);
      notifications.show({ message: 'ลบหมวดหมู่แล้ว', color: 'green' });
    } catch {
      notifications.show({ message: 'ลบหมวดหมู่ไม่สำเร็จ', color: 'red' });
    } finally {
      setConfirmGroup(null);
    }
  };

  return (
    <div>
      {/* FILTER PANEL */}
      <div style={panel}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px 20px' }}>
          <Field label="ค้นหา (ชื่อหัวข้อ / ID / คำอธิบาย)">
            <TextInput
              placeholder="ค้นหางาน..."
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              rightSection={isFetching ? <Loader size="xs" /> : null}
            />
          </Field>
          <Field label="หมวดหมู่">
            <Select data={groupOptions} value={group} onChange={(v) => setGroup(v ?? ALL)} allowDeselect={false} />
          </Field>
          <Field label="สถานะ">
            <Select data={statusOptions} value={status} onChange={(v) => setStatus(v ?? ALL)} allowDeselect={false} />
          </Field>
          <Field label="ความสำคัญ">
            <Select data={priorityOptions} value={priority} onChange={(v) => setPriority(v ?? ALL)} allowDeselect={false} />
          </Field>
          <div style={{ gridColumn: '3 / 5', display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: 12 }}>
            <Button variant="default" onClick={clearFilters}>
              ล้างตัวกรอง
            </Button>
          </div>
        </div>
      </div>

      {/* GROUP CARDS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {grouped.length === 0 && !isFetching && (
          <div style={{ ...card(accent), textAlign: 'center', color: '#9AA1B2', padding: 40 }}>ไม่พบรายการงาน</div>
        )}
        {grouped.map(({ meta, rows }) => {
          const page = Math.min(pages[meta.key] ?? 1, Math.max(1, Math.ceil(rows.length / PER_PAGE)));
          const start = (page - 1) * PER_PAGE;
          const pageRows = rows.slice(start, start + PER_PAGE);
          const pageCount = Math.max(1, Math.ceil(rows.length / PER_PAGE));
          return (
            <section key={meta.key} style={card(meta.accent)}>
              {/* group header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <div style={iconBox(meta.accent)}>
                  <Icon path={meta.icon} color={meta.accent} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1B2138' }}>{meta.title}</div>
                  <div style={{ fontSize: 12.5, color: '#9AA1B2', marginTop: 1 }}>
                    <strong style={{ color: '#5B6478', fontWeight: 600 }}>{rows.length}</strong> รายการ
                  </div>
                </div>
                <Menu position="bottom-end" withinPortal shadow="md">
                  <Menu.Target>
                    <button style={kebabBtn} aria-label="ตัวเลือกหมวดหมู่">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="1.7" />
                        <circle cx="12" cy="12" r="1.7" />
                        <circle cx="12" cy="19" r="1.7" />
                      </svg>
                    </button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item color="red" onClick={() => setConfirmGroup({ meta, count: rows.length })}>
                      ลบหมวดหมู่
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </div>

              {/* table header */}
              <div style={{ ...rowGrid, padding: '8px 4px', borderBottom: '1px solid #F0F1F6', fontSize: 12, fontWeight: 600, color: '#9AA1B2' }}>
                <div>รหัส</div>
                <div>หัวข้อ</div>
                <div>สถานะ</div>
                <div>ความสำคัญ</div>
                <div>ช่วงเวลา</div>
                <div>ผู้รับผิดชอบ</div>
                <div />
              </div>

              {/* rows */}
              {pageRows.map((r) => {
                const st = STATUS[r.status];
                const pr = PRIORITY[r.priority];
                return (
                  <div key={r.id} style={{ ...rowGrid, padding: '14px 4px', borderBottom: '1px solid #F4F5F8', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: meta.accent }}>{r.code}</div>
                    <div style={{ fontSize: 13.5, color: '#2B3146', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.title}
                    </div>
                    <div>
                      <Menu position="bottom-start" withinPortal shadow="md">
                        <Menu.Target>
                          <button style={statusBadge(st.bg, st.tx)}>
                            <span style={dot(st.dot)} />
                            {st.label}
                            <Caret />
                          </button>
                        </Menu.Target>
                        <Menu.Dropdown>
                          {TASK_STATUSES.map((k) => (
                            <Menu.Item key={k} onClick={() => onChangeStatus(r, k)}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: STATUS[k].tx }}>
                                <span style={dot(STATUS[k].dot)} />
                                {STATUS[k].label}
                              </span>
                            </Menu.Item>
                          ))}
                        </Menu.Dropdown>
                      </Menu>
                    </div>
                    <div>
                      <Menu position="bottom-start" withinPortal shadow="md">
                        <Menu.Target>
                          <button style={priorityBtn(pr.bg, pr.tx)}>
                            <span style={{ fontSize: 12, lineHeight: 1 }}>{pr.arrow}</span>
                            {pr.label}
                            <Caret />
                          </button>
                        </Menu.Target>
                        <Menu.Dropdown>
                          {TASK_PRIORITIES.map((k) => (
                            <Menu.Item key={k} onClick={() => onChangePriority(r, k)}>
                              <span style={{ color: PRIORITY[k].tx, fontWeight: 600, fontSize: 12.5 }}>
                                {PRIORITY[k].arrow} {PRIORITY[k].label}
                              </span>
                            </Menu.Item>
                          ))}
                        </Menu.Dropdown>
                      </Menu>
                    </div>
                    <div>
                      <PeriodCell task={r} onChange={onChangeDates} />
                    </div>
                    <div style={{ fontSize: 13, color: '#4B5468' }}>{r.owner}</div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <Menu position="bottom-end" withinPortal shadow="md">
                        <Menu.Target>
                          <button style={kebabBtn}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="12" cy="5" r="1.7" />
                              <circle cx="12" cy="12" r="1.7" />
                              <circle cx="12" cy="19" r="1.7" />
                            </svg>
                          </button>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item color="red" onClick={() => setConfirm(r)}>
                            ลบรายการ
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </div>
                  </div>
                );
              })}

              {/* footer / pager */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 4px 14px' }}>
                <span style={{ fontSize: 12.5, color: '#9AA1B2' }}>
                  {rows.length ? `แสดง ${start + 1}-${start + pageRows.length} จาก ${rows.length} รายการ` : 'ไม่มีรายการ'}
                </span>
                {pageCount > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPage(meta.key, p)}
                        style={pagerBtn(p === page, meta.accent)}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <ConfirmDialog
        opened={!!confirm}
        title="ท่านต้องการลบรายการงานหรือไม่"
        detail={confirm ? `${confirm.code} — ${confirm.title}` : ''}
        confirmLabel="ลบรายการ"
        onConfirm={onConfirmDelete}
        onCancel={() => setConfirm(null)}
        loading={deleteTask.isPending}
      />

      <ConfirmDialog
        opened={!!confirmGroup}
        title="ท่านต้องการลบหมวดหมู่นี้หรือไม่"
        detail={
          confirmGroup
            ? `${confirmGroup.meta.title}${confirmGroup.count ? ` — มีงาน ${confirmGroup.count} รายการในหมวดนี้` : ''}`
            : ''
        }
        confirmLabel="ลบหมวดหมู่"
        onConfirm={onConfirmDeleteGroup}
        onCancel={() => setConfirmGroup(null)}
        loading={deleteGroup.isPending}
      />
    </div>
  );
}

/** Inline ช่วงเวลา editor: shows the Thai date range, opens a range calendar on click. */
function PeriodCell({
  task,
  onChange,
}: {
  task: Task;
  onChange: (task: Task, startDate: string, endDate: string) => void;
}) {
  const [opened, { open, close }] = useDisclosure(false);
  // Pending selection lives in local state so the FIRST click (start date) isn't
  // discarded before the second click (end date) lands. We only persist a full range.
  const [range, setRange] = useState<[Date | null, Date | null]>([null, null]);

  const handleOpen = () => {
    setRange([fromISODate(task.startDate), fromISODate(task.endDate)]);
    open();
  };

  const handleChange = (val: [Date | null, Date | null]) => {
    setRange(val);
    const [start, end] = val;
    if (start && end) {
      onChange(task, toISODate(start)!, toISODate(end)!);
      close();
    }
  };

  return (
    <Popover
      opened={opened}
      onChange={(o) => (o ? handleOpen() : close())}
      position="bottom-start"
      withinPortal
      shadow="md"
      radius="md"
      trapFocus
    >
      <Popover.Target>
        <button type="button" style={periodBtn} onClick={() => (opened ? close() : handleOpen())}>
          {thaiRange(task.startDate, task.endDate)}
          <Caret />
        </button>
      </Popover.Target>
      <Popover.Dropdown p="sm">
        <DatePicker
          type="range"
          value={range}
          defaultDate={fromISODate(task.startDate) ?? undefined}
          allowSingleDateInRange
          onChange={handleChange}
        />
      </Popover.Dropdown>
    </Popover>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#5B6478', marginBottom: 8 }}>{label}</label>
      {children}
    </div>
  );
}

function Caret() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

const panel: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #ECEEF3',
  borderRadius: 16,
  padding: '22px 24px',
  marginBottom: 22,
};

const card = (accent: string): React.CSSProperties => ({
  background: '#fff',
  border: '1px solid #ECEEF3',
  borderLeft: `4px solid ${accent}`,
  borderRadius: 16,
  padding: '20px 24px 6px',
  boxShadow: '0 1px 2px rgba(20,24,40,.03)',
});

const iconBox = (accent: string): React.CSSProperties => ({
  width: 38,
  height: 38,
  borderRadius: 11,
  background: accent + '1A',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const rowGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '100px minmax(0,1fr) 160px 130px 150px 110px 26px',
  gap: 12,
};

const statusBadge = (bg: string, tx: string): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  padding: '4px 10px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  background: bg,
  color: tx,
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
});

const dot = (c: string): React.CSSProperties => ({ width: 7, height: 7, borderRadius: '50%', background: c });

const priorityBtn = (bg: string, tx: string): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '4px 9px 4px 11px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  background: bg,
  color: tx,
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
});

const periodBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '4px 9px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  background: '#fff',
  color: '#4B5468',
  border: '1px solid #E4E7EF',
  cursor: 'pointer',
  fontFamily: 'inherit',
  maxWidth: '100%',
  whiteSpace: 'nowrap',
};

const kebabBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#B6BCCB',
  padding: 2,
  display: 'flex',
};

const pagerBtn = (active: boolean, accent: string): React.CSSProperties => ({
  minWidth: 30,
  height: 30,
  padding: '0 7px',
  borderRadius: 8,
  border: `1px solid ${active ? accent : '#E4E7EF'}`,
  background: active ? accent : '#fff',
  color: active ? '#fff' : '#4B5468',
  fontFamily: 'inherit',
  fontSize: 12.5,
  fontWeight: 600,
  cursor: 'pointer',
});
