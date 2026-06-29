'use client';

import { useMemo, useState } from 'react';
import { Button, Loader, Menu, Popover } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { Icon } from '@/components/ui/Icon';
import { type ChangeRequest, type CrStatus, CR_STATUSES } from '@/lib/contracts/change-request';
import { CR_STATUS } from '@/lib/ui/palette';
import { thaiRange, thaiDateTime, toISODate, fromISODate } from '@/lib/ui/date';
import { useGetChangeRequests, useDeleteChangeRequest, useUpdateChangeRequest } from '@/lib/api/change-requests';
import { useGetGroups } from '@/lib/api/groups';
import { ChangeRequestModal } from './ChangeRequestModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function ChangeRequestView() {
  const { data, isFetching } = useGetChangeRequests();
  const { data: groups } = useGetGroups();
  const deleteCr = useDeleteChangeRequest();
  const updateCr = useUpdateChangeRequest();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ChangeRequest | null>(null);
  const [confirm, setConfirm] = useState<ChangeRequest | null>(null);

  const grouped = useMemo(() => {
    const byFlow = new Map<string, ChangeRequest[]>();
    for (const cr of data?.data ?? []) {
      const arr = byFlow.get(cr.flow) ?? [];
      arr.push(cr);
      byFlow.set(cr.flow, arr);
    }
    return (groups ?? [])
      .filter((g) => byFlow.has(g.key))
      .map((g) => ({ meta: g, items: byFlow.get(g.key)! }));
  }, [data, groups]);

  const onChangeDates = async (cr: ChangeRequest, startDate: string, endDate: string) => {
    try {
      await updateCr.mutateAsync({ id: cr.id, data: { startDate, endDate } });
    } catch {
      notifications.show({ message: 'แก้ไขช่วงเวลาไม่สำเร็จ', color: 'red' });
    }
  };

  const onChangeStatus = async (cr: ChangeRequest, status: CrStatus) => {
    if (status === cr.status) return;
    try {
      await updateCr.mutateAsync({ id: cr.id, data: { status } });
      notifications.show({ message: 'อัปเดตสถานะแล้ว', color: 'green' });
    } catch {
      notifications.show({ message: 'อัปเดตสถานะไม่สำเร็จ', color: 'red' });
    }
  };

  const onConfirmDelete = async () => {
    if (!confirm) return;
    try {
      await deleteCr.mutateAsync(confirm.id);
      notifications.show({ message: 'ลบคำขอแล้ว', color: 'green' });
    } catch {
      notifications.show({ message: 'ลบไม่สำเร็จ', color: 'red' });
    } finally {
      setConfirm(null);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (cr: ChangeRequest) => {
    setEditing(cr);
    setFormOpen(true);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        {isFetching && <Loader size="sm" />}
        <Button
          onClick={openAdd}
          leftSection={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          }
        >
          เพิ่มคำขอเปลี่ยนแปลง
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {grouped.length === 0 && !isFetching && (
          <div style={{ background: '#fff', border: '1px solid #ECEEF3', borderRadius: 16, textAlign: 'center', color: '#9AA1B2', padding: 40 }}>
            ยังไม่มีคำขอเปลี่ยนแปลง
          </div>
        )}
        {grouped.map(({ meta, items }) => (
          <section key={meta.key} style={{ background: '#fff', border: '1px solid #ECEEF3', borderLeft: `4px solid ${meta.accent}`, borderRadius: 16, padding: '18px 22px 8px', boxShadow: '0 1px 2px rgba(20,24,40,.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 6 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: meta.accent + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon path={meta.icon} color={meta.accent} size={17} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1B2138' }}>{meta.title}</div>
                <div style={{ fontSize: 12, color: meta.accent, fontWeight: 600, marginTop: 1 }}>{items.length} รายการ</div>
              </div>
            </div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ minWidth: 870 }}>
            {items.map((i) => {
              return (
                <div
                  key={i.id}
                  style={{ display: 'grid', gridTemplateColumns: '60px minmax(220px,1fr) 170px 120px 150px auto auto', gap: 12, alignItems: 'center', padding: '15px 4px', borderTop: '1px solid #F1F2F7' }}
                >
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: '#9AA1B2', letterSpacing: 0.3 }}>{i.code}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1B2138', marginBottom: 3 }}>{i.title}</div>
                    <div style={{ fontSize: 12.5, color: '#7A8298', lineHeight: 1.45 }}>{i.desc}</div>
                  </div>
                  <CrStatusCell cr={i} onChange={onChangeStatus} disabled={updateCr.isPending} />
                  <CrPeriodCell cr={i} onChange={onChangeDates} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 10.5, color: '#AEB5C4', fontWeight: 600 }}>อัปเดตล่าสุด</div>
                    <div style={{ fontSize: 12.5, color: '#7A8298', whiteSpace: 'nowrap' }}>{thaiDateTime(i.updatedAt)}</div>
                  </div>
                  <button onClick={() => openEdit(i)} style={editBtn}>
                    แก้ไข
                  </button>
                  <button onClick={() => setConfirm(i)} style={delBtn}>
                    ลบ
                  </button>
                </div>
              );
            })}
            </div>
            </div>
          </section>
        ))}
      </div>

      <ChangeRequestModal opened={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
      <ConfirmDialog
        opened={!!confirm}
        title="ต้องการลบคำขอเปลี่ยนแปลงหรือไม่"
        detail={confirm ? `${confirm.code} — ${confirm.title}` : ''}
        confirmLabel="ลบ"
        onConfirm={onConfirmDelete}
        onCancel={() => setConfirm(null)}
        loading={deleteCr.isPending}
      />
    </div>
  );
}

