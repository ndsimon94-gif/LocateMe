import type { CommunicationWindow } from '@/domain/communications/communication';
import type { FocusSessionRecord } from '@/domain/focus/focus-history';
import type { FocusTimerState } from '@/domain/focus/focus-timer';
import type { Task } from '@/domain/tasks/task';

import { createDocument, type StoredDocument } from './document';
import type { KeyValueStore } from './key-value-store';

/**
 * Repositories are the seam for Supabase: each one can later be backed by a
 * remote table (with the local document kept as an offline cache) without
 * touching UI or domain code.
 */

export interface AttentionPreferences {
  communicationWindows: CommunicationWindow[];
  defaultFocusMinutes: number;
  /** Hide non-urgent messages outside communication windows. */
  holdMessagesOutsideWindows: boolean;
  /** Don't show the "next suggested action" card after this time. */
  windDownTime: string | null;
}

export const defaultPreferences: AttentionPreferences = {
  communicationWindows: [
    { start: '11:30', durationMinutes: 30 },
    { start: '16:30', durationMinutes: 30 },
  ],
  defaultFocusMinutes: 25,
  holdMessagesOutsideWindows: true,
  windDownTime: '21:30',
};

const isArray = (v: unknown): v is unknown[] => Array.isArray(v);
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

const isTask = (v: unknown): v is Task =>
  isObject(v) && typeof v.id === 'string' && typeof v.title === 'string' && typeof v.isPriority === 'boolean';

export interface Repositories {
  tasks: StoredDocument<Task[]>;
  focusHistory: StoredDocument<FocusSessionRecord[]>;
  activeFocus: StoredDocument<FocusTimerState>;
  preferences: StoredDocument<AttentionPreferences>;
  handledCommunications: StoredDocument<string[]>;
}

export function createLocalRepositories(store: KeyValueStore): Repositories {
  return {
    tasks: createDocument(store, 'intentional.tasks', 1, () => [], (v): v is Task[] => isArray(v) && v.every(isTask)),
    focusHistory: createDocument(store, 'intentional.focusHistory', 1, () => [], (v): v is FocusSessionRecord[] => isArray(v)),
    activeFocus: createDocument(
      store,
      'intentional.activeFocus',
      1,
      (): FocusTimerState => ({ status: 'idle' }),
      (v): v is FocusTimerState => isObject(v) && typeof v.status === 'string',
    ),
    preferences: createDocument(
      store,
      'intentional.preferences',
      1,
      () => defaultPreferences,
      (v): v is AttentionPreferences => isObject(v) && isArray(v.communicationWindows),
    ),
    handledCommunications: createDocument(
      store,
      'intentional.handledCommunications',
      1,
      () => [],
      (v): v is string[] => isArray(v) && v.every((x) => typeof x === 'string'),
    ),
  };
}
