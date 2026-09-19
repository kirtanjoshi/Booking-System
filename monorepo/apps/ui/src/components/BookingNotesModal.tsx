'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Textarea,
  Stack,
  Text,
  Group,
  Alert,
} from '@mantine/core';
import { IconNotes, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { fetchApi } from '../lib/api';

interface BookingNotesModalProps {
  opened: boolean;
  onClose: () => void;
  bookingId?: string;
  booking?: { id: string; notes?: string } | null;
  initialNotes?: string;
  onSaved?: (notes: string) => void;
  onSuccess?: () => void;
}

export function BookingNotesModal({
  opened,
  onClose,
  bookingId,
  booking,
  initialNotes = '',
  onSaved,
  onSuccess,
}: BookingNotesModalProps) {
  const activeId = bookingId || booking?.id || '';
  const currentNotes = initialNotes || booking?.notes || '';
  const [notes, setNotes] = useState(currentNotes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNotes(currentNotes);
  }, [currentNotes, opened]);

  const handleSave = async () => {
    if (!activeId) return;
    try {
      setLoading(true);
      setError(null);
      await fetchApi(`/bookings/${activeId}/notes`, {
        method: 'PATCH',
        body: JSON.stringify({ notes }),
      });
      if (onSaved) onSaved(notes);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save notes');
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
          <IconNotes size={20} color="#2563EB" />
          <Text fw={700} c="#0F172A">
            Consultation & Chart Notes
          </Text>
        </Group>
      }
      styles={{
        content: { background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#0F172A', borderRadius: 14 },
        header: { background: '#FFFFFF', borderBottom: '1px solid #F1F5F9' },
      }}
    >
      <Stack gap="md" pt="xs">
        <Text size="sm" c="#64748B">
          Add consultation notes, client questions, or session follow-up items for this appointment.
        </Text>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            {error}
          </Alert>
        )}

        <Textarea
          placeholder="Enter consultation findings, client queries, and follow-up guidance..."
          minRows={5}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          styles={{
            input: {
              background: '#FFFFFF',
              borderColor: '#CBD5E1',
              color: '#0F172A',
              borderRadius: 8,
            },
          }}
        />

        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" color="gray" onClick={onClose} style={{ borderRadius: 8 }}>
            Cancel
          </Button>
          <Button
            leftSection={<IconCheck size={16} />}
            color="blue"
            loading={loading}
            onClick={handleSave}
            style={{
              background: '#2563EB',
              borderRadius: 8,
              fontWeight: 700,
            }}
          >
            Save Notes
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