/** Inline status editor: shows the current status, opens a menu of statuses to pick from. */
function CrStatusCell({
  cr,
  onChange,
  disabled,
}: {
  cr: ChangeRequest;
  onChange: (cr: ChangeRequest, status: CrStatus) => void;
  disabled?: boolean;
}) {
  const st = CR_STATUS[cr.status];
  return (
    <Menu position="bottom-start" withinPortal shadow="md" radius="md" width={200} disabled={disabled}>
      <Menu.Target>
        <button type="button" style={statusBtn} disabled={disabled}>
          <span style={{ width: 11, height: 11, borderRadius: 3, background: st.sq, flex: '0 0 auto' }} />
          <span style={{ fontSize: 12.5, color: '#2B3146', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>{st.label}</span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, color: '#5B6478', flex: '0 0 auto' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </Menu.Target>
      <Menu.Dropdown>
        {CR_STATUSES.map((s) => {
          const so = CR_STATUS[s];
          const active = s === cr.status;
          return (
            <Menu.Item
              key={s}
              onClick={() => onChange(cr, s)}
              leftSection={<span style={{ width: 11, height: 11, borderRadius: 3, background: so.sq, display: 'inline-block' }} />}
              style={{ fontSize: 12.5, fontWeight: active ? 700 : 500, background: active ? '#F4F5FA' : undefined }}
            >
              {so.label}
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}

/** Inline ช่วงเวลา editor: shows the Thai date range, opens a range calendar on click. */
function CrPeriodCell({
  cr,
  onChange,
}: {
  cr: ChangeRequest;
  onChange: (cr: ChangeRequest, startDate: string, endDate: string) => void;
}) {
  const [opened, { open, close }] = useDisclosure(false);
  // Pending selection lives in local state so the FIRST click (start date) isn't
  // discarded before the second click (end date) lands. We only persist a full range.
  const [range, setRange] = useState<[Date | null, Date | null]>([null, null]);

  const handleOpen = () => {
    setRange([fromISODate(cr.startDate), fromISODate(cr.endDate)]);
    open();
  };

  const handleChange = (val: [Date | null, Date | null]) => {
    setRange(val);
    const [start, end] = val;
    if (start && end) {
      onChange(cr, toISODate(start)!, toISODate(end)!);
      close();
    }
  };

  return (
    <Popover opened={opened} onChange={(o) => (o ? handleOpen() : close())} position="bottom-start" withinPortal shadow="md" radius="md" trapFocus>
      <Popover.Target>
        <button type="button" style={periodBtn} onClick={() => (opened ? close() : handleOpen())}>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{thaiRange(cr.startDate, cr.endDate)}</span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, color: '#5B6478', flex: '0 0 auto' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </Popover.Target>
      <Popover.Dropdown p="sm">
        <DatePicker
          type="range"
          value={range}
          defaultDate={fromISODate(cr.startDate) ?? undefined}
          allowSingleDateInRange
          onChange={handleChange}
        />
      </Popover.Dropdown>
    </Popover>
  );
}

const statusBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  border: '1px solid #E1E4ED',
  borderRadius: 8,
  padding: '7px 11px',
  background: '#fff',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const periodBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  width: '100%',
  border: '1px solid #E1E4ED',
  borderRadius: 8,
  padding: '7px 11px',
  background: '#fff',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 12.5,
  color: '#2B3146',
};

const editBtn: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #E1E4ED',
  borderRadius: 8,
  padding: '8px 14px',
  fontFamily: 'inherit',
  fontSize: 12.5,
  fontWeight: 600,
  color: '#4B5468',
  cursor: 'pointer',
};

const delBtn: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #F1D4D4',
  borderRadius: 8,
  padding: '8px 14px',
  fontFamily: 'inherit',
  fontSize: 12.5,
  fontWeight: 600,
  color: '#DC2626',
  cursor: 'pointer',
};
