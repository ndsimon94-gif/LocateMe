import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { desiredNotifications, diffSchedule } from '@/domain/notifications/schedule';
import type { PermissionState } from '@/integrations/notifications';

import { useFocus } from './focus-store';
import { usePlans } from './plans-store';
import { usePreferences } from './preferences-store';
import { useServices } from './services';
import { useTasks } from './tasks-store';

interface NotificationsApi {
  permission: PermissionState;
  /** Ask for permission if not yet decided. Call only right after a user action that needs it. */
  requestIfNeeded(): Promise<PermissionState>;
  scheduledCount: number;
}

const NotificationsContext = createContext<NotificationsApi | null>(null);

/**
 * Keeps the OS notification schedule in sync with app state. Whenever tasks,
 * blocks, focus or preferences change, it recomputes the desired set and
 * applies only the difference.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { notifier } = useServices();
  const { tasks, hydrated } = useTasks();
  const { blocks } = usePlans();
  const { timer } = useFocus();
  const { preferences } = usePreferences();
  const [permission, setPermission] = useState<PermissionState>('undetermined');
  const [scheduledCount, setScheduledCount] = useState(0);
  // Serialise reconciles so overlapping runs can't double-schedule.
  const queue = useRef<Promise<void>>(Promise.resolve());
  // Re-run when the app comes back to the foreground (time has passed, horizon moved).
  const [wake, setWake] = useState(0);

  useEffect(() => {
    void notifier.permission().then(setPermission);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        void notifier.permission().then(setPermission);
        setWake((w) => w + 1);
      }
    });
    return () => sub.remove();
  }, [notifier]);

  useEffect(() => {
    if (permission !== 'granted' || !hydrated) return;
    const desired = desiredNotifications({
      now: new Date(),
      tasks,
      blocks,
      focus: timer,
      preferences: {
        communicationWindows: preferences.communicationWindows,
        notifyCommunicationWindows: preferences.notifyCommunicationWindows,
        notifyTimeBlocks: preferences.notifyTimeBlocks,
        defaultReminderTime: preferences.defaultReminderTime,
        windDownTime: preferences.windDownTime,
      },
    });
    queue.current = queue.current
      .then(async () => {
        const { toSchedule, toCancel } = diffSchedule(desired, await notifier.scheduledKeys());
        for (const key of toCancel) await notifier.cancel(key);
        for (const n of toSchedule) await notifier.schedule(n);
        setScheduledCount(desired.length);
      })
      .catch((e: unknown) => {
        console.warn('Notification sync failed', e);
      });
  }, [permission, hydrated, tasks, blocks, timer, preferences, notifier, wake]);

  const requestIfNeeded = useCallback(async () => {
    const current = await notifier.permission();
    const next = current === 'undetermined' ? await notifier.requestPermission() : current;
    setPermission(next);
    return next;
  }, [notifier]);

  const value = useMemo(() => ({ permission, requestIfNeeded, scheduledCount }), [permission, requestIfNeeded, scheduledCount]);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsApi {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider');
  return ctx;
}
