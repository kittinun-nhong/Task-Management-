'use client';

import { useState, type ReactNode } from 'react';
import { MantineProvider, createTheme } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'dayjs/locale/th';
import { ACCENT } from '@/lib/ui/palette';

const theme = createTheme({
  fontFamily: "'IBM Plex Sans Thai', 'Inter', system-ui, sans-serif",
  primaryColor: 'violet',
  defaultRadius: 'md',
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme}>
        <DatesProvider settings={{ locale: 'th' }}>
          <Notifications position="top-right" color={ACCENT} />
          {children}
        </DatesProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}
