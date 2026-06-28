'use client';

import { useState } from 'react';
import { Button } from '@mantine/core';
import { ACCENT, LEGEND } from '@/lib/ui/palette';
import { TaskListView } from './TaskListView';
import { TimelineView } from './TimelineView';
import { ChangeRequestView } from './ChangeRequestView';
import { AddTaskModal } from './AddTaskModal';
import { AddSectionModal } from './AddSectionModal';

const TABS = ['รายการงานทั้งหมด (All Tasks)', 'คำขอเปลี่ยนแปลง (Change Requests)', 'ไทม์ไลน์ (Timeline)'];

export function Dashboard() {
  const accent = ACCENT;
  const [tab, setTab] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* SIDEBAR */}
      <aside
        style={{
          width: 232,
          flex: '0 0 232px',
          background: '#fff',
          borderRight: '1px solid #ECEEF3',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '22px 20px 18px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/prohub_logo_full.png" alt="ProHub" style={{ height: 38, width: 'auto', display: 'block' }} />
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '8px 14px' }}>
          <a
            href="#"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '11px 14px',
              borderRadius: 11,
              background: accent,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 6px 16px rgba(108,93,211,.28)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
            แผนงานผลิตภัณฑ์
          </a>
        </nav>
        <div style={{ marginTop: 'auto', padding: '18px 20px', fontSize: 11, color: '#A6AEC0' }}>© 2026 ProHub. All rights reserved.</div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, minWidth: 0, padding: '28px 36px 40px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginBottom: 18 }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 700, letterSpacing: -0.3, color: '#1B2138' }}>แผนงานผลิตภัณฑ์</h1>
            <p style={{ margin: 0, fontSize: 14, color: '#6B7388', maxWidth: 560 }}>
              ภาพรวมแผนงาน พัฒนาและส่งมอบคุณค่าให้ผู้ใช้งานอย่างต่อเนื่องและแน่นในแต่ละสปรินต์
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: '#1B2138', lineHeight: 1.9, flex: '0 0 auto' }}>
            <div>
              <span style={{ color: '#9AA1B2', letterSpacing: 0.3, marginRight: 8 }}>UPDATED</span>
              <strong style={{ fontWeight: 600 }}>27 มิ.ย. 2026</strong>
            </div>
            <div>
              <span style={{ color: '#9AA1B2', letterSpacing: 0.3, marginRight: 8 }}>STATUS</span>
              <strong style={{ fontWeight: 600 }}>อัปเดตล่าสุด: 27 มิ.ย. 2026 – มิ.ย. 2026</strong>
            </div>
          </div>
        </header>

        {/* LEGEND */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap', background: '#fff', border: '1px solid #ECEEF3', borderRadius: 14, padding: '13px 22px', marginBottom: 18 }}>
          {LEGEND.map((lg) => (
            <span key={lg.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#4B5468', fontWeight: 500 }}>
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: lg.color }} />
              {lg.label}
            </span>
          ))}
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: 30, borderBottom: '1px solid #E8EAF1', marginBottom: 20 }}>
          {TABS.map((label, i) => {
            const active = i === tab;
            return (
              <button
                key={label}
                onClick={() => setTab(i)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0 2px 12px',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  color: active ? accent : '#7A8298',
                  borderBottom: `2.5px solid ${active ? accent : 'transparent'}`,
                  marginBottom: -1,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* ACTION BUTTON (list tab) */}
        {tab === 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 16 }}>
            <Button
              variant="default"
              onClick={() => setSectionOpen(true)}
              leftSection={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              }
            >
              เพิ่มหมวดหมู่
            </Button>
            <Button
              onClick={() => setAddOpen(true)}
              leftSection={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              }
            >
              เพิ่มงานใหม่
            </Button>
          </div>
        )}

        {tab === 0 && <TaskListView accent={accent} />}
        {tab === 1 && <ChangeRequestView />}
        {tab === 2 && <TimelineView accent={accent} />}

        <AddTaskModal opened={addOpen} onClose={() => setAddOpen(false)} />
        <AddSectionModal opened={sectionOpen} onClose={() => setSectionOpen(false)} />
      </main>
    </div>
  );
}
