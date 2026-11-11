import type { ReactNode } from 'react';

import { AssistantProvider } from './assistant-store';
import { AuthProvider } from './auth-store';
import { ChangesProvider } from './changes-store';
import { CommunicationsProvider } from './communications-store';
import { ConnectionsProvider } from './connections-store';
import { FocusProvider } from './focus-store';
import { NotificationsProvider } from './notifications-store';
import { PlansProvider } from './plans-store';
import { PreferencesProvider } from './preferences-store';
import { ServicesProvider } from './services';
import { TasksProvider } from './tasks-store';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ConnectionsProvider>
        <ServicesProvider>
          <PreferencesProvider>
            <TasksProvider>
              <PlansProvider>
                <CommunicationsProvider>
                  <FocusProvider>
                    <ChangesProvider>
                      <NotificationsProvider>
                        <AssistantProvider>{children}</AssistantProvider>
                      </NotificationsProvider>
                    </ChangesProvider>
                  </FocusProvider>
                </CommunicationsProvider>
              </PlansProvider>
            </TasksProvider>
          </PreferencesProvider>
        </ServicesProvider>
      </ConnectionsProvider>
    </AuthProvider>
  );
}
