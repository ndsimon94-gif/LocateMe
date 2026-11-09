import type { CommunicationWindow } from '../communications/communication';
import { addDays, atTime, clockTimeToMinutes, formatClock, minutesSinceMidnight, toLocalDate, type ClockTime } from '../dates';
import type { FocusTimerState } from '../focus/focus-timer';
import type { TimeBlock } from '../planning/time-block';
import { isOpen, type Task } from '../tasks/task';

/**
 * Which local notifications *should* exist right now. Pure, so the rules
 * are testable; the notification service reconciles the OS schedule
 * against this list.
 *
 * Calm by design: only things the user explicitly asked for (reminders,
 * focus end, plan blocks, optionally message windows). Never engagement nudges.
 */

export type NotificationKind = 'reminder' | 'focus_end' | 'communication_window' | 'time_block';

export interface DesiredNotification {
  /** Stable identity; changes when content or time changes so the OS copy is replaced. */
  key: string;
  kind: NotificationKind;
  fireAt: number;
  title: string;
  body: string;
  /** In-app route opened when tapped. */
  url: string;
}

export interface NotificationPreferences {
  communicationWindows: CommunicationWindow[];
  notifyCommunicationWindows: boolean;
  notifyTimeBlocks: boolean;
  /** Reminders without a time fire at this time on their day. */
  defaultReminderTime: ClockTime;
  /** Quiet from this time until 05:00. Applies to windows and blocks, not to reminders the user timed. */
  windDownTime: ClockTime | null;
}

export interface ScheduleInput {
  now: Date;
  tasks: Task[];
  blocks: TimeBlock[];
  focus: FocusTimerState;
  preferences: NotificationPreferences;
}

/** iOS keeps at most 64 pending local notifications per app. */
export const MAX_SCHEDULED = 60;
export const HORIZON_DAYS = 7;

function inQuietHours(at: Date, windDown: ClockTime | null): boolean {
  if (!windDown) return false;
  const m = minutesSinceMidnight(at);
  return m >= clockTimeToMinutes(windDown) || m < 5 * 60;
}

export function desiredNotifications({ now, tasks, blocks, focus, preferences }: ScheduleInput): DesiredNotification[] {
  const out: DesiredNotification[] = [];
  const nowMs = now.getTime();
  const horizonEnd = atTime(addDays(toLocalDate(now), HORIZON_DAYS), '00:00').getTime();
  const inRange = (t: number) => t > nowMs && t < horizonEnd;

  for (const t of tasks) {
    if (t.kind !== 'reminder' || !isOpen(t) || !t.dueDate) continue;
    const at = atTime(t.dueDate, t.dueTime ?? preferences.defaultReminderTime).getTime();
    if (!inRange(at)) continue;
    out.push({ key: `reminder:${t.id}:${at}:${t.title}`, kind: 'reminder', fireAt: at, title: t.title, body: 'Reminder', url: '/plan' });
  }

  if (focus.status === 'running' && focus.endsAt > nowMs) {
    out.push({
      key: `focus:${focus.startedAt}:${focus.endsAt}`,
      kind: 'focus_end',
      fireAt: focus.endsAt,
      title: 'Focus session complete',
      body: focus.intention ? `Nice work on "${focus.intention}". Take a short break.` : 'Take a short break.',
      url: '/focus',
    });
  }

  if (preferences.notifyTimeBlocks) {
    for (const b of blocks) {
      const at = atTime(b.date, b.start);
      if (!inRange(at.getTime()) || inQuietHours(at, preferences.windDownTime)) continue;
      out.push({
        key: `block:${b.id}:${at.getTime()}:${b.title}`,
        kind: 'time_block',
        fireAt: at.getTime(),
        title: `Time for ${b.title.toLowerCase()}`,
        body: `Until ${formatClock(b.end)}. You set this time aside.`,
        url: '/',
      });
    }
  }

  if (preferences.notifyCommunicationWindows) {
    for (let i = 0; i < HORIZON_DAYS; i++) {
      const day = addDays(toLocalDate(now), i);
      for (const w of preferences.communicationWindows) {
        const at = atTime(day, w.start);
        if (!inRange(at.getTime()) || inQuietHours(at, preferences.windDownTime)) continue;
        out.push({
          key: `window:${day}:${w.start}:${w.durationMinutes}`,
          kind: 'communication_window',
          fireAt: at.getTime(),
          title: 'Message window',
          body: `${w.durationMinutes} minutes to catch up on messages.`,
          url: '/communications',
        });
      }
    }
  }

  return out.sort((a, b) => a.fireAt - b.fireAt).slice(0, MAX_SCHEDULED);
}

export function diffSchedule(desired: DesiredNotification[], scheduledKeys: string[]) {
  const want = new Set(desired.map((d) => d.key));
  const have = new Set(scheduledKeys);
  return {
    toSchedule: desired.filter((d) => !have.has(d.key)),
    toCancel: scheduledKeys.filter((k) => !want.has(k)),
  };
}
