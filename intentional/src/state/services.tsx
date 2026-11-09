import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { Assistant } from '@/ai/assistant';
import { mockAssistant } from '@/ai/mock-assistant';
import { deviceStore } from '@/data/device-store';
import { createLocalRepositories, type Repositories } from '@/data/repositories';
import type { CalendarProvider } from '@/integrations/calendar/calendar-provider';
import { mockCalendarProvider } from '@/integrations/calendar/mock-calendar';
import type { MailProvider } from '@/integrations/mail/mail-provider';
import { mockMailProvider } from '@/integrations/mail/mock-mail';

/**
 * Composition root. Swapping mocks for real implementations (Supabase
 * repositories, Google adapters, a server-side assistant) happens here and
 * nowhere else.
 */
export interface Services {
  repositories: Repositories;
  calendar: CalendarProvider;
  mail: MailProvider;
  assistant: Assistant;
}

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({ children, services }: { children: ReactNode; services?: Services }) {
  const value = useMemo<Services>(
    () =>
      services ?? {
        repositories: createLocalRepositories(deviceStore),
        calendar: mockCalendarProvider,
        mail: mockMailProvider,
        assistant: mockAssistant,
      },
    [services],
  );
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error('useServices must be used inside ServicesProvider');
  return ctx;
}
