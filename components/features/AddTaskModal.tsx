'use client';

import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Group, Modal, Select, Stack, Textarea, TextInput } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { createTaskSchema, type CreateTaskInput, type Task, TASK_STATUSES, TASK_PRIORITIES } from '@/lib/contracts/task';
import { useCreateTask, useUpdateTask } from '@/lib/api/tasks';
import { useGetGroups } from '@/lib/api/groups';
import { STATUS, PRIORITY } from '@/lib/ui/palette';
import { toISODate, fromISODate } from '@/lib/ui/date';

const STATUS_DATA = TASK_STATUSES.map((s) => ({ value: s, label: STATUS[s].label }));
const PRIORITY_DATA = TASK_PRIORITIES.map((p) => ({ value: p, label: PRIORITY[p].label }));

const EMPTY: CreateTaskInput = {
  title: '',
  desc: '',
  group: 'foundation',
  status: 'pend',
  priority: 'med',
  startDate: '',
  endDate: '',
  owner: 'PMO Team',
};

export function AddTaskModal({
  opened,
  onClose,
  editing,
}: {
  opened: boolean;
  onClose: () => void;
  editing?: Task | null;
}) {
  const { mutateAsync: createTask } = useCreateTask();
  const { mutateAsync: updateTask } = useUpdateTask();
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
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (opened) {
      reset(
        editing
          ? {
              title: editing.title,
              desc: editing.desc ?? '',
              group: editing.group,
              status: editing.status,
              priority: editing.priority,
              startDate: editing.startDate ?? '',
              endDate: editing.endDate ?? '',
              owner: editing.owner,
            }
          : EMPTY,
      );
    }
  }, [opened, editing, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (editing) {
        await updateTask({ id: editing.id, data: values });
        notifications.show({ message: 'บันทึกการแก้ไขแล้ว', color: 'green' });
      } else {
        await createTask(values);
        notifications.show({ message: 'เพิ่มงานเรียบร้อยแล้ว', color: 'green' });
      }
      onClose();
    } catch {
      notifications.show({ message: editing ? 'บันทึกไม่สำเร็จ' : 'ไม่สามารถเพิ่มงานได้', color: 'red' });
    }
  });

  return (
    <Modal opened={opened} onClose={onClose} title={editing ? 'แก้ไขงาน' : 'เพิ่มงานใหม่'} size="lg" centered radius="lg">
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
          <Textarea
            label="รายละเอียด (Detail)"
            placeholder="อธิบายรายละเอียดของงาน..."
            minRows={4}
            autosize
            error={errors.desc?.message}
            {...register('desc')}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editing ? 'บันทึก' : 'เพิ่มงาน'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
