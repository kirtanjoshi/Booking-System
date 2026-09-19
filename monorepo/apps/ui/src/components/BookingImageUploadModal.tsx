'use client';

import React, { useState } from 'react';
import {
  Modal,
  Button,
  TextInput,
  Stack,
  Text,
  Group,
  Alert,
  Image,
} from '@mantine/core';
import { IconPhotoPlus, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { fetchApi } from '../lib/api';

interface BookingImageUploadModalProps {
  opened: boolean;
  onClose: () => void;
  bookingId?: string;
  booking?: { id: string } | null;
  onImageAdded?: (imageUrl: string) => void;
  onSuccess?: () => void;
}

export function BookingImageUploadModal({
  opened,
  onClose,
  bookingId,
  booking,
  onImageAdded,
  onSuccess,
}: BookingImageUploadModalProps) {
  const activeId = bookingId || booking?.id || '';
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!imageUrl.trim()) {
      setError('Please enter a valid image URL');
      return;
    }
    if (!activeId) return;

    try {
      setLoading(true);
      setError(null);
      await fetchApi(`/bookings/${activeId}/images`, {
        method: 'POST',
        body: JSON.stringify({ imageUrl: imageUrl.trim() }),
      });
      if (onImageAdded) onImageAdded(imageUrl.trim());
      if (onSuccess) onSuccess();
      setImageUrl('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to attach image');
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
          <IconPhotoPlus size={20} color="#2563EB" />
          <Text fw={700} c="#0F172A">
            Attach Document / Chart Image
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
          Attach a client document, chart file, or reference diagram to this consultation booking.
        </Text>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            {error}
          </Alert>
        )}

        <TextInput
          label="Image URL"
          placeholder="https://images.unsplash.com/... or hosted URL"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          styles={{
            input: {
              background: '#FFFFFF',
              borderColor: '#CBD5E1',
              color: '#0F172A',
              borderRadius: 8,
            },
            label: { color: '#0F172A', fontWeight: 600, fontSize: 13, marginBottom: 4 },
          }}
        />

        {imageUrl && (
          <div style={{ maxHeight: 200, overflow: 'hidden', borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <Image
              src={imageUrl}
              alt="Preview"
              height={180}
              fit="contain"
              fallbackSrc="https://placehold.co/400x200?text=Invalid+Image+URL"
            />
          </div>
        )}

        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" color="gray" onClick={onClose} style={{ borderRadius: 8 }}>
            Cancel
          </Button>
          <Button
            leftSection={<IconCheck size={16} />}
            color="blue"
            loading={loading}
            onClick={handleUpload}
            style={{
              background: '#2563EB',
              borderRadius: 8,
              fontWeight: 700,
            }}
          >
            Attach Image
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

