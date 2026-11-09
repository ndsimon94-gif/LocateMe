import type { ReactNode } from 'react';

import { CommunicationsProvider } from './communications-store';
import { FocusProvider } from './focus-store';
import { PreferencesProvider } from './preferences-store';
import { ServicesProvider } from './services';
import { TasksProvider } from './tasks-store';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ServicesProvider>
      <PreferencesProvider>
        <TasksProvider>
          <CommunicationsProvider>
            <FocusProvider>{children}</FocusProvider>
          </CommunicationsProvider>
        </TasksProvider>
      </PreferencesProvider>
    </ServicesProvider>
  );
}
