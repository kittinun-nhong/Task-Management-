'use client';

import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Group, Modal, Select, Stack, TextInput } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { createTaskSchema, type CreateTaskInput, TASK_STATUSES, TASK_PRIORITIES } from '@/lib/contracts/task';
import { useCreateTask } from '@/lib/api/tasks';
import { useGetGroups } from '@/lib/api/groups';
import { STATUS, PRIORITY } from '@/lib/ui/palette';
import { toISODate, fromISODate } from '@/lib/ui/date';

const STATUS_DATA = TASK_STATUSES.map((s) => ({ value: s, label: STATUS[s].label }));
const PRIORITY_DATA = TASK_PRIORITIES.map((p) => ({ value: p, label: PRIORITY[p].label }));

export function AddTaskModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { mutateAsync } = useCreateTask();
  const { data: groups } = useGetGroups();
  const GROUP_DATA = useMemo(() => (groups ?? []).map((g) => ({ value: g.key, label: g.title })), [groups]);
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: '',
      group: 'foundation',
      status: 'pend',
      priority: 'med',
      startDate: '',
      endDate: '',
      owner: 'PMO Team',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutateAsync(values);
      notifications.show({ message: 'เพิ่มงานเรียบร้อยแล้ว', color: 'green' });
      reset();
      onClose();
    } catch {
      notifications.show({ message: 'ไม่สามารถเพิ่มงานได้', color: 'red' });
    }
  });

  return (
    <Modal opened={opened} onClose={onClose} title="เพิ่มงานใหม่" size="lg" centered radius="lg">
      <form onSubmit={onSubmit}>
        <Stack gap="md">
          <TextInput
            label="ชื่องาน (Title)"
            placeholder="เช่น ตั้งค่า Webhook แจ้งเตือน"
            error={errors.title?.message}
            {...register('title')}
          />
          <Group grow align="flex-start">
            <Controller
              control={control}
              name="group"
              render={({ field }) => (
                <Select label="กลุ่ม / Flow" data={GROUP_DATA} value={field.value} onChange={(v) => field.onChange(v)} allowDeselect={false} />
              )}
            />
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select label="สถานะ" data={STATUS_DATA} value={field.value} onChange={(v) => field.onChange(v)} allowDeselect={false} />
              )}
            />
          </Group>
          <Group grow align="flex-start">
            <Controller
              control={control}
              name="startDate"
              render={({ field }) => (
                <DatePickerInput
                  type="range"
                  label="ช่วงเวลา"
                  placeholder="เลือกวันเริ่มต้น – วันสิ้นสุด"
                  valueFormat="D MMM YYYY"
                  value={[fromISODate(field.value), fromISODate(watch('endDate'))]}
                  onChange={([start, end]) => {
                    setValue('startDate', toISODate(start) ?? '', { shouldValidate: true });
                    setValue('endDate', toISODate(end) ?? '', { shouldValidate: true });
                  }}
                  error={errors.startDate?.message ?? errors.endDate?.message}
                  popoverProps={{ withinPortal: true }}
                  clearable
                />
              )}
            />
            <Controller
              control={control}
              name="priority"
              render={({ field }) => (
                <Select label="ความสำคัญ" data={PRIORITY_DATA} value={field.value} onChange={(v) => field.onChange(v)} allowDeselect={false} />
              )}
            />
          </Group>
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit" loading={isSubmitting}>
              เพิ่มงาน
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
