'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Title,
  Text,
  Paper,
  Table,
  Badge,
  Button,
  Group,
  Stack,
  ActionIcon,
  Loader,
  Center,
  Box,
  SimpleGrid,
  TextInput,
  Avatar,
  Tooltip,
  Card,
} from '@mantine/core';
import {
  IconRefresh,
  IconCalendarEvent,
  IconBan,
  IconBrandWhatsapp,
  IconClock,
  IconSearch,
  IconUsers,
  IconNotes,
  IconPhoto,
  IconCalendarCheck,
  IconChecklist,
  IconArrowUpRight,
  IconDotsVertical,
  IconSparkles,
} from '@tabler/icons-react';
import { fetchApi } from '../lib/api';
import { CancelBookingModal } from '../components/CancelBookingModal';
import { BookingNotesModal } from '../components/BookingNotesModal';
import { BookingImageUploadModal } from '../components/BookingImageUploadModal';

interface Booking {
  id: string;
  client: {
    name?: string;
    phoneNumber: string;
    birthDate?: string;
    birthTime?: string;
    birthPlace?: string;
  };
  sessionType: {
    name: string;
    durationMinutes: number;
    bufferMinutes: number;
  };
  scheduledStart: string;
  scheduledEnd: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  source: 'WHATSAPP' | 'ADMIN';
  cancelledReason?: string;
  notes?: string;
  imageUrls?: string[];
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'today' | 'upcoming' | 'all'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<Booking | null>(null);
  const [selectedBookingForNotes, setSelectedBookingForNotes] = useState<Booking | null>(null);
  const [selectedBookingForImages, setSelectedBookingForImages] = useState<Booking | null>(null);

