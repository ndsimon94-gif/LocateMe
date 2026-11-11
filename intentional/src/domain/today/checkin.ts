import { clockTimeToMinutes, minutesSinceMidnight, toLocalDate, type ClockTime } from '../dates';

export type Checkin = 'morning' | 'evening';

/**
 * Which check-in, if any, to offer now. Morning from 05:00 to noon; evening
 * from 17:00 until wind-down. Each at most once a day, and never pushed as a
 * notification: it's there if the user opens the app, that's all.
 */
export function dueCheckin(now: Date, last: { morning: string | null; evening: string | null }, windDownTime: ClockTime | null): Checkin | null {
  const today = toLocalDate(now);
  const m = minutesSinceMidnight(now);
  if (m >= 5 * 60 && m < 12 * 60 && last.morning !== today) return 'morning';
  const windDown = windDownTime ? clockTimeToMinutes(windDownTime) : 24 * 60;
  if (m >= 17 * 60 && m < windDown && last.evening !== today) return 'evening';
  return null;
}

export const CHECKIN_PROMPTS: Record<Checkin, { title: string; body: string; prompt: string }> = {
  morning: { title: 'Plan your day', body: 'A one-minute check-in: priorities and time for what matters.', prompt: 'Plan my day' },
  evening: { title: 'Wrap up today', body: 'See what got done and move what slipped, then put the phone down.', prompt: 'Wrap up today' },
};
