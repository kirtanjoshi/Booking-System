'use client';

import React, { useEffect, useState } from 'react';
import {
  Title,
  Text,
  Stack,
  Tabs,
  Group,
  ActionIcon,
  Loader,
  Center,
  Paper,
  Button,
  Select,
  Badge,
  Box,
  SimpleGrid,
  Card,
  Tooltip,
} from '@mantine/core';
import {
  IconClockPlay,
  IconRefresh,
  IconPlus,
  IconTrash,
  IconCopy,
  IconCalendarTime,
  IconCheck,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { fetchApi } from '../../lib/api';

interface RuleItem {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

const DAYS = [
  { value: '1', label: 'Monday', short: 'Mon' },
  { value: '2', label: 'Tuesday', short: 'Tue' },
  { value: '3', label: 'Wednesday', short: 'Wed' },
  { value: '4', label: 'Thursday', short: 'Thu' },
  { value: '5', label: 'Friday', short: 'Fri' },
  { value: '6', label: 'Saturday', short: 'Sat' },
  { value: '0', label: 'Sunday', short: 'Sun' },
];

function formatTo12Hour(timeStr: string): string {
  if (!timeStr) return '';
  const [hourStr, minStr] = timeStr.split(':');
  const hour = parseInt(hourStr, 10);
  const min = minStr ? minStr.substring(0, 2) : '00';
  if (isNaN(hour)) return timeStr;
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const padHour = hour12 < 10 ? `0${hour12}` : `${hour12}`;
  return `${padHour}:${min} ${period}`;
}

const TIME_OPTIONS = [
  { value: '08:00', label: '08:00 AM' },
  { value: '08:30', label: '08:30 AM' },
  { value: '09:00', label: '09:00 AM' },
  { value: '09:30', label: '09:30 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '10:30', label: '10:30 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '11:30', label: '11:30 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '12:30', label: '12:30 PM' },
  { value: '13:00', label: '01:00 PM' },
  { value: '13:30', label: '01:30 PM' },
  { value: '14:00', label: '02:00 PM' },
  { value: '14:30', label: '02:30 PM' },
  { value: '15:00', label: '03:00 PM' },
  { value: '15:30', label: '03:30 PM' },
  { value: '16:00', label: '04:00 PM' },
  { value: '16:30', label: '04:30 PM' },
  { value: '17:00', label: '05:00 PM' },
  { value: '17:30', label: '05:30 PM' },
  { value: '18:00', label: '06:00 PM' },
  { value: '18:30', label: '06:30 PM' },
  { value: '19:00', label: '07:00 PM' },
  { value: '19:30', label: '07:30 PM' },
  { value: '20:00', label: '08:00 PM' },
  { value: '20:30', label: '08:30 PM' },
  { value: '21:00', label: '09:00 PM' },
  { value: '21:30', label: '09:30 PM' },
  { value: '22:00', label: '10:00 PM' },
];

export default function AvailabilityPage() {
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('1');
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [addingSlot, setAddingSlot] = useState(false);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/availability-rules');
      setRules(data || []);
    } catch (err) {
      console.error('Failed to load rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentDayNum = parseInt(selectedDay, 10);
  const currentDayInfo = DAYS.find((d) => d.value === selectedDay);

  const currentDayRules = rules
    .filter((r) => r.dayOfWeek === currentDayNum && r.isActive)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const handleAddBlock = async () => {
    if (!startTime || !endTime || startTime >= endTime) {
      notifications.show({
        title: 'Invalid Slot',
        message: 'End time must be later than start time',
        color: 'red',
      });
      return;
    }

    setAddingSlot(true);
    try {
      await fetchApi('/availability-rules', {
        method: 'POST',
        body: JSON.stringify({
          dayOfWeek: currentDayNum,
          startTime,
          endTime,
        }),
      });

      notifications.show({
        title: 'Slot Added',
        message: `Added ${formatTo12Hour(startTime)} – ${formatTo12Hour(endTime)} on ${currentDayInfo?.label}`,
        color: 'teal',
      });

      await loadRules();
    } catch (err: any) {
      notifications.show({
        title: 'Failed to Add',
        message: err.message || 'Error saving time slot',
        color: 'red',
      });
    } finally {
      setAddingSlot(false);
    }
  };

  const handleRemoveBlock = async (id: string) => {
    try {
      await fetchApi(`/availability-rules/${id}`, {
        method: 'DELETE',
      });

      notifications.show({
        title: 'Slot Removed',
        message: 'Availability slot successfully deleted',
        color: 'gray',
      });

      await loadRules();
    } catch (err: any) {
      notifications.show({
        title: 'Error',
        message: err.message || 'Failed to delete block',
        color: 'red',
      });
    }
  };

  const handleApplyPreset = (start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
  };

  return (
    <Stack gap="xl" maw={1100} mx="auto">
      {/* Header */}
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2} style={{ color: '#0F172A', letterSpacing: '-0.03em', fontWeight: 800 }}>
            Weekly Availability Schedule
          </Title>
          <Text size="sm" c="dimmed" mt={2}>
            Set active consultation hours and automated booking slots for each day
          </Text>
        </div>

        <Button
          variant="light"
          color="blue"
          size="sm"
          leftSection={<IconRefresh size={16} />}
          onClick={loadRules}
          loading={loading}
          styles={{ root: { borderRadius: 8 } }}
        >
          Refresh
        </Button>
      </Group>

      {/* Day Selector Tabs */}
      <Paper p={6} className="saas-card" radius="lg">
        <Tabs
          value={selectedDay}
          onChange={(val) => val && setSelectedDay(val)}
          styles={{
            tab: {
              color: '#64748B',
              fontWeight: 600,
              fontSize: 13,
              borderRadius: 8,
              border: 'none',
              padding: '10px 16px',
              transition: 'all 0.15s ease',
              '&[data-active]': {
                background: '#EFF6FF',
                color: '#2563EB',
              },
            },
          }}
        >
          <Tabs.List grow>
            {DAYS.map((day) => {
              const count = rules.filter(
                (r) => r.dayOfWeek === parseInt(day.value, 10) && r.isActive,
              ).length;

              return (
                <Tabs.Tab
                  key={day.value}
                  value={day.value}
                  rightSection={
                    <Badge
                      size="xs"
                      variant={count > 0 ? 'filled' : 'subtle'}
                      color={count > 0 ? 'blue' : 'gray'}
                      radius="sm"
                    >
                      {count}
                    </Badge>
                  }
                >
                  {day.label}
                </Tabs.Tab>
              );
            })}
          </Tabs.List>
        </Tabs>
      </Paper>

      {/* Main Day Content */}
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
        {/* Left Column: Active Slots for Selected Day */}
        <Box style={{ gridColumn: 'span 2' }}>
          <Paper p="lg" className="saas-card" radius="lg">
            <Group justify="space-between" align="center" mb="lg">
              <div>
                <Group gap={8} align="center">
                  <Text fw={700} size="md" c="#0F172A">
                    {currentDayInfo?.label} Schedule
                  </Text>
                  <Badge color={currentDayRules.length > 0 ? 'teal' : 'gray'} size="sm" variant="light">
                    {currentDayRules.length > 0 ? `${currentDayRules.length} Active Slots` : 'No Hours Set'}
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed" mt={2}>
                  Appointments will only be offered inside these hours
                </Text>
              </div>
            </Group>

            {loading ? (
              <Center p={50}>
                <Loader color="blue" size="md" />
              </Center>
            ) : currentDayRules.length === 0 ? (
              <Center p={40} style={{ background: '#F8FAFC', borderRadius: 12, border: '1px dashed #CBD5E1' }}>
                <Stack align="center" gap="xs">
                  <IconCalendarTime size={32} color="#94A3B8" opacity={0.6} />
                  <Text fw={600} size="sm" c="#0F172A">
                    Day Off / No Consultations Scheduled
                  </Text>
                  <Text size="xs" c="dimmed" ta="center" maw={320}>
                    Clients cannot book on {currentDayInfo?.label}. Add a slot below to enable bookings.
                  </Text>
                </Stack>
              </Center>
            ) : (
              <Stack gap="sm">
                {currentDayRules.map((rule) => {
                  const start = rule.startTime.substring(0, 5);
                  const end = rule.endTime.substring(0, 5);

                  return (
                    <Card
                      key={rule.id}
                      p="sm"
                      radius="md"
                      style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <Group justify="space-between" align="center">
                        <Group gap="sm">
                          <Box
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: '#10B981',
                            }}
                          />
                          <div>
                            <Text fw={700} size="sm" c="#0F172A">
                              {formatTo12Hour(start)} — {formatTo12Hour(end)}
                            </Text>
                            <Text size="11px" c="dimmed">
                              Open for client scheduling
                            </Text>
                          </div>
                        </Group>

                        <Tooltip label="Delete Slot">
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            onClick={() => handleRemoveBlock(rule.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Paper>
        </Box>

        {/* Right Column: Add New Slot & Presets */}
        <Paper p="lg" className="saas-card" radius="lg">
          <Text fw={700} size="sm" c="#0F172A" mb="xs">
            Add Consultation Slot
          </Text>
          <Text size="xs" c="dimmed" mb="md">
            Choose start and end times to open up slots
          </Text>

          <Stack gap="md">
            {/* Quick Presets */}
            <div>
              <Text size="xs" fw={600} c="dimmed" mb={6}>
                Quick Presets
              </Text>
              <Group gap={6} wrap="wrap">
                <Button
                  size="xs"
                  variant="light"
                  color="blue"
                  onClick={() => handleApplyPreset('09:00', '13:00')}
                >
                  Morning (9 AM – 1 PM)
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  color="blue"
                  onClick={() => handleApplyPreset('14:00', '18:00')}
                >
                  Afternoon (2 PM – 6 PM)
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  color="blue"
                  onClick={() => handleApplyPreset('09:00', '17:00')}
                >
                  Full Day (9 AM – 5 PM)
                </Button>
              </Group>
            </div>

            <Select
              label="Start Time"
              data={TIME_OPTIONS}
              value={startTime}
              onChange={(val) => val && setStartTime(val)}
              styles={{
                input: {
                  background: '#F8FAFC',
                  borderColor: '#E2E8F0',
                  color: '#0F172A',
                },
              }}
            />

            <Select
              label="End Time"
              data={TIME_OPTIONS}
              value={endTime}
              onChange={(val) => val && setEndTime(val)}
              styles={{
                input: {
                  background: '#F8FAFC',
                  borderColor: '#E2E8F0',
                  color: '#0F172A',
                },
              }}
            />

            <Button
              color="blue"
              fullWidth
              mt="xs"
              leftSection={<IconPlus size={16} />}
              onClick={handleAddBlock}
              loading={addingSlot}
              style={{
                background: '#2563EB',
                borderRadius: 8,
              }}
            >
              Add Slot to {currentDayInfo?.short}
            </Button>
          </Stack>
        </Paper>
      </SimpleGrid>
    </Stack>
  );
}

