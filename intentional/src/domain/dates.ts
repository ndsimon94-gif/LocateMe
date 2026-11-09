/**
 * Pure calendar-date helpers. A `LocalDate` is a 'YYYY-MM-DD' string in the
 * user's local time zone; it never carries a time or offset, which keeps
 * "what day is this task on?" independent of daylight-saving shifts.
 */

export type LocalDate = string;
/** 24h clock time, 'HH:MM'. */
export type ClockTime = string;

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number) => String(n).padStart(2, '0');

export function toLocalDate(d: Date): LocalDate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isLocalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toLocalDate(parseLocalDate(value)) === value;
}

/** Local midnight of the given date. */
export function parseLocalDate(value: LocalDate): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDays(value: LocalDate, days: number): LocalDate {
  const d = parseLocalDate(value);
  d.setDate(d.getDate() + days);
  return toLocalDate(d);
}

export function dayOfWeek(value: LocalDate): number {
  return parseLocalDate(value).getDay();
}

/** Monday-based week start. */
export function startOfWeek(value: LocalDate): LocalDate {
  const offset = (dayOfWeek(value) + 6) % 7;
  return addDays(value, -offset);
}

export function weekDates(weekStart: LocalDate): LocalDate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function isClockTime(value: string): boolean {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return false;
  return Number(match[1]) < 24 && Number(match[2]) < 60;
}

export function normalizeClockTime(value: string): ClockTime | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match || !isClockTime(value.trim())) return null;
  return `${pad(Number(match[1]))}:${match[2]}`;
}

export function clockTimeToMinutes(value: ClockTime): number {
  const [h, m] = value.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** Combines a local date and clock time into a Date. */
export function atTime(date: LocalDate, time: ClockTime): Date {
  const d = parseLocalDate(date);
  const minutes = clockTimeToMinutes(time);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

export function formatClock(time: ClockTime): string {
  const minutes = clockTimeToMinutes(time);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${pad(m)} ${suffix}`;
}

export function formatTimeOfDate(d: Date): string {
  return formatClock(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
}

export function shortDate(value: LocalDate): string {
  const d = parseLocalDate(value);
  return `${DAY_NAMES[d.getDay()]?.slice(0, 3)}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

export function longDate(value: LocalDate): string {
  const d = parseLocalDate(value);
  return `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

/** "Today", "Tomorrow", "Yesterday" or a short date. */
export function relativeDayLabel(value: LocalDate, today: LocalDate): string {
  if (value === today) return 'Today';
  if (value === addDays(today, 1)) return 'Tomorrow';
  if (value === addDays(today, -1)) return 'Yesterday';
  return shortDate(value);
}

export function weekdayName(index: number): string {
  return DAY_NAMES[index] ?? '';
}

export function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** "Today · Mon, Nov 9" for nearby days, otherwise "Wednesday, Nov 18". */
export function dayHeading(value: LocalDate, today: LocalDate): string {
  const rel = relativeDayLabel(value, today);
  return rel === shortDate(value) ? longDate(value) : `${rel} · ${shortDate(value)}`;
}
