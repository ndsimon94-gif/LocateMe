import type { DesiredNotification } from '@/domain/notifications/schedule';

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

/** Thin port over the OS notification scheduler. */
export interface Notifier {
  permission(): Promise<PermissionState>;
  /** Asks the OS. Only call in response to a user action that needs notifications. */
  requestPermission(): Promise<PermissionState>;
  /** Keys of notifications this app has scheduled. */
  scheduledKeys(): Promise<string[]>;
  schedule(n: DesiredNotification): Promise<void>;
  cancel(key: string): Promise<void>;
}

export const unavailableNotifier: Notifier = {
  permission: async () => 'unavailable',
  requestPermission: async () => 'unavailable',
  scheduledKeys: async () => [],
  schedule: async () => {},
  cancel: async () => {},
};

/** In-memory notifier for tests. */
export function createFakeNotifier(initial: PermissionState = 'granted') {
  let state = initial;
  const scheduled = new Map<string, DesiredNotification>();
  const notifier: Notifier = {
    permission: async () => state,
    requestPermission: async () => {
      if (state === 'undetermined') state = 'granted';
      return state;
    },
    scheduledKeys: async () => [...scheduled.keys()],
    schedule: async (n) => {
      scheduled.set(n.key, n);
    },
    cancel: async (k) => {
      scheduled.delete(k);
    },
  };
  return { notifier, scheduled };
}
