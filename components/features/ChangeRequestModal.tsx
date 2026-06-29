'use client';

import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Group, Modal, Select, Stack, Textarea, TextInput } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import {
  createChangeRequestSchema,
  type CreateChangeRequestInput,
  type ChangeRequest,
  CR_STATUSES,
} from '@/lib/contracts/change-request';
import { useCreateChangeRequest, useUpdateChangeRequest } from '@/lib/api/change-requests';
import { useGetGroups } from '@/lib/api/groups';
import { CR_STATUS } from '@/lib/ui/palette';
import { toISODate, fromISODate } from '@/lib/ui/date';

const STATUS_DATA = CR_STATUSES.map((s) => ({ value: s, label: CR_STATUS[s].label }));

export function ChangeRequestModal({
  opened,
  onClose,
  editing,
}: {
  opened: boolean;
  onClose: () => void;
  editing?: ChangeRequest | null;
}) {
  const { mutateAsync: createCr } = useCreateChangeRequest();
  const { mutateAsync: updateCr } = useUpdateChangeRequest();
  const { data: groups } = useGetGroups();
  const FLOW_DATA = useMemo(() => (groups ?? []).map((g) => ({ value: g.key, label: g.title })), [groups]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateChangeRequestInput>({
    resolver: zodResolver(createChangeRequestSchema),
    defaultValues: { title: '', desc: '', flow: 'foundation', status: 'open', startDate: null, endDate: null },
  });

  useEffect(() => {
    if (opened) {
      reset(
        editing
          ? {
              title: editing.title,
              desc: editing.desc,
              flow: editing.flow,
              status: editing.status,
              startDate: editing.startDate ?? null,
              endDate: editing.endDate ?? null,
            }
          : { title: '', desc: '', flow: 'foundation', status: 'open', startDate: null, endDate: null },
      );
    }
  }, [opened, editing, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (editing) {
        await updateCr({ id: editing.id, data: values });
        notifications.show({ message: 'บันทึกการเปลี่ยนแปลงแล้ว', color: 'green' });
      } else {
        await createCr(values);
        notifications.show({ message: 'เพิ่มคำขอเปลี่ยนแปลงแล้ว', color: 'green' });
      }
      onClose();
    } catch {
      notifications.show({ message: 'บันทึกไม่สำเร็จ', color: 'red' });
    }
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editing ? 'แก้ไขคำขอเปลี่ยนแปลง' : 'เพิ่มคำขอเปลี่ยนแปลง'}
      size="lg"
      centered
      radius="lg"
    >
      <form onSubmit={onSubmit}>
        <Stack gap="md">
          <TextInput
            label="หัวข้อ (Title)"
            placeholder="เช่น รองรับ partial receipt มากกว่า 100%"
            error={errors.title?.message}
            {...register('title')}
          />
          <Group grow align="flex-start">
            <Controller
              control={control}
              name="flow"
              render={({ field }) => (
                <Select label="กลุ่ม / Flow" data={FLOW_DATA} value={field.value} onChange={(v) => field.onChange(v)} allowDeselect={false} />
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
          <Controller
            control={control}
            name="startDate"
            render={() => (
              <DatePickerInput
                type="range"
                label="ช่วงเวลา"
                placeholder="เลือกวันเริ่มต้น – วันสิ้นสุด"
                valueFormat="D MMM YYYY"
                value={[fromISODate(watch('startDate')), fromISODate(watch('endDate'))]}
                onChange={([start, end]) => {
                  setValue('startDate', toISODate(start), { shouldValidate: true });
                  setValue('endDate', toISODate(end), { shouldValidate: true });
                }}
                error={errors.startDate?.message ?? errors.endDate?.message}
                popoverProps={{ withinPortal: true }}
                clearable
                w="50%"
              />
            )}
          />
          <Textarea
            label="รายละเอียด (Detail)"
            placeholder="อธิบายการเปลี่ยนแปลงที่ต้องการ..."
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
              บันทึก
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
