import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { deviceStore } from '@/data/device-store';
import { createLocalRepositories, type Repositories } from '@/data/repositories';
import { expoNotifier } from '@/integrations/expo-notifier';
import type { Notifier } from '@/integrations/notifications';
import type { CalendarProvider } from '@/integrations/calendar/calendar-provider';
import { createGoogleCalendarProvider } from '@/integrations/calendar/google-calendar';
import { mockCalendarProvider } from '@/integrations/calendar/mock-calendar';
import type { MailProvider } from '@/integrations/mail/mail-provider';
import { mockMailProvider } from '@/integrations/mail/mock-mail';

import { useConnections } from './connections-store';

/**
 * Composition root. Real implementations are chosen here and nowhere else:
 * Google Calendar only once the server confirms the connection; otherwise the
 * clearly-labelled sample calendar. (The assistant is chosen in the assistant store.)
 */
export interface Services {
  repositories: Repositories;
  calendar: CalendarProvider;
  mail: MailProvider;
  notifier: Notifier;
}

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({ children, services }: { children: ReactNode; services?: Services }) {
  const { google, markNeedsReconnect } = useConnections();
  const repositories = useMemo(() => createLocalRepositories(deviceStore), []);
  const googleCalendar = useMemo(() => createGoogleCalendarProvider(markNeedsReconnect), [markNeedsReconnect]);
  const value = useMemo<Services>(
    () =>
      services ?? {
        repositories,
        calendar: google === 'connected' ? googleCalendar : mockCalendarProvider,
        mail: mockMailProvider,
        notifier: expoNotifier,
      },
    [services, repositories, google, googleCalendar],
  );
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error('useServices must be used inside ServicesProvider');
  return ctx;
}
