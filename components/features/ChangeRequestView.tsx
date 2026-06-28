'use client';

import { useMemo, useState } from 'react';
import { Button, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Icon } from '@/components/ui/Icon';
import type { ChangeRequest } from '@/lib/contracts/change-request';
import { CR_STATUS } from '@/lib/ui/palette';
import { useGetChangeRequests, useDeleteChangeRequest } from '@/lib/api/change-requests';
import { useGetGroups } from '@/lib/api/groups';
import { ChangeRequestModal } from './ChangeRequestModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function ChangeRequestView() {
  const { data, isFetching } = useGetChangeRequests();
  const { data: groups } = useGetGroups();
  const deleteCr = useDeleteChangeRequest();
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
            {items.map((i) => {
              const st = CR_STATUS[i.status];
              return (
                <div
                  key={i.id}
                  style={{ display: 'grid', gridTemplateColumns: '60px minmax(220px,1fr) 170px 120px auto auto', gap: 12, alignItems: 'center', padding: '15px 4px', borderTop: '1px solid #F1F2F7' }}
                >
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: '#9AA1B2', letterSpacing: 0.3 }}>{i.code}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1B2138', marginBottom: 3 }}>{i.title}</div>
                    <div style={{ fontSize: 12.5, color: '#7A8298', lineHeight: 1.45 }}>{i.desc}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #E1E4ED', borderRadius: 8, padding: '7px 11px' }}>
                    <span style={{ width: 11, height: 11, borderRadius: 3, background: st.sq, flex: '0 0 auto' }} />
                    <span style={{ fontSize: 12.5, color: '#2B3146', whiteSpace: 'nowrap' }}>{st.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #E1E4ED', borderRadius: 8, padding: '7px 11px' }}>
                    <span style={{ fontSize: 12.5, color: '#2B3146', whiteSpace: 'nowrap' }}>{i.period}</span>
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
