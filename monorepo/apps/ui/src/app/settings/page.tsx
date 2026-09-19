'use client';

import React from 'react';
import {
  Container,
  Title,
  Text,
  Stack,
  Paper,
  Group,
  Avatar,
  Badge,
  Box,
} from '@mantine/core';
import { IconUserCircle, IconShieldLock, IconSparkles } from '@tabler/icons-react';
import { useAuth } from '../../lib/auth-context';
import { WhatsAppConnectCard } from '../../components/WhatsAppConnectCard';

export default function SettingsPage() {
  const { admin } = useAuth();
  const initials = admin?.name ? admin.name.substring(0, 2).toUpperCase() : 'AD';

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={2} style={{ color: '#0F172A', letterSpacing: '-0.03em', fontWeight: 800 }}>
            Settings & Integrations
          </Title>
          <Text size="sm" c="#64748B" mt={2}>
            Manage your practitioner profile and Meta WhatsApp Cloud API messaging infrastructure
          </Text>
        </div>

        {/* Profile Card */}
        <Paper p="lg" className="saas-card" radius="lg">
          <Group justify="space-between" wrap="wrap" gap="md">
            <Group gap="md">
              <Avatar
                size={54}
                radius="md"
                styles={{
                  placeholder: {
                    background: '#EFF6FF',
                    color: '#2563EB',
                    fontSize: 18,
                    fontWeight: 800,
                    border: '1px solid #DBEAFE',
                  },
                }}
              >
                {initials}
              </Avatar>
              <div>
                <Group gap="xs" align="center">
                  <Text fw={700} size="md" c="#0F172A">
                    {admin?.name || 'Administrator'}
                  </Text>
                  <Badge color="blue" variant="light" size="sm">
                    Admin
                  </Badge>
                </Group>
                <Text size="sm" c="#64748B" mt={2}>
                  {admin?.businessName || 'Aura Practice Consultation'} &bull; {admin?.phoneNumber}
                </Text>
                <Text size="xs" c="#94A3B8">
                  Timezone: {admin?.timezone || 'Asia/Kathmandu'}
                </Text>
              </div>
            </Group>

            <span className="badge-pill badge-confirmed" style={{ fontSize: 11 }}>
              <IconShieldLock size={13} style={{ marginRight: 4 }} />
              Session Authenticated
            </span>
          </Group>
        </Paper>

        {/* WhatsApp Integration */}
        <WhatsAppConnectCard />
      </Stack>
    </Container>
  );
}


