import type { CalendarEvent } from '../calendar';
import { clockTimeToMinutes, minutesSinceMidnight, toLocalDate, type ClockTime, type LocalDate } from '../dates';

/** Minutes since local midnight, half-open [start, end). */
export interface Interval {
  start: number;
  end: number;
}

export const toClock = (minutes: number): ClockTime =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export const range = (start: ClockTime, end: ClockTime): Interval => ({ start: clockTimeToMinutes(start), end: clockTimeToMinutes(end) });

export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = intervals.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else out.push({ ...i });
  }
  return out;
}

/** Busy time on a day from timed events (all-day events don't block time). */
export function busyIntervals(date: LocalDate, events: CalendarEvent[]): Interval[] {
  const intervals: Interval[] = [];
  for (const e of events) {
    if (e.allDay) continue;
    const start = new Date(e.start);
    const end = new Date(e.end);
    const startDay = toLocalDate(start);
    const endDay = toLocalDate(end);
    if (startDay > date || endDay < date) continue;
    intervals.push({
      start: startDay < date ? 0 : minutesSinceMidnight(start),
      end: endDay > date ? 24 * 60 : minutesSinceMidnight(end),
    });
  }
  return mergeIntervals(intervals);
}

/** Free intervals inside `bounds`, keeping `buffer` minutes clear around busy time. */
export function freeIntervals(bounds: Interval, busy: Interval[], buffer = 0): Interval[] {
  const padded = mergeIntervals(busy.map((b) => ({ start: b.start - buffer, end: b.end + buffer })));
  const free: Interval[] = [];
  let cursor = bounds.start;
  for (const b of padded) {
    if (b.end <= cursor) continue;
    if (b.start >= bounds.end) break;
    if (b.start > cursor) free.push({ start: cursor, end: Math.min(b.start, bounds.end) });
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < bounds.end) free.push({ start: cursor, end: bounds.end });
  return free;
}

const roundUp = (minutes: number, step: number) => Math.ceil(minutes / step) * step;

/**
 * Earliest slot of `duration` minutes inside `preferred` (aligned to `step`).
 * Falls back to the slot closest to the preferred range within `free`.
 */
export function findSlot(free: Interval[], duration: number, preferred: Interval, step = 15): Interval | null {
  const candidates: Interval[] = [];
  for (const f of free) {
    for (let s = roundUp(f.start, step); s + duration <= f.end; s += step) candidates.push({ start: s, end: s + duration });
  }
  if (candidates.length === 0) return null;
  const distance = (c: Interval) =>
    c.start >= preferred.start && c.end <= preferred.end ? 0 : Math.min(Math.abs(c.start - preferred.start), Math.abs(c.end - preferred.end));
  return candidates.reduce((best, c) => (distance(c) < distance(best) ? c : best));
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}
