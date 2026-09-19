'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  AppShell,
  Group,
  Text,
  Badge,
  Menu,
  Box,
  Avatar,
  Stack,
  TextInput,
  UnstyledButton,
  Button,
} from '@mantine/core';
import {
  IconCalendarEvent,
  IconClockPlay,
  IconUsers,
  IconBroadcast,
  IconLogout,
  IconBrandWhatsapp,
  IconUserCheck,
  IconSearch,
  IconChevronRight,
  IconCompass,
  IconCalendar,
} from '@tabler/icons-react';
import { useAuth } from '../lib/auth-context';
import { StatusUpdateModal } from './StatusUpdateModal';

export function Navigation({ children }: { children: React.ReactNode }) {
  const { admin, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  const mainNavItems = [
    { label: 'Dashboard', href: '/', icon: IconCalendarEvent },
    { label: 'Weekly Schedule', href: '/availability', icon: IconClockPlay },
    { label: 'Client CRM', href: '/clients', icon: IconUsers },
    { label: 'Client Portal', href: '/portal', icon: IconUserCheck },
  ];

  const integrationNavItems = [
    { label: 'WhatsApp API', href: '/settings', icon: IconBrandWhatsapp },
  ];

  const initials = admin?.name ? admin.name.substring(0, 2).toUpperCase() : 'AD';

  return (
    <AppShell
      header={{ height: 70 }}
      navbar={{ width: 260, breakpoint: 'sm' }}
      style={{
        background: '#F4F5F9',
        minHeight: '100vh',
      }}
    >
      {/* Top Header */}
      <AppShell.Header
        px="xl"
        style={{
          left: 260,
          width: 'calc(100% - 260px)',
          height: 70,
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          zIndex: 90,
        }}
      >
        <Group justify="space-between" h="100%">
          <div>
            <Text fw={800} size="lg" c="#0F172A" style={{ letterSpacing: '-0.02em' }}>
              {pathname === '/'
                ? 'Practice Overview'
                : pathname === '/availability'
                ? 'Availability & Schedule'
                : pathname === '/clients'
                ? 'Client Directory'
                : pathname === '/portal'
                ? 'Client Portal'
                : 'System Settings'}
            </Text>
            <Text size="xs" c="dimmed">
              Precision practice management & automated consultation workflow
            </Text>
          </div>

          <Group gap="sm">
            <Badge
              size="lg"
              variant="light"
              color="gray"
              leftSection={<IconCalendar size={14} color="#64748B" />}
              styles={{
                root: {
                  background: '#F1F5F9',
                  color: '#334155',
                  fontWeight: 600,
                  fontSize: 12,
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: '1px solid #E2E8F0',
                },
              }}
            >
              Today, {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Badge>

            <Button
              color="blue"
              size="sm"
              leftSection={<IconBroadcast size={16} />}
              onClick={() => setStatusModalOpen(true)}
              styles={{
                root: {
                  background: '#2563EB',
                  borderRadius: 10,
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                  '&:hover': {
                    background: '#1D4ED8',
                  },
                },
              }}
            >
              Broadcast Delay
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      {/* Left Sidebar (Like YowTrip Image 1) */}
      <AppShell.Navbar
        p="md"
        style={{
          width: 260,
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          background: '#FFFFFF',
          borderRight: '1px solid #E2E8F0',
          zIndex: 100,
        }}
      >
        <Stack justify="space-between" h="100%">
          <Stack gap="lg">
            {/* Logo */}
            <Group gap="xs" style={{ cursor: 'pointer', paddingLeft: 6 }} onClick={() => router.push('/')}>
              <Box
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                }}
              >
                <IconCompass size={22} color="#FFFFFF" />
              </Box>
              <div>
                <Group gap={6} align="center">
                  <Text fw={800} size="md" c="#0F172A" style={{ letterSpacing: '-0.02em' }}>
                    AuraPractice
                  </Text>
                  <Badge size="xs" color="blue" variant="light">
                    PRO
                  </Badge>
                </Group>
                <Text size="11px" c="dimmed">
                  Booking & Practice Hub
                </Text>
              </div>
            </Group>

            {/* Search Bar with ⌘K */}
            <TextInput
              placeholder="Search..."
              leftSection={<IconSearch size={15} color="#94A3B8" />}
              rightSection={
                <Badge size="xs" color="gray" variant="light" styles={{ root: { padding: '2px 6px', fontSize: 10 } }}>
                  ⌘K
                </Badge>
              }
              size="xs"
              styles={{
                input: {
                  background: '#F8FAFC',
                  borderColor: '#E2E8F0',
                  borderRadius: 8,
                  color: '#0F172A',
                  fontSize: 12,
                },
              }}
            />

            {/* MAIN Navigation Section */}
            <div>
              <Text size="10px" fw={700} c="#94A3B8" tt="uppercase" style={{ letterSpacing: '0.08em', marginBottom: 8, paddingLeft: 8 }}>
                MAIN
              </Text>
              <Stack gap={4}>
                {mainNavItems.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <UnstyledButton
                      key={item.href}
                      onClick={() => router.push(item.href)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: active ? '#EFF6FF' : 'transparent',
                        color: active ? '#2563EB' : '#475569',
                        fontWeight: active ? 700 : 500,
                        fontSize: 13,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Icon size={18} color={active ? '#2563EB' : '#64748B'} />
                      <Text size="sm" fw={active ? 700 : 500}>
                        {item.label}
                      </Text>
                    </UnstyledButton>
                  );
                })}
              </Stack>
            </div>

            {/* INTEGRATIONS Section */}
            <div>
              <Text size="10px" fw={700} c="#94A3B8" tt="uppercase" style={{ letterSpacing: '0.08em', marginBottom: 8, paddingLeft: 8 }}>
                INTEGRATIONS
              </Text>
              <Stack gap={4}>
                {integrationNavItems.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <UnstyledButton
                      key={item.href}
                      onClick={() => router.push(item.href)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: active ? '#EFF6FF' : 'transparent',
                        color: active ? '#2563EB' : '#475569',
                        fontWeight: active ? 700 : 500,
                        fontSize: 13,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Icon size={18} color={active ? '#2563EB' : '#64748B'} />
                      <Text size="sm" fw={active ? 700 : 500}>
                        {item.label}
                      </Text>
                    </UnstyledButton>
                  );
                })}
              </Stack>
            </div>
          </Stack>

          {/* Bottom User Card (Matching YowTrip Image 1) */}
          {admin && (
            <Menu shadow="lg" width={220} position="top-start" radius="md">
              <Menu.Target>
                <UnstyledButton
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 12,
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    cursor: 'pointer',
                  }}
                >
                  <Group gap={8}>
                    <Avatar
                      size={34}
                      radius="xl"
                      color="blue"
                      styles={{
                        placeholder: {
                          background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: 12,
                        },
                      }}
                    >
                      {initials}
                    </Avatar>
                    <div style={{ maxWidth: 130 }}>
                      <Text size="xs" fw={700} c="#0F172A" truncate>
                        {admin.name || 'Practitioner'}
                      </Text>
                      <Text size="11px" c="dimmed" truncate>
                        {admin.phoneNumber}
                      </Text>
                    </div>
                  </Group>
                  <IconChevronRight size={16} color="#94A3B8" />
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown style={{ background: '#FFFFFF', borderColor: '#E2E8F0', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }}>
                <Menu.Label>Signed in as</Menu.Label>
                <Menu.Item disabled>
                  <Text size="xs" fw={600} c="#0F172A">{admin.phoneNumber}</Text>
                  <Badge size="xs" color="blue" variant="light" mt={2}>
                    Administrator
                  </Badge>
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size={14} />}
                  onClick={logout}
                >
                  Log out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main
        style={{
          marginLeft: 260,
          marginTop: 70,
          padding: '28px 32px 48px 32px',
          minHeight: 'calc(100vh - 70px)',
          background: '#F4F5F9',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </AppShell.Main>

      <StatusUpdateModal
        opened={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
      />
    </AppShell>
  );
}


