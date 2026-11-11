import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { Assistant } from '@/ai/assistant';
import { mockAssistant } from '@/ai/mock-assistant';
import { remoteAssistant } from '@/ai/remote-assistant';
import { deviceStore } from '@/data/device-store';
import { createLocalRepositories, type Repositories } from '@/data/repositories';
import { expoNotifier } from '@/integrations/expo-notifier';
import type { Notifier } from '@/integrations/notifications';
import type { CalendarProvider } from '@/integrations/calendar/calendar-provider';
import { createGoogleCalendarProvider } from '@/integrations/calendar/google-calendar';
import { mockCalendarProvider } from '@/integrations/calendar/mock-calendar';
import type { MailProvider } from '@/integrations/mail/mail-provider';
import { mockMailProvider } from '@/integrations/mail/mock-mail';

import { useAuth } from './auth-store';
import { useConnections } from './connections-store';

/**
 * Composition root. Real implementations are chosen here and nowhere else:
 * Google Calendar only once the server confirms the connection, Claude only
 * when signed in; otherwise the clearly-labelled mocks.
 */
export interface Services {
  repositories: Repositories;
  calendar: CalendarProvider;
  mail: MailProvider;
  assistant: Assistant;
  notifier: Notifier;
}

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({ children, services }: { children: ReactNode; services?: Services }) {
  const { session } = useAuth();
  const { google, markNeedsReconnect } = useConnections();
  const repositories = useMemo(() => createLocalRepositories(deviceStore), []);
  const googleCalendar = useMemo(() => createGoogleCalendarProvider(markNeedsReconnect), [markNeedsReconnect]);
  const signedIn = Boolean(session);
  const value = useMemo<Services>(
    () =>
      services ?? {
        repositories,
        calendar: google === 'connected' ? googleCalendar : mockCalendarProvider,
        mail: mockMailProvider,
        assistant: signedIn ? remoteAssistant : mockAssistant,
        notifier: expoNotifier,
      },
    [services, repositories, google, googleCalendar, signedIn],
  );
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error('useServices must be used inside ServicesProvider');
  return ctx;
}
