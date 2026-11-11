import type { CalendarEvent } from '../calendar';
import type { CommunicationWindow } from '../communications/communication';
import { clockTimeToMinutes, minutesSinceMidnight, toLocalDate, type ClockTime, type LocalDate } from '../dates';
import { busyIntervals, freeIntervals, range, toClock, type Interval } from '../planning/availability';
import type { PartOfDay } from '../planning/plan-request';
import type { TimeBlock } from '../planning/time-block';

const PARTS: Record<Exclude<PartOfDay, 'any'>, [ClockTime, ClockTime]> = {
  morning: ['06:00', '11:30'],
  midday: ['11:30', '14:00'],
  afternoon: ['14:00', '17:30'],
  evening: ['17:30', '22:00'],
};

export interface FreeTimeQuery {
  date: LocalDate;
  minutes: number;
  partOfDay: PartOfDay;
  count: number;
}

export interface FreeTimeContext {
  now: Date;
  events: CalendarEvent[];
  blocks: TimeBlock[];
  windows: CommunicationWindow[];
  planningHours: { start: ClockTime; end: ClockTime };
}

/**
 * Up to `count` non-overlapping free slots, spread across the free time
 * (not all back-to-back), keeping 10 minutes clear around commitments.
 */
export function findFreeSlots(q: FreeTimeQuery, ctx: FreeTimeContext): { start: ClockTime; end: ClockTime }[] {
  const minutes = Math.max(10, Math.min(240, Math.round(q.minutes)));
  const count = Math.max(1, Math.min(5, Math.round(q.count)));
  const hours = range(ctx.planningHours.start, ctx.planningHours.end);
  let lower = hours.start;
  if (q.date === toLocalDate(ctx.now)) lower = Math.max(lower, Math.ceil((minutesSinceMidnight(ctx.now) + 10) / 15) * 15);
  if (q.date < toLocalDate(ctx.now)) return [];
  const part = q.partOfDay === 'any' ? null : range(...PARTS[q.partOfDay]);
  const bounds: Interval = part ? { start: Math.max(lower, part.start), end: Math.min(hours.end, part.end) } : { start: lower, end: hours.end };
  if (bounds.end - bounds.start < minutes) return [];

  const busy = [
    ...busyIntervals(q.date, ctx.events),
    ...ctx.blocks.filter((b) => b.date === q.date).map((b) => range(b.start, b.end)),
    ...ctx.windows.map((w) => ({ start: clockTimeToMinutes(w.start), end: clockTimeToMinutes(w.start) + w.durationMinutes })),
  ];
  const slots: Interval[] = [];
  for (const f of freeIntervals(bounds, busy, 10)) {
    // Take the start of each free stretch, then step through long stretches.
    for (let s = Math.ceil(f.start / 15) * 15; s + minutes <= f.end && slots.length < count; s += Math.max(minutes + 30, 60)) {
      slots.push({ start: s, end: s + minutes });
    }
    if (slots.length >= count) break;
  }
  return slots.map((s) => ({ start: toClock(s.start), end: toClock(s.end) }));
}