  useEffect(() => {
    loadBookings();
  }, [activeTab]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      let query = '';
      if (activeTab === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        query = `?date=${todayStr}`;
      } else if (activeTab === 'upcoming') {
        query = '?upcomingOnly=true';
      }

      const data = await fetchApi(`/bookings${query}`);
      setBookings(data || []);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) return bookings;
    const q = searchQuery.toLowerCase();
    return bookings.filter(
      (b) =>
        b.client.name?.toLowerCase().includes(q) ||
        b.client.phoneNumber.toLowerCase().includes(q) ||
        b.sessionType?.name.toLowerCase().includes(q),
    );
  }, [bookings, searchQuery]);

  // Compute stats for KPI cards (like Image 1 YowTrip)
  const stats = useMemo(() => {
    const total = bookings.length;
    const confirmed = bookings.filter((b) => b.status === 'CONFIRMED').length;
    const completed = bookings.filter((b) => b.status === 'COMPLETED').length;
    const whatsapp = bookings.filter((b) => b.source === 'WHATSAPP').length;
    const rate = total > 0 ? Math.round((confirmed / total) * 100) : 100;
    return { total, confirmed, completed, whatsapp, rate };
  }, [bookings]);

  // Next upcoming booking for Featured Hero Card (like Image 2)
  const nextBooking = useMemo(() => {
    const active = bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING');
    if (active.length === 0) return null;
    return [...active].sort(
      (a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime(),
    )[0];
  }, [bookings]);

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <Badge className="badge-confirmed">Confirmed</Badge>;
      case 'PENDING':
        return <Badge className="badge-pending">Pending</Badge>;
      case 'CANCELLED':
        return <Badge className="badge-cancelled">Cancelled</Badge>;
      case 'COMPLETED':
        return <Badge className="badge-completed">Completed</Badge>;
      default:
        return <Badge variant="light" color="gray">{status}</Badge>;
    }
  };

  return (
    <Stack gap="xl" maw={1300} mx="auto">
      {/* Top Underline Navigation Tabs (Like YowTrip & EcoJourney) */}
      <Group justify="space-between" align="center" style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: 12 }}>
        <Group gap="xl">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'today', label: "Today's Schedule" },
            { key: 'upcoming', label: 'Upcoming Consultations' },
            { key: 'all', label: 'All Records' },
          ].map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Box
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  cursor: 'pointer',
                  paddingBottom: 8,
                  marginBottom: -13,
                  borderBottom: active ? '3px solid #2563EB' : '3px solid transparent',
                  color: active ? '#2563EB' : '#64748B',
                  fontWeight: active ? 700 : 500,
                  fontSize: 14,
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </Box>
            );
          })}
        </Group>

        <Button
          variant="light"
          color="blue"
          size="xs"
          leftSection={<IconRefresh size={14} />}
          onClick={loadBookings}
          loading={loading}
          styles={{ root: { borderRadius: 8 } }}
        >
          Refresh Data
        </Button>
      </Group>

      {/* KPI Stats Cards Row with Progress Bars (Matching Image 1 YowTrip) */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
        <Paper p="lg" className="saas-card">
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="xs" fw={700} c="#64748B" tt="uppercase" style={{ letterSpacing: '0.04em' }}>
                Consultations in View
              </Text>
              <Text size="xl" fw={800} c="#0F172A" mt={4}>
                {stats.total}{' '}
                <Text component="span" size="xs" c="dimmed" fw={500}>
                  sessions
                </Text>
              </Text>
            </div>
            <ActionIcon variant="light" color="blue" size="md" radius="md">
              <IconCalendarEvent size={18} />
            </ActionIcon>
          </Group>
          <Box mt="md" className="mini-progress-bar">
            <Box className="mini-progress-bar-fill" style={{ width: `${Math.min(stats.total * 15, 100)}%` }} />
          </Box>
          <Text size="11px" c="dimmed" mt={6}>
            Active schedule window
          </Text>
        </Paper>

        <Paper p="lg" className="saas-card">
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="xs" fw={700} c="#64748B" tt="uppercase" style={{ letterSpacing: '0.04em' }}>
                Confirmation Rate
              </Text>
              <Text size="xl" fw={800} c="#0F172A" mt={4}>
                {stats.rate}%{' '}
                <Text component="span" size="xs" c="#10B981" fw={600}>
                  ({stats.confirmed} confirmed)
                </Text>
              </Text>
            </div>
            <ActionIcon variant="light" color="teal" size="md" radius="md">
              <IconChecklist size={18} />
            </ActionIcon>
          </Group>
          <Box mt="md" className="mini-progress-bar">
            <Box className="mini-progress-bar-striped" style={{ width: `${stats.rate}%` }} />
          </Box>
          <Text size="11px" c="dimmed" mt={6}>
            Real-time lock integrity
          </Text>
        </Paper>

        <Paper p="lg" className="saas-card">
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="xs" fw={700} c="#64748B" tt="uppercase" style={{ letterSpacing: '0.04em' }}>
                WhatsApp Inbound
              </Text>
              <Text size="xl" fw={800} c="#0F172A" mt={4}>
                {stats.whatsapp}{' '}
                <Text component="span" size="xs" c="dimmed" fw={500}>
                  via bot
                </Text>
              </Text>
            </div>
            <ActionIcon variant="light" color="cyan" size="md" radius="md">
              <IconBrandWhatsapp size={18} />
            </ActionIcon>
          </Group>
          <Box mt="md" className="mini-progress-bar">
            <Box className="mini-progress-bar-fill" style={{ width: `${stats.total > 0 ? (stats.whatsapp / stats.total) * 100 : 80}%`, background: '#0284C7' }} />
          </Box>
          <Text size="11px" c="dimmed" mt={6}>
            Direct Meta Cloud API
          </Text>
        </Paper>

        <Paper p="lg" className="saas-card">
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="xs" fw={700} c="#64748B" tt="uppercase" style={{ letterSpacing: '0.04em' }}>
                Practice Readiness
              </Text>
              <Text size="xl" fw={800} c="#0F172A" mt={4}>
                Active{' '}
                <Text component="span" size="xs" c="#10B981" fw={600}>
                  Ready
                </Text>
              </Text>
            </div>
            <ActionIcon variant="light" color="indigo" size="md" radius="md">
              <IconUsers size={18} />
            </ActionIcon>
          </Group>
          <Box mt="md" className="mini-progress-bar">
            <Box className="mini-progress-bar-fill" style={{ width: '100%', background: '#10B981' }} />
          </Box>
          <Text size="11px" c="dimmed" mt={6}>
            Automated calendar syncing
          </Text>
        </Paper>
      </SimpleGrid>

      {/* Main Grid: Left Featured Hero & Summary + Right Table (Matching Image 2 & 1) */}
      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg">
        {/* Left Column (Hero Card like Image 2 + Receipt Summary like Image 1) */}
        <Stack gap="lg" style={{ gridColumn: 'span 1' }}>
          {/* Featured Next Appointment Card (Like Image 2 Apartment Card) */}
          <Paper
            p={0}
            className="saas-card"
            style={{ overflow: 'hidden', border: '1px solid #E2E8F0' }}
          >
            <Box
              p="lg"
              style={{
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                color: '#FFFFFF',
              }}
            >
              <Group justify="space-between" align="center">
                <Badge color="blue" variant="filled" size="sm" styles={{ root: { background: 'rgba(255,255,255,0.2)', color: '#FFFFFF' } }}>
                  NEXT SESSION
                </Badge>
                <IconSparkles size={18} color="#93C5FD" />
              </Group>

              <Text fw={800} size="lg" mt="md" style={{ letterSpacing: '-0.02em', color: '#FFFFFF' }}>
                {nextBooking?.client.name || 'Upcoming Consultation'}
              </Text>
              <Text size="xs" style={{ color: '#BFDBFE' }}>
                {nextBooking?.sessionType.name || 'Full Consultation'} &bull; {nextBooking?.sessionType.durationMinutes || 60} mins
              </Text>

              {nextBooking && (
                <Group gap={6} mt="sm">
                  <IconClock size={14} color="#BFDBFE" />
                  <Text size="xs" style={{ color: '#FFFFFF', fontWeight: 600 }}>
                    {new Date(nextBooking.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                    {new Date(nextBooking.scheduledStart).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </Text>
                </Group>
              )}
            </Box>

            <Box p="md" style={{ background: '#FFFFFF' }}>
              <Group justify="space-between" align="center">
                <div>
                  <Text size="11px" c="dimmed" tt="uppercase" fw={600}>
                    Client Contact
                  </Text>
                  <Text size="sm" fw={700} c="#0F172A">
                    {nextBooking?.client.phoneNumber || 'Available'}
                  </Text>
                </div>

                {nextBooking && (
                  <Button
                    size="xs"
                    color="teal"
                    variant="light"
                    component="a"
                    href={`https://wa.me/${nextBooking.client.phoneNumber.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    leftSection={<IconBrandWhatsapp size={14} />}
                    styles={{ root: { borderRadius: 8 } }}
                  >
                    WhatsApp
                  </Button>
                )}
              </Group>
            </Box>
          </Paper>

          {/* Quick Schedule Breakdown (Like Image 1 Right Receipt) */}
          <Paper p="lg" className="saas-card">
            <Group justify="space-between" align="center" mb="sm">
              <Text fw={700} size="sm" c="#0F172A">
                Schedule Breakdown
              </Text>
              <Badge color="gray" variant="light" size="xs">
                {bookings.length} Total
              </Badge>
            </Group>

            {bookings.length === 0 ? (
              <Text size="xs" c="dimmed" ta="center" py="md">
                No active appointments in this timeframe.
              </Text>
            ) : (
              <Stack gap="xs">
                {bookings.slice(0, 4).map((b) => (
                  <Box
                    key={b.id}
                    p="xs"
                    style={{
                      background: '#F8FAFC',
                      borderRadius: 10,
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <Group justify="space-between" align="center">
                      <div>
                        <Text size="xs" fw={700} c="#0F172A">
                          {b.client.name || 'Anonymous Client'}
                        </Text>
                        <Text size="10px" c="dimmed">
                          {new Date(b.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {b.sessionType?.name}
                        </Text>
                      </div>
                      {renderStatusBadge(b.status)}
                    </Group>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Stack>

        {/* Right Column: Invoices/Appointments Data Table (Matching Image 2 Table) */}
        <Stack gap="md" style={{ gridColumn: 'span 2' }}>
          <Paper p="lg" className="saas-card">
            <Group justify="space-between" align="center" mb="md" wrap="wrap" gap="sm">
              <div>
                <Text fw={800} size="md" c="#0F172A" style={{ letterSpacing: '-0.02em' }}>
                  Consultation Appointments
                </Text>
                <Text size="xs" c="dimmed">
                  Real-time schedule records, client communication channels, and status tracking
                </Text>
              </div>

              <TextInput
                placeholder="Search appointments..."
                leftSection={<IconSearch size={15} color="#94A3B8" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                size="xs"
                style={{ width: 230 }}
                styles={{
                  input: {
                    background: '#F8FAFC',
                    borderColor: '#E2E8F0',
                    borderRadius: 8,
                    fontSize: 12,
                  },
                }}
              />
            </Group>

            {loading ? (
              <Center p={60}>
                <Loader color="blue" size="md" />
              </Center>
            ) : filteredBookings.length === 0 ? (
              <Center p={60}>
                <Stack align="center" gap="xs">
                  <IconCalendarCheck size={36} color="#94A3B8" opacity={0.6} />
                  <Text fw={700} size="sm" c="#0F172A">
                    No bookings found
                  </Text>
                  <Text size="xs" c="dimmed">
                    {searchQuery ? 'Try clearing your search query.' : 'There are no consultations scheduled for this tab.'}
                  </Text>
                </Stack>
              </Center>
            ) : (
              <Table verticalSpacing="sm" highlightOnHover>
                <Table.Thead>
                  <Table.Tr style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }}>
                    <Table.Th style={{ color: '#64748B', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Client</Table.Th>
                    <Table.Th style={{ color: '#64748B', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Scheduled Time</Table.Th>
                    <Table.Th style={{ color: '#64748B', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Session Type</Table.Th>
                    <Table.Th style={{ color: '#64748B', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Channel</Table.Th>
                    <Table.Th style={{ color: '#64748B', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</Table.Th>
                    <Table.Th style={{ textAlign: 'right', color: '#64748B', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredBookings.map((booking) => {
                    const start = new Date(booking.scheduledStart);
                    const timeStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const dateStr = start.toLocaleDateString([], { month: 'short', day: 'numeric' });
                    const clientName = booking.client.name || 'Client';
                    const initials = clientName.substring(0, 2).toUpperCase();

                    return (
                      <Table.Tr key={booking.id} style={{ borderColor: '#F1F5F9' }}>
                        <Table.Td>
                          <Group gap="sm">
                            <Avatar
                              size={34}
                              radius="xl"
                              styles={{
                                placeholder: {
                                  background: 'linear-gradient(135deg, #2563EB, #60A5FA)',
                                  color: '#FFFFFF',
                                  fontSize: 11,
                                  fontWeight: 700,
                                },
                              }}
                            >
                              {initials}
                            </Avatar>
                            <div>
                              <Text size="xs" fw={700} c="#0F172A">
                                {clientName}
                              </Text>
                              <Text size="11px" c="dimmed">
                                {booking.client.phoneNumber}
                              </Text>
                            </div>
                          </Group>
                        </Table.Td>

                        <Table.Td>
                          <Text size="xs" fw={600} c="#0F172A">
                            {dateStr}
                          </Text>
                          <Text size="11px" c="dimmed">
                            {timeStr}
                          </Text>
                        </Table.Td>

                        <Table.Td>
                          <Text size="xs" fw={600} c="#0F172A">
                            {booking.sessionType?.name || 'Session'}
                          </Text>
                          <Badge size="xs" variant="light" color="gray">
                            {booking.sessionType?.durationMinutes}m (+{booking.sessionType?.bufferMinutes}m)
                          </Badge>
                        </Table.Td>

                        <Table.Td>
                          {booking.source === 'WHATSAPP' ? (
                            <Badge size="sm" className="badge-whatsapp" leftSection={<IconBrandWhatsapp size={12} />}>
                              WhatsApp
                            </Badge>
                          ) : (
                            <Badge size="sm" variant="outline" color="gray">
                              Direct
                            </Badge>
                          )}
                        </Table.Td>

                        <Table.Td>
                          {renderStatusBadge(booking.status)}
                        </Table.Td>

                        <Table.Td style={{ textAlign: 'right' }}>
                          <Group gap={4} justify="flex-end">
                            <Tooltip label="Session Notes">
                              <ActionIcon
                                size="sm"
                                variant="subtle"
                                color="blue"
                                onClick={() => setSelectedBookingForNotes(booking)}
                              >
                                <IconNotes size={16} />
                              </ActionIcon>
                            </Tooltip>

                            <Tooltip label="Attachments & Images">
                              <ActionIcon
                                size="sm"
                                variant="subtle"
                                color="teal"
                                onClick={() => setSelectedBookingForImages(booking)}
                              >
                                <IconPhoto size={16} />
                              </ActionIcon>
                            </Tooltip>

                            {booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED' && (
                              <Tooltip label="Cancel Booking">
                                <ActionIcon
                                  size="sm"
                                  variant="subtle"
                                  color="red"
                                  onClick={() => setSelectedBookingForCancel(booking)}
                                >
                                  <IconBan size={16} />
                                </ActionIcon>
                              </Tooltip>
                            )}
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            )}
          </Paper>
        </Stack>
      </SimpleGrid>

      {/* Modals */}
      <CancelBookingModal
        booking={selectedBookingForCancel}
        opened={!!selectedBookingForCancel}
        onClose={() => setSelectedBookingForCancel(null)}
        onSuccess={loadBookings}
      />

      <BookingNotesModal
        booking={selectedBookingForNotes}
        opened={!!selectedBookingForNotes}
        onClose={() => setSelectedBookingForNotes(null)}
        onSuccess={loadBookings}
      />

      <BookingImageUploadModal
        booking={selectedBookingForImages}
        opened={!!selectedBookingForImages}
        onClose={() => setSelectedBookingForImages(null)}
        onSuccess={loadBookings}
      />
    </Stack>
  );
}


