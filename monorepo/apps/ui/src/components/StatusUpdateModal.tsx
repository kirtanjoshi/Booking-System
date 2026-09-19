'use client';

import React, { useState } from 'react';
import {
  Modal,
  Button,
  Textarea,
  Text,
  Group,
  Stack,
  Alert,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconSend, IconClock } from '@tabler/icons-react';
import { fetchApi } from '../lib/api';
import { useAuth } from '../lib/auth-context';

interface Props {
  opened: boolean;
  onClose: () => void;
}

export function StatusUpdateModal({ opened, onClose }: Props) {
  const { admin } = useAuth();
  const [message, setMessage] = useState('I am running approximately 15 minutes behind schedule.');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!admin?.id) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetchApi(`/admins/${admin.id}/status-update`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });

      notifications.show({
        title: 'Status Update Sent',
        message: `Dispatched to ${res.recipient?.name || 'next client'} via WhatsApp (${res.delivery?.messageType || 'WhatsApp'}).`,
        color: 'teal',
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch status update');
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
          <IconClock size={20} color="#818CF8" />
          <Text fw={700} c="#F8FAFC">
            Broadcast Delay / Status Notice
          </Text>
        </Group>
      }
      styles={{
        content: { background: '#111827', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 12 },
        header: { background: '#111827' },
      }}
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          This message will be sent to whichever client has the <strong>next upcoming confirmed booking today</strong> via WhatsApp (using the 24-hour service window rules).
        </Text>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" radius="md">
            {error}
          </Alert>
        )}

        <Textarea
          label="Message Text"
          placeholder="e.g. Running 15 minutes late due to an extended consultation."
          minRows={3}
          value={message}
          onChange={(e) => setMessage(e.currentTarget.value)}
          styles={{
            input: { background: 'rgba(10, 15, 29, 0.8)', borderColor: 'rgba(255, 255, 255, 0.1)', color: '#F8FAFC', borderRadius: 8 },
          }}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" color="gray" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            color="indigo"
            leftSection={<IconSend size={16} />}
            onClick={handleSend}
            loading={loading}
            style={{
              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            }}
          >
            Dispatch WhatsApp Update
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
