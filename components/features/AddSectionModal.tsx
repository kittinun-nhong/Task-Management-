'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  createGroupSchema,
  type CreateGroupInput,
  PRESET_ACCENTS,
  PRESET_ICONS,
} from '@/lib/contracts/groups';
import { useCreateGroup } from '@/lib/api/groups';
import { Icon } from '@/components/ui/Icon';

export function AddSectionModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { mutateAsync } = useCreateGroup();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateGroupInput>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { title: '', accent: PRESET_ACCENTS[0], icon: PRESET_ICONS[0].path },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutateAsync(values);
      notifications.show({ message: 'เพิ่มหมวดหมู่เรียบร้อยแล้ว', color: 'green' });
      reset();
      onClose();
    } catch {
      notifications.show({ message: 'ไม่สามารถเพิ่มหมวดหมู่ได้', color: 'red' });
    }
  });

  return (
    <Modal opened={opened} onClose={onClose} title="เพิ่มหมวดหมู่ (Section)" size="lg" centered radius="lg">
      <form onSubmit={onSubmit}>
        <Stack gap="lg">
          <TextInput
            label="ชื่อหมวดหมู่ (Title)"
            placeholder="เช่น รากฐานระบบ (Foundation)"
            error={errors.title?.message}
            {...register('title')}
          />

          <Controller
            control={control}
            name="accent"
            render={({ field }) => (
              <div>
                <Text fz={13} fw={600} c="#3F4759" mb={8}>
                  สีประจำหมวดหมู่ (Accent)
                </Text>
                <Group gap={10}>
                  {PRESET_ACCENTS.map((c) => {
                    const selected = field.value === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        aria-label={c}
                        onClick={() => field.onChange(c)}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: '50%',
                          background: c,
                          border: selected ? '3px solid #1B2138' : '3px solid transparent',
                          boxShadow: selected ? 'none' : `0 0 0 1px ${c}55`,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      />
                    );
                  })}
                </Group>
                {errors.accent?.message && (
                  <Text fz={12} c="red" mt={6}>
                    {errors.accent.message}
                  </Text>
                )}
              </div>
            )}
          />

          <Controller
            control={control}
            name="icon"
            render={({ field }) => (
              <div>
                <Text fz={13} fw={600} c="#3F4759" mb={8}>
                  ไอคอน (Icon)
                </Text>
                <Group gap={10}>
                  {PRESET_ICONS.map((ic) => {
                    const selected = field.value === ic.path;
                    return (
                      <button
                        key={ic.key}
                        type="button"
                        onClick={() => field.onChange(ic.path)}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: selected ? '#EEEAFD' : '#F6F7FB',
                          border: selected ? '2px solid #6C5DD3' : '2px solid transparent',
                          cursor: 'pointer',
                        }}
                      >
                        <Icon path={ic.path} color={selected ? '#6C5DD3' : '#6B7388'} size={20} />
                      </button>
                    );
                  })}
                </Group>
                {errors.icon?.message && (
                  <Text fz={12} c="red" mt={6}>
                    {errors.icon.message}
                  </Text>
                )}
              </div>
            )}
          />

          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit" loading={isSubmitting}>
              เพิ่มหมวดหมู่
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
