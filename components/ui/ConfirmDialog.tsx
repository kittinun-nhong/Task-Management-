'use client';

import { Button, Group, Modal, Text } from '@mantine/core';

export function ConfirmDialog({
  opened,
  title,
  detail,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  onConfirm,
  onCancel,
  loading,
}: {
  opened: boolean;
  title: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  return (
    <Modal opened={opened} onClose={onCancel} centered radius="lg" withCloseButton={false} size="sm">
      <div style={{ textAlign: 'center', padding: '8px 6px' }}>
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: '50%',
            background: '#FDECEC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </div>
        <Text fw={700} fz={17} c="#1B2138" mb={7}>
          {title}
        </Text>
        {detail && (
          <Text fz={13} c="#6B7388" mb="lg">
            {detail}
          </Text>
        )}
        <Group grow>
          <Button variant="default" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button color="red" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </Group>
      </div>
    </Modal>
  );
}
