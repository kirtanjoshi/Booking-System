'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Title,
  Text,
  Paper,
  Group,
  Stack,
  Badge,
  ActionIcon,
  Loader,
  Center,
  SimpleGrid,
  Box,
  Divider,
  TextInput,
  Avatar,
  Button,
} from '@mantine/core';
import {
  IconUsers,
  IconRefresh,
  IconSearch,
  IconCalendarTime,
  IconMapPin,
  IconClock,
  IconHistory,
  IconBrandWhatsapp,
} from '@tabler/icons-react';
import { fetchApi } from '../../lib/api';

interface ClientItem {
  id: string;
  phoneNumber: string;
  name?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  notes?: string;
  createdAt: string;
  bookings?: {
    id: string;
    scheduledStart: string;
    status: string;
    sessionType?: {
      name: string;
    };
  }[];
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/clients');
      setClients(data || []);
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.phoneNumber.toLowerCase().includes(q) ||
        c.birthPlace?.toLowerCase().includes(q),
    );
  }, [clients, searchQuery]);

  return (
    <Stack gap="xl" maw={1200} mx="auto">
      {/* Header */}
      <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title order={2} style={{ color: '#0F172A', letterSpacing: '-0.03em', fontWeight: 800 }}>
            Client Directory & Records
          </Title>
          <Text size="sm" c="#64748B" mt={2}>
            Comprehensive client profiles, consultation records, and communication logs
          </Text>
        </div>

        <Group gap="sm" wrap="wrap" style={{ flexShrink: 0 }}>
          <TextInput
            placeholder="Search by name, phone, city..."
            leftSection={<IconSearch size={16} color="#94A3B8" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            size="sm"
            style={{ width: 280, maxWidth: '100%' }}
            styles={{
              input: {
                background: '#FFFFFF',
                borderColor: '#E2E8F0',
                color: '#0F172A',
                borderRadius: 10,
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              },
            }}
          />

          <Button
            variant="default"
            size="sm"
            leftSection={<IconRefresh size={16} />}
            onClick={loadClients}
            loading={loading}
            style={{
              borderColor: '#E2E8F0',
              borderRadius: 10,
              fontWeight: 600,
              color: '#334155',
            }}
          >
            Refresh
          </Button>
        </Group>
      </Box>

      {loading ? (
        <Center p={60}>
          <Loader color="blue" size="md" />
        </Center>
      ) : filteredClients.length === 0 ? (
        <Paper p={60} className="saas-card">
          <Center>
            <Stack align="center" gap="sm">
              <Box
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconUsers size={28} color="#2563EB" />
              </Box>
              <Text fw={700} size="md" c="#0F172A">
                No clients found
              </Text>
              <Text size="xs" c="#64748B" ta="center" maw={380}>
                {searchQuery
                  ? 'No clients match your search query.'
                  : 'When clients message via WhatsApp or an appointment is scheduled, their client records will appear here.'}
              </Text>
            </Stack>
          </Center>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          {filteredClients.map((client) => {
            const bookings = client.bookings || [];
            const clientName = client.name || 'Anonymous Client';
            const initials = clientName.substring(0, 2).toUpperCase();
            const cleanPhone = client.phoneNumber.replace(/[^0-9+]/g, '');

            return (
              <Paper key={client.id} p="lg" className="saas-card">
                <Stack gap="md">
                  {/* Top Client Header */}
                  <Group justify="space-between" align="center">
                    <Group gap="sm">
                      <Avatar
                        size={42}
                        radius="md"
                        styles={{
                          placeholder: {
                            background: '#EFF6FF',
                            color: '#2563EB',
                            fontSize: 13,
                            fontWeight: 700,
                            border: '1px solid #DBEAFE',
                          },
                        }}
                      >
                        {initials}
                      </Avatar>
                      <div>
                        <Text fw={700} size="sm" c="#0F172A">
                          {clientName}
                        </Text>
                        <Text size="xs" c="#64748B">
                          {client.phoneNumber}
                        </Text>
                      </div>
                    </Group>

                    <Group gap={8}>
                      <span className="badge-pill badge-pending" style={{ fontSize: 11, fontWeight: 700 }}>
                        {bookings.length} Session{bookings.length !== 1 ? 's' : ''}
                      </span>
                      <ActionIcon
                        component="a"
                        href={`https://wa.me/${cleanPhone.replace('+', '')}`}
                        target="_blank"
                        rel="noreferrer"
                        variant="light"
                        color="teal"
                        size="md"
                        radius="md"
                        style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #DCFCE7' }}
                      >
                        <IconBrandWhatsapp size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>

                  <Divider color="#F1F5F9" />

                  {/* Profile & Location Details */}
                  <Box>
                    <Text size="xs" fw={700} c="#94A3B8" tt="uppercase" style={{ letterSpacing: '0.05em' }} mb={8}>
                      Client Information & Profile
                    </Text>

                    <SimpleGrid cols={2} spacing="xs">
                      <Group gap={6}>
                        <IconCalendarTime size={14} color="#2563EB" />
                        <Text size="xs" c="#334155">
                          DOB: <span style={{ fontWeight: 600 }}>{client.birthDate || 'Not specified'}</span>
                        </Text>
                      </Group>

                      <Group gap={6}>
                        <IconClock size={14} color="#2563EB" />
                        <Text size="xs" c="#334155">
                          Time: <span style={{ fontWeight: 600 }}>{client.birthTime || 'Unknown'}</span>
                        </Text>
                      </Group>

                      <Group gap={6} style={{ gridColumn: 'span 2' }}>
                        <IconMapPin size={14} color="#2563EB" />
                        <Text size="xs" c="#334155">
                          Location: <span style={{ fontWeight: 600 }}>{client.birthPlace || 'Not specified'}</span>
                        </Text>
                      </Group>
                    </SimpleGrid>

                    {client.notes && (
                      <Box
                        mt="xs"
                        p={10}
                        style={{
                          background: '#F8FAFC',
                          borderRadius: 8,
                          borderLeft: '3px solid #2563EB',
                        }}
                      >
                        <Text size="11px" c="#64748B" style={{ fontStyle: 'italic' }}>
                          "{client.notes}"
                        </Text>
                      </Box>
                    )}
                  </Box>

                  <Divider color="#F1F5F9" />

                  {/* Consultation History */}
                  <Box>
                    <Group gap={6} mb={6}>
                      <IconHistory size={14} color="#64748B" />
                      <Text size="xs" fw={700} c="#64748B">
                        Recent Consultations
                      </Text>
                    </Group>

                    {bookings.length === 0 ? (
                      <Text size="11px" c="#94A3B8" style={{ fontStyle: 'italic' }}>
                        No consultations recorded yet.
                      </Text>
                    ) : (
                      <Stack gap={6}>
                        {bookings.slice(0, 3).map((b) => {
                          const badgeClass =
                            b.status === 'CONFIRMED'
                              ? 'badge-confirmed'
                              : b.status === 'PENDING'
                              ? 'badge-pending'
                              : 'badge-cancelled';
                          return (
                            <Group key={b.id} justify="space-between">
                              <Text size="xs" c="#334155">
                                <span style={{ fontWeight: 600 }}>
                                  {new Date(b.scheduledStart).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>{' '}
                                — {b.sessionType?.name || 'Consultation'}
                              </Text>
                              <span className={`badge-pill ${badgeClass}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                                {b.status}
                              </span>
                            </Group>
                          );
                        })}
                      </Stack>
                    )}
                  </Box>
                </Stack>
              </Paper>
            );
          })}
        </SimpleGrid>
      )}
    </Stack>
  );
}

