import type { ReactNode } from 'react';

import { CommunicationsProvider } from './communications-store';
import { FocusProvider } from './focus-store';
import { NotificationsProvider } from './notifications-store';
import { PlansProvider } from './plans-store';
import { PreferencesProvider } from './preferences-store';
import { ServicesProvider } from './services';
import { TasksProvider } from './tasks-store';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ServicesProvider>
      <PreferencesProvider>
        <TasksProvider>
          <PlansProvider>
            <CommunicationsProvider>
              <FocusProvider>
                <NotificationsProvider>{children}</NotificationsProvider>
              </FocusProvider>
            </CommunicationsProvider>
          </PlansProvider>
        </TasksProvider>
      </PreferencesProvider>
    </ServicesProvider>
  );
}
