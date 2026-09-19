'use client';

import React, { useState } from 'react';
import {
  Modal,
  Button,
  TextInput,
  Text,
  Group,
  Stack,
  Alert,
  Paper,
  Badge,
} from '@mantine/core';
import { IconAlertTriangle, IconMessageShare } from '@tabler/icons-react';
import { fetchApi } from '../lib/api';

interface BookingData {
  id: string;
  client: {
    name?: string;
    phoneNumber: string;
  };
  sessionType: {
    name: string;
  };
  scheduledStart: string;
}

interface Props {
  booking: BookingData | null;
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CancelBookingModal({ booking, opened, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState('Personal emergency / schedule conflict');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!booking) return null;

  const dateFormatted = new Date(booking.scheduledStart).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const previewMessage = `Namaste ${booking.client.name || ''}, your consultation for ${dateFormatted} (${booking.sessionType.name}) has been cancelled. Reason: ${reason}. Reply "book" if you wish to reschedule.`;

  const handleCancel = async () => {
    setLoading(true);
    setError(null);

    try {
      await fetchApi(`/bookings/${booking.id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ cancelledReason: reason }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconAlertTriangle size={20} color="#F87171" />
          <Text fw={600} c="red.4">
            Cancel Consultation
          </Text>
        </Group>
      }
      styles={{
        content: { background: '#111827', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12 },
        header: { background: '#111827' },
      }}
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="#E2E8F0">
          Are you sure you want to cancel the consultation with{' '}
          <strong>{booking.client.name || booking.client.phoneNumber}</strong>?
        </Text>

        <TextInput
          label="Reason for Cancellation"
          placeholder="e.g. Schedule conflict or emergency"
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value)}
          required
          styles={{
            input: { background: 'rgba(10, 15, 29, 0.8)', borderColor: 'rgba(255, 255, 255, 0.1)', color: '#F8FAFC', borderRadius: 8 },
          }}
        />

        <div>
          <Group justify="space-between" mb={4}>
            <Text size="xs" fw={600} c="dimmed">
              OUTGOING WHATSAPP PREVIEW
            </Text>
            <Badge size="xs" color="teal" variant="light">
              Auto-Notification
            </Badge>
          </Group>
          <Paper
            p="sm"
            style={{
              background: 'rgba(10, 15, 29, 0.9)',
              border: '1px dashed rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
            }}
          >
            <Group gap="xs" mb={4}>
              <IconMessageShare size={14} color="#10B981" />
              <Text size="xs" c="teal" fw={600}>
                Will be dispatched to {booking.client.phoneNumber}
              </Text>
            </Group>
            <Text size="xs" c="#E2E8F0" style={{ fontStyle: 'italic', lineHeight: 1.5 }}>
              "{previewMessage}"
            </Text>
          </Paper>
        </div>

        {error && (
          <Alert color="red" variant="light" radius="md">
            {error}
          </Alert>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" color="gray" onClick={onClose} disabled={loading}>
            Dismiss
          </Button>
          <Button color="red" onClick={handleCancel} loading={loading} style={{ borderRadius: 8 }}>
            Confirm Cancellation
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
