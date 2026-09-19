import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import './globals.css';

import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { theme } from '../theme';
import { AuthProvider } from '../lib/auth-context';
import { Navigation } from '../components/Navigation';

export const metadata = {
  title: 'Aura Practice | Precision Booking & Consultation Platform',
  description: 'Enterprise-grade appointment scheduling, real-time client management, and WhatsApp automated workflow',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="light">
          <Notifications position="top-right" />
          <AuthProvider>
            <Navigation>{children}</Navigation>
          </AuthProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
