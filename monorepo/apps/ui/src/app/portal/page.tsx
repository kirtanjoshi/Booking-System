'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  Badge,
  Button,
  Tabs,
  Loader,
  Alert,
  SimpleGrid,
  Image,
  ActionIcon,
  Tooltip,
  Box,
  Paper,
  Center,
} from '@mantine/core';
import {
  IconCalendarEvent,
  IconHistory,
  IconNotes,
  IconPhotoPlus,
  IconCalendarClock,
  IconClock,
  IconAlertCircle,
  IconUserCheck,
  IconSparkles,
} from '@tabler/icons-react';
import { fetchApi } from '../../lib/api';
import { BookingNotesModal } from '../../components/BookingNotesModal';
import { BookingImageUploadModal } from '../../components/BookingImageUploadModal';

interface BookingItem {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  notes?: string;
  imageUrls: string[];
  sessionType?: {
    name: string;
    durationMinutes: number;
  };
  client?: {
    name?: string;
    phoneNumber: string;
  };
}

export default function UserPortalPage() {
  const [upcoming, setUpcoming] = useState<BookingItem[]>([]);
  const [history, setHistory] = useState<BookingItem[]>([]);
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [upData, histData, datesData] = await Promise.all([
        fetchApi('/user/bookings/upcoming').catch(() => []),
        fetchApi('/user/bookings/history').catch(() => []),
        fetchApi('/user/booked-dates').catch(() => []),
      ]);
      setUpcoming(upData || []);
      setHistory(histData || []);
      setBookedDates(datesData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load consultation portal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNotes = (booking: BookingItem) => {
    setActiveBookingId(booking.id);
    setSelectedNotes(booking.notes || '');
    setNotesModalOpen(true);
  };

  const openImages = (booking: BookingItem) => {
    setActiveBookingId(booking.id);
    setImageModalOpen(true);
  };

  const handleNotesSaved = (newNotes: string) => {
    setUpcoming((prev) =>
      prev.map((b) => (b.id === activeBookingId ? { ...b, notes: newNotes } : b)),
    );
    setHistory((prev) =>
      prev.map((b) => (b.id === activeBookingId ? { ...b, notes: newNotes } : b)),
    );
  };

  const handleImageAdded = (imageUrl: string) => {
    setUpcoming((prev) =>
      prev.map((b) =>
        b.id === activeBookingId
          ? { ...b, imageUrls: [...(b.imageUrls || []), imageUrl] }
          : b,
      ),
    );
  };

  if (loading) {
    return (
      <Container size="lg" py="xl">
        <Group justify="center" py={80}>
          <Loader color="blue" size="md" />
          <Text c="#64748B" size="sm">Loading consultation portal...</Text>
        </Group>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Portal Header */}
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <div>
            <Group gap="xs" align="center">
              <Title order={2} style={{ color: '#0F172A', letterSpacing: '-0.03em', fontWeight: 800 }}>
                Client Consultation Portal
              </Title>
              <Badge color="blue" variant="light" size="sm" leftSection={<IconUserCheck size={12} />}>
                Self-Service
              </Badge>
            </Group>
            <Text size="sm" c="#64748B" mt={2}>
              Review upcoming appointments, scheduled calendar dates, consultation records, and session notes
            </Text>
          </div>
        </Group>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" radius="md">
            {error}
          </Alert>
        )}

        {/* Booked Dates Summary */}
        {bookedDates.length > 0 && (
          <Paper p="md" className="saas-card" radius="lg">
            <Group justify="space-between" wrap="wrap" gap="sm">
              <Group gap="xs">
                <IconCalendarClock size={20} color="#2563EB" />
                <Text size="sm" fw={700} c="#0F172A">
                  Active Scheduled Dates:
                </Text>
              </Group>
              <Group gap={6} wrap="wrap">
                {bookedDates.map((d) => (
                  <Badge key={d} color="blue" variant="light" size="sm" style={{ fontWeight: 600 }}>
                    {d}
                  </Badge>
                ))}
              </Group>
            </Group>
          </Paper>
        )}

        {/* Tabs: Upcoming vs History */}
        <Tabs defaultValue="upcoming" color="blue">
          <Paper p={4} className="saas-card" radius="lg" mb="lg">
            <Tabs.List grow>
              <Tabs.Tab
                value="upcoming"
                leftSection={<IconCalendarEvent size={16} />}
                rightSection={<Badge size="xs" color="blue" variant="filled">{upcoming.length}</Badge>}
                styles={{
                  tab: {
                    fontWeight: 700,
                    borderRadius: 8,
                    color: '#64748B',
                  },
                }}
              >
                Upcoming Appointments
              </Tabs.Tab>
              <Tabs.Tab
                value="history"
                leftSection={<IconHistory size={16} />}
                rightSection={<Badge size="xs" color="gray" variant="light">{history.length}</Badge>}
                styles={{
                  tab: {
                    fontWeight: 700,
                    borderRadius: 8,
                    color: '#64748B',
                  },
                }}
              >
                Past Consultation History
              </Tabs.Tab>
            </Tabs.List>
          </Paper>

          {/* Upcoming Tab Panel */}
          <Tabs.Panel value="upcoming">
            {upcoming.length === 0 ? (
              <Paper p={50} className="saas-card" radius="lg">
                <Center>
                  <Stack align="center" gap="sm">
                    <Box
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        background: '#EFF6FF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconCalendarEvent size={26} color="#2563EB" />
                    </Box>
                    <Text fw={700} size="sm" c="#0F172A">
                      No upcoming appointments scheduled
                    </Text>
                    <Text size="xs" c="#64748B" ta="center">
                      Bookings confirmed via WhatsApp or the practitioner will appear here in real-time.
                    </Text>
                  </Stack>
                </Center>
              </Paper>
            ) : (
              <Stack gap="md">
                {upcoming.map((b) => {
                  const badgeClass =
                    b.status === 'CONFIRMED'
                      ? 'badge-confirmed'
                      : b.status === 'PENDING'
                      ? 'badge-pending'
                      : 'badge-cancelled';
                  return (
                    <Paper key={b.id} p="lg" className="saas-card" radius="lg">
                      <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
                        <div>
                          <Group gap="xs">
                            <Text fw={800} size="md" c="#0F172A">
                              {b.sessionType?.name || 'Professional Consultation'}
                            </Text>
                            <span className={`badge-pill ${badgeClass}`} style={{ fontSize: 11 }}>
                              {b.status}
                            </span>
                          </Group>

                          <Group gap={8} mt={6}>
                            <IconClock size={16} color="#2563EB" />
                            <Text size="xs" c="#64748B" fw={500}>
                              {new Date(b.scheduledStart).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}{' '}
                              at{' '}
                              {new Date(b.scheduledStart).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Text>
                          </Group>

                          {b.notes && (
                            <Box
                              mt="sm"
                              p={10}
                              style={{
                                background: '#F8FAFC',
                                borderRadius: 8,
                                borderLeft: '3px solid #2563EB',
                              }}
                            >
                              <Text size="xs" c="#334155">
                                <b style={{ color: '#0F172A' }}>Notes:</b> {b.notes}
                              </Text>
                            </Box>
                          )}

                          {b.imageUrls && b.imageUrls.length > 0 && (
                            <Box mt="sm">
                              <Text size="11px" fw={700} c="#64748B" mb={4}>
                                Attached Files & Charts ({b.imageUrls.length}):
                              </Text>
                              <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
                                {b.imageUrls.map((url, i) => (
                                  <Image
                                    key={i}
                                    src={url}
                                    height={80}
                                    radius="md"
                                    fit="cover"
                                    alt="Attachment"
                                    style={{ border: '1px solid #E2E8F0' }}
                                  />
                                ))}
                              </SimpleGrid>
                            </Box>
                          )}
                        </div>

                        <Group gap="sm">
                          <Button
                            size="xs"
                            variant="light"
                            color="blue"
                            leftSection={<IconNotes size={14} />}
                            onClick={() => openNotes(b)}
                            style={{ borderRadius: 8, fontWeight: 600 }}
                          >
                            Notes
                          </Button>

                          <Button
                            size="xs"
                            variant="outline"
                            color="teal"
                            leftSection={<IconPhotoPlus size={14} />}
                            onClick={() => openImages(b)}
                            style={{ borderRadius: 8, fontWeight: 600, borderColor: '#86EFAC', color: '#15803D' }}
                          >
                            Attach Image
                          </Button>
                        </Group>
                      </Group>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Tabs.Panel>

          {/* History Tab Panel */}
          <Tabs.Panel value="history">
            {history.length === 0 ? (
              <Paper p={50} className="saas-card" radius="lg">
                <Text c="#64748B" ta="center" size="sm">
                  No past consultation history recorded yet.
                </Text>
              </Paper>
            ) : (
              <Stack gap="md">
                {history.map((b) => (
                  <Paper key={b.id} p="md" className="saas-card" radius="md">
                    <Group justify="space-between" align="center">
                      <div>
                        <Group gap="xs">
                          <Text fw={700} size="sm" c="#0F172A">
                            {b.sessionType?.name || 'Completed Consultation'}
                          </Text>
                          <span className="badge-pill badge-completed" style={{ fontSize: 10 }}>
                            {b.status}
                          </span>
                        </Group>
                        <Text size="xs" c="#64748B" mt={2}>
                          {new Date(b.scheduledStart).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Text>
                        {b.notes && (
                          <Text size="xs" c="#64748B" mt={4}>
                            Notes: {b.notes}
                          </Text>
                        )}
                      </div>

                      <Button
                        size="xs"
                        variant="subtle"
                        color="gray"
                        leftSection={<IconNotes size={14} />}
                        onClick={() => openNotes(b)}
                        style={{ borderRadius: 8 }}
                      >
                        View Notes
                      </Button>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {/* Modals */}
      {activeBookingId && (
        <>
          <BookingNotesModal
            opened={notesModalOpen}
            onClose={() => setNotesModalOpen(false)}
            bookingId={activeBookingId}
            initialNotes={selectedNotes}
            onSaved={handleNotesSaved}
          />
          <BookingImageUploadModal
            opened={imageModalOpen}
            onClose={() => setImageModalOpen(false)}
            bookingId={activeBookingId}
            onImageAdded={handleImageAdded}
          />
        </>
      )}
    </Container>
  );
}


