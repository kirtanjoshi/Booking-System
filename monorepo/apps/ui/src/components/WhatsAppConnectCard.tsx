'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Paper,
  Text,
  Badge,
  Button,
  Group,
  Stack,
  Alert,
  Loader,
  ThemeIcon,
  Modal,
  Code,
} from '@mantine/core';
import {
  IconBrandWhatsapp,
  IconCheck,
  IconAlertCircle,
  IconUnlink,
  IconExternalLink,
  IconSparkles,
} from '@tabler/icons-react';
import { fetchApi } from '../lib/api';

interface WhatsAppStatus {
  isConnected: boolean;
  isEmbedded: boolean;
  phoneNumberId: string | null;
  wabaId: string | null;
  connectedAt: string | null;
}

export function WhatsAppConnectCard() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  const metaAppId = process.env.NEXT_PUBLIC_META_APP_ID;
  const metaConfigId = process.env.NEXT_PUBLIC_META_CONFIG_ID;

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchApi('/whatsapp/embedded-signup/status');
      setStatus(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load WhatsApp connection status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();

    // Initialize Meta Facebook SDK if App ID is provided
    if (metaAppId && typeof window !== 'undefined') {
      (window as any).fbAsyncInit = function () {
        (window as any).FB.init({
          appId: metaAppId,
          cookie: true,
          xfbml: true,
          version: 'v21.0',
        });
      };

      // Load SDK script
      if (!document.getElementById('facebook-jssdk')) {
        const js = document.createElement('script');
        js.id = 'facebook-jssdk';
        js.src = 'https://connect.facebook.net/en_US/sdk.js';
        document.body.appendChild(js);
      }
    }
  }, [metaAppId]);

  const handleConnect = async () => {
    setError(null);
    setActionLoading(true);

    try {
      const fb = (window as any).FB;
      if (fb && metaConfigId) {
        // Meta Embedded Signup with Facebook Login for Business
        fb.login(
          (response: any) => {
            if (response.authResponse?.code) {
              submitCallback(response.authResponse.code);
            } else {
              setActionLoading(false);
              setError('Meta popup was cancelled or failed to authenticate.');
            }
          },
          {
            config_id: metaConfigId,
            response_type: 'code',
            override_default_response_type: true,
            extras: {
              feature: 'whatsapp_embedded_signup',
              version: 2,
            },
          },
        );
      } else {
        // Development simulation / direct connection
        await submitCallback('mock_auth_code_' + Date.now(), 'mock_phone_' + Date.now(), 'mock_waba_' + Date.now());
      }
    } catch (err: any) {
      setError(err.message || 'Failed to launch WhatsApp connection');
      setActionLoading(false);
    }
  };

  const submitCallback = async (code: string, phoneNumberId?: string, wabaId?: string) => {
    try {
      await fetchApi('/whatsapp/embedded-signup/callback', {
        method: 'POST',
        body: JSON.stringify({ code, phoneNumberId, wabaId }),
      });
      await loadStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to register WhatsApp credentials');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect WhatsApp from this account?')) return;
    try {
      setActionLoading(true);
      await fetchApi('/whatsapp/embedded-signup/disconnect', { method: 'POST' });
      await loadStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Paper p="xl" className="saas-card" radius="lg">
        <Group justify="center" py="lg">
          <Loader color="blue" size="sm" />
          <Text size="sm" c="#64748B">Checking WhatsApp connection...</Text>
        </Group>
      </Paper>
    );
  }

  return (
    <>
      <Paper p="xl" className="saas-card" radius="lg">
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Group>
              <ThemeIcon
                size={48}
                radius="md"
                variant="gradient"
                gradient={{ from: '#25D366', to: '#128C7E', deg: 45 }}
              >
                <IconBrandWhatsapp size={28} color="#FFFFFF" />
              </ThemeIcon>
              <div>
                <Group gap="xs">
                  <Text fw={700} size="lg" c="#0F172A">
                    WhatsApp Cloud API Connection
                  </Text>
                  {status?.isConnected ? (
                    <span className="badge-pill badge-confirmed" style={{ fontSize: 11 }}>
                      <IconCheck size={12} style={{ marginRight: 4 }} />
                      Connected
                    </span>
                  ) : (
                    <span className="badge-pill badge-pending" style={{ fontSize: 11 }}>
                      Disconnected
                    </span>
                  )}
                </Group>
                <Text size="sm" c="#64748B">
                  Official Meta WhatsApp Cloud API integration for client bookings & status alerts
                </Text>
              </div>
            </Group>

            <Button
              variant="subtle"
              size="xs"
              color="blue"
              leftSection={<IconExternalLink size={14} />}
              onClick={() => setInfoModalOpen(true)}
              style={{ fontWeight: 600 }}
            >
              Setup Guide
            </Button>
          </Group>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" title="Connection Notice">
              {error}
            </Alert>
          )}

          {status?.isConnected ? (
            <Stack gap="xs" p="md" style={{ background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <Group justify="space-between">
                <Text size="sm" c="#64748B">Status:</Text>
                <Text size="sm" fw={600} c="#16A34A">
                  {status.isEmbedded ? 'Connected via Meta Embedded Signup' : 'Connected via Environment Variables'}
                </Text>
              </Group>

              {status.phoneNumberId && (
                <Group justify="space-between">
                  <Text size="sm" c="#64748B">Phone Number ID:</Text>
                  <Code c="#2563EB" fw={600}>{status.phoneNumberId}</Code>
                </Group>
              )}

              {status.wabaId && (
                <Group justify="space-between">
                  <Text size="sm" c="#64748B">WABA Portfolio ID:</Text>
                  <Code c="#2563EB" fw={600}>{status.wabaId}</Code>
                </Group>
              )}

              {status.connectedAt && (
                <Group justify="space-between">
                  <Text size="sm" c="#64748B">Connected Date:</Text>
                  <Text size="sm" c="#0F172A" fw={500}>
                    {new Date(status.connectedAt).toLocaleDateString()} {new Date(status.connectedAt).toLocaleTimeString()}
                  </Text>
                </Group>
              )}

              <Group justify="flex-end" mt="sm">
                <Button
                  color="red"
                  variant="subtle"
                  size="xs"
                  leftSection={<IconUnlink size={14} />}
                  onClick={handleDisconnect}
                  loading={actionLoading}
                >
                  Disconnect WhatsApp
                </Button>
              </Group>
            </Stack>
          ) : (
            <Stack gap="md">
              <Text size="sm" c="#64748B">
                Connect your WhatsApp Business number to let clients book consultations directly through WhatsApp chat, receive booking confirmations, and get status updates in real-time.
              </Text>

              <Group gap="sm">
                <Button
                  color="#25D366"
                  variant="filled"
                  leftSection={<IconBrandWhatsapp size={18} />}
                  loading={actionLoading}
                  onClick={handleConnect}
                  styles={{
                    root: {
                      backgroundColor: '#25D366',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      borderRadius: 10,
                      '&:hover': {
                        backgroundColor: '#20BA5A',
                      },
                    },
                  }}
                >
                  {metaConfigId ? 'Connect with Facebook & WhatsApp' : 'Connect WhatsApp (Auto-Setup)'}
                </Button>

                {!metaConfigId && (
                  <Badge variant="outline" color="gray" size="sm" leftSection={<IconSparkles size={12} />}>
                    Local Development Ready
                  </Badge>
                )}
              </Group>
            </Stack>
          )}
        </Stack>
      </Paper>

      <Modal
        opened={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        title={<Text fw={700} c="#0F172A">Meta WhatsApp Embedded Signup Guide</Text>}
        styles={{
          content: { background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#0F172A', borderRadius: 14 },
          header: { background: '#FFFFFF', borderBottom: '1px solid #F1F5F9' },
        }}
      >
        <Stack gap="sm" pt="xs">
          <Text size="sm" c="#334155">
            Meta Embedded Signup lets you connect your WhatsApp Business Account (WABA) in one click:
          </Text>
          <Text size="xs" c="#64748B">
            1. Create a Meta App at <b>developers.facebook.com</b> with the WhatsApp and Facebook Login for Business products.
          </Text>
          <Text size="xs" c="#64748B">
            2. Configure a <b>Configuration ID</b> with <Code>whatsapp_business_management</Code> and <Code>whatsapp_business_messaging</Code>.
          </Text>
          <Text size="xs" c="#64748B">
            3. Set <Code>NEXT_PUBLIC_META_APP_ID</Code> and <Code>NEXT_PUBLIC_META_CONFIG_ID</Code> in your frontend environment.
          </Text>
          <Text size="xs" c="#64748B">
            4. Clicking the connect button opens Meta's secure popup modal to verify your business phone number.
          </Text>
        </Stack>
      </Modal>
    </>
  );
}
