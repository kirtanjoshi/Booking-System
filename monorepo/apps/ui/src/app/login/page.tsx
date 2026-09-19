'use client';

import React, { useState } from 'react';
import {
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Container,
  Group,
  Stack,
  Alert,
  Box,
  Badge,
} from '@mantine/core';
import { IconAlertCircle, IconSparkles, IconLock, IconPhone, IconBolt } from '@tabler/icons-react';
import { useAuth } from '../../lib/auth-context';

export default function LoginPage() {
  const { login } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('+9779801234567');
  const [password, setPassword] = useState('AdminPassword123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(phoneNumber, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = () => {
    setPhoneNumber('+9779801234567');
    setPassword('AdminPassword123!');
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F4F5F9',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background subtle decorative circle */}
      <Box
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, transparent 70%)',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      <Container size={440} my={40} style={{ position: 'relative', zIndex: 1 }}>
        {/* Brand header */}
        <Stack align="center" mb={32} gap="xs">
          <Box
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              background: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px -4px rgba(37, 99, 235, 0.4)',
            }}
          >
            <IconSparkles size={28} color="#FFFFFF" />
          </Box>
          <Group gap={6} align="center" mt={4}>
            <Title order={2} style={{ color: '#0F172A', letterSpacing: '-0.03em', fontWeight: 800 }}>
              Aura Practice
            </Title>
            <Badge size="xs" variant="filled" color="blue" radius="sm">
              PRO
            </Badge>
          </Group>
          <Text c="#64748B" size="xs" ta="center">
            Modern consultation & real-time WhatsApp booking platform
          </Text>
        </Stack>

        {/* Login Card */}
        <Paper p={36} radius="lg" className="saas-card">
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              {error && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" radius="md">
                  {error}
                </Alert>
              )}

              <TextInput
                label="Phone Number"
                placeholder="+9779800000000"
                leftSection={<IconPhone size={16} color="#2563EB" />}
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.currentTarget.value)}
                styles={{
                  label: { color: '#0F172A', fontSize: 13, fontWeight: 700, marginBottom: 4 },
                  input: {
                    background: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    color: '#0F172A',
                    borderRadius: 10,
                    height: 44,
                  },
                }}
              />

              <PasswordInput
                label="Password"
                placeholder="Enter password"
                leftSection={<IconLock size={16} color="#2563EB" />}
                required
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                styles={{
                  label: { color: '#0F172A', fontSize: 13, fontWeight: 700, marginBottom: 4 },
                  input: {
                    background: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    color: '#0F172A',
                    borderRadius: 10,
                    height: 44,
                  },
                }}
              />

              <Button
                type="submit"
                color="blue"
                fullWidth
                size="md"
                mt="sm"
                loading={loading}
                style={{
                  background: '#2563EB',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                  borderRadius: 10,
                  fontWeight: 700,
                  height: 44,
                }}
              >
                Sign In to Platform
              </Button>

              {/* Quick Fill Demo Credentials */}
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                leftSection={<IconBolt size={14} color="#D97706" />}
                onClick={handleQuickFill}
                styles={{
                  root: {
                    color: '#64748B',
                    fontWeight: 600,
                    '&:hover': {
                      color: '#0F172A',
                      background: '#F1F5F9',
                    },
                  },
                }}
              >
                Auto-fill Admin Demo Credentials
              </Button>
            </Stack>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}


