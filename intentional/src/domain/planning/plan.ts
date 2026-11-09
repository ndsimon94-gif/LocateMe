import type { CalendarEvent } from '../calendar';
import type { CommunicationWindow } from '../communications/communication';
import { addDays, atTime, clockTimeToMinutes, dayOfWeek, formatClock, minutesSinceMidnight, shortDate, toLocalDate, weekdayName, type ClockTime, type LocalDate } from '../dates';
import { compareTasks, isOpen, MAX_DAILY_PRIORITIES, priorityDate, type Task } from '../tasks/task';
import { busyIntervals, findSlot, freeIntervals, overlaps, range, toClock, type Interval } from './availability';
import type { HabitRequest, PartOfDay, PlanRequest } from './plan-request';
import type { BlockKind, TimeBlock } from './time-block';

/**
 * Deterministic planner. Given a structured request and the user's real
 * data, it proposes concrete operations. Nothing is applied until the user
 * reviews and approves the proposal.
 */

export type PlanOperation =
  | { id: string; op: 'set_communication_windows'; windows: CommunicationWindow[]; reason: string }
  | { id: string; op: 'add_block'; block: { title: string; kind: BlockKind; date: LocalDate; start: ClockTime; end: ClockTime }; reason: string }
  | { id: string; op: 'set_priority'; taskId: string; taskTitle: string; date: LocalDate; reason: string }
  | { id: string; op: 'add_reminder'; title: string; date: LocalDate; time: ClockTime; reason: string };

export interface PlanProposal {
  id: string;
  createdAt: string;
  request: PlanRequest;
  days: LocalDate[];
  summary: string;
  operations: PlanOperation[];
  /** Things the planner couldn't do, said plainly. */
  notes: string[];
}

export interface PlanContext {
  now: Date;
  id: string;
  tasks: Task[];
  /** Calendar events covering at least the horizon. */
  events: CalendarEvent[];
  blocks: TimeBlock[];
  currentWindows: CommunicationWindow[];
  /** The hours the planner may use. */
  planningHours: { start: ClockTime; end: ClockTime };
}

const PART_RANGES: Record<Exclude<PartOfDay, 'any'>, [ClockTime, ClockTime]> = {
  morning: ['07:00', '10:00'],
  midday: ['11:30', '14:00'],
  afternoon: ['14:00', '17:30'],
  evening: ['17:30', '20:00'],
};

const WINDOW_TARGETS: Record<number, ClockTime[]> = {
  1: ['11:30'],
  2: ['11:30', '16:30'],
  3: ['09:30', '13:00', '16:30'],
  4: ['09:00', '11:30', '14:30', '17:00'],
};

const IMPORTANT = /\b(dentist|doctor|appointment|interview|flight|train|deadline|exam|review|meeting with)\b/i;
const HABIT_BUFFER = 10;

export function planDays(request: PlanRequest, now: Date): LocalDate[] {
  const today = toLocalDate(now);
  const from = request.horizon.from < today ? today : request.horizon.from;
  const end = addDays(request.horizon.from, request.horizon.days);
  const days: LocalDate[] = [];
  for (let d = from; d < end; d = addDays(d, 1)) days.push(d);
  return days;
}

function earliestStart(date: LocalDate, now: Date): number {
  if (date !== toLocalDate(now)) return 0;
  return Math.ceil((minutesSinceMidnight(now) + 15) / 15) * 15;
}

function windowIntervals(windows: CommunicationWindow[]): Interval[] {
  return windows.map((w) => ({ start: clockTimeToMinutes(w.start), end: clockTimeToMinutes(w.start) + w.durationMinutes }));
}

/** Picks daily window times near sensible targets that clash with the fewest events across the horizon. */
export function chooseCommunicationWindows(
  perDay: number,
  minutes: number,
  days: LocalDate[],
  events: CalendarEvent[],
  hours: Interval,
): CommunicationWindow[] {
  const busyByDay = days.map((d) => busyIntervals(d, events));
  const chosen: Interval[] = [];
  for (const target of WINDOW_TARGETS[perDay] ?? WINDOW_TARGETS[2]!) {
    const base = clockTimeToMinutes(target);
    let best: { slot: Interval; score: number } | null = null;
    for (const delta of [0, -30, 30, -60, 60, -90, 90]) {
      const slot = { start: base + delta, end: base + delta + minutes };
      if (slot.start < hours.start || slot.end > hours.end) continue;
      if (chosen.some((c) => overlaps(c, slot))) continue;
      const clashes = busyByDay.filter((busy) => busy.some((b) => overlaps(b, slot))).length;
      const score = clashes * 1000 + Math.abs(delta);
      if (!best || score < best.score) best = { slot, score };
    }
    if (best) chosen.push(best.slot);
  }
  return chosen.sort((a, b) => a.start - b.start).map((c) => ({ start: toClock(c.start), durationMinutes: minutes }));
}

function habitDays(habit: HabitRequest, days: LocalDate[], events: CalendarEvent[]): LocalDate[] {
  if (habit.frequency === 'daily') return days;
  if (habit.frequency === 'weekdays') return days.filter((d) => dayOfWeek(d) >= 1 && dayOfWeek(d) <= 5);
  const n = Math.min(habit.frequency.timesPerWeek, days.length);
  const load = (d: LocalDate) => busyIntervals(d, events).reduce((sum, i) => sum + (i.end - i.start), 0);
  // Prefer lighter days; then spread by date.
  return [...days]
    .sort((a, b) => load(a) - load(b) || (a < b ? -1 : 1))
    .slice(0, n)
    .sort();
}

function describeDays(days: LocalDate[]): string {
  if (days.length === 0) return 'no days';
  if (days.length === 1) return shortDate(days[0]!);
  const first = weekdayName(dayOfWeek(days[0]!)).slice(0, 3);
  const last = weekdayName(dayOfWeek(days[days.length - 1]!)).slice(0, 3);
  return `${first}–${last}`;
}

export function buildPlan(request: PlanRequest, ctx: PlanContext): PlanProposal {
  const days = planDays(request, ctx.now);
  const ops: PlanOperation[] = [];
  const notes: string[] = [];
  let n = 0;
  const nextId = () => `op-${++n}`;
  const hours = range(ctx.planningHours.start, ctx.planningHours.end);

  // 1. Communication windows (they shape everything else).
  let windows = ctx.currentWindows;
  if (request.communicationWindows) {
    const { perDay, minutes } = request.communicationWindows;
    windows = chooseCommunicationWindows(perDay, minutes, days, ctx.events, hours);
    if (windows.length < perDay) notes.push(`Only found room for ${windows.length} message ${windows.length === 1 ? 'window' : 'windows'} a day.`);
    ops.push({
      id: nextId(),
      op: 'set_communication_windows',
      windows,
      reason: `${windows.map((w) => formatClock(w.start)).join(' and ')}, chosen to avoid your meetings.`,
    });
  }

  // 2. Habits (exercise, etc.) placed in free time.
  const planned: Record<LocalDate, Interval[]> = {};
  for (const habit of request.habits ?? []) {
    const targetDays = habitDays(habit, days, ctx.events);
    let placed = 0;
    for (const date of targetDays) {
      const already = ctx.blocks.some((b) => b.date === date && b.kind === habit.kind);
      if (already) continue;
      const busy = [
        ...busyIntervals(date, ctx.events),
        ...ctx.blocks.filter((b) => b.date === date).map((b) => range(b.start, b.end)),
        ...windowIntervals(windows),
        ...(planned[date] ?? []),
      ];
      const bounds = { start: Math.max(hours.start, earliestStart(date, ctx.now)), end: hours.end };
      if (bounds.end - bounds.start < habit.minutes) continue;
      const preferred = habit.preferred === 'any' ? bounds : range(...PART_RANGES[habit.preferred]);
      const slot = findSlot(freeIntervals(bounds, busy, HABIT_BUFFER), habit.minutes, preferred);
      if (!slot) {
        notes.push(`No free ${habit.minutes} minutes for ${habit.title.toLowerCase()} on ${shortDate(date)}.`);
        continue;
      }
      (planned[date] ??= []).push(slot);
      placed++;
      ops.push({
        id: nextId(),
        op: 'add_block',
        block: { title: habit.title, kind: habit.kind, date, start: toClock(slot.start), end: toClock(slot.end) },
        reason:
          habit.preferred === 'any'
            ? 'Free time on your calendar.'
            : slot.start >= preferred.start && slot.end <= preferred.end
              ? `Free time in the ${habit.preferred}.`
              : `No ${habit.preferred} gap, so the closest free time.`,
      });
    }
    if (placed === 0 && targetDays.length > 0) notes.push(`Couldn't fit ${habit.title.toLowerCase()} this time.`);
  }

  // 3. Priorities: fill each day up to perDay with the most pressing open tasks.
  if (request.priorities) {
    const today = toLocalDate(ctx.now);
    const used = new Set<string>();
    const open = ctx.tasks.filter((t) => isOpen(t) && !t.isPriority).sort(compareTasks);
    days.forEach((date, i) => {
      const existing = ctx.tasks.filter((t) => t.isPriority && isOpen(t) && priorityDate(t, today) === date).length;
      const want = Math.min(request.priorities!.perDay, MAX_DAILY_PRIORITIES) - existing;
      if (want <= 0) return;
      const candidates = [
        ...open.filter((t) => t.dueDate !== null && (t.dueDate === date || (i === 0 && t.dueDate < date))),
        ...open.filter((t) => t.dueDate === null),
      ].filter((t) => !used.has(t.id));
      for (const t of candidates.slice(0, want)) {
        used.add(t.id);
        ops.push({
          id: nextId(),
          op: 'set_priority',
          taskId: t.id,
          taskTitle: t.title,
          date,
          reason: t.dueDate === null ? 'On your list without a day.' : t.dueDate < date ? 'Overdue.' : 'Due this day.',
        });
      }
    });
    if (!ops.some((o) => o.op === 'set_priority')) notes.push('No open tasks to make priorities from. Capture a few first.');
  }

  // 4. Reminders before important events.
  if (request.reminders?.importantEvents) {
    for (const e of ctx.events) {
      if (e.origin === 'intentional' || e.allDay) continue;
      const start = new Date(e.start);
      const date = toLocalDate(start);
      if (!days.includes(date)) continue;
      if (!e.location && !IMPORTANT.test(e.title)) continue;
      const lead = e.location ? 30 : 15;
      const at = new Date(start.getTime() - lead * 60_000);
      if (at <= ctx.now || toLocalDate(at) !== date) continue;
      const title = e.location ? `Leave for ${e.title} (${e.location})` : `${e.title} at ${formatClock(toClock(minutesSinceMidnight(start)))}`;
      const time = toClock(minutesSinceMidnight(at));
      if (ctx.tasks.some((t) => t.kind === 'reminder' && t.title === title && t.dueDate === date)) continue;
      ops.push({ id: nextId(), op: 'add_reminder', title, date, time, reason: `${lead} minutes before it starts.` });
    }
  }

  return { id: ctx.id, createdAt: ctx.now.toISOString(), request, days, summary: summarize(ops, days), operations: ops, notes };
}

export function summarize(ops: PlanOperation[], days: LocalDate[]): string {
  const parts: string[] = [];
  const count = (k: PlanOperation['op']) => ops.filter((o) => o.op === k).length;
  const windows = ops.find((o) => o.op === 'set_communication_windows');
  if (windows && windows.op === 'set_communication_windows') parts.push(`${windows.windows.length} message ${windows.windows.length === 1 ? 'window' : 'windows'} a day`);
  const blocks = ops.filter((o) => o.op === 'add_block');
  const titles = [...new Set(blocks.map((b) => (b.op === 'add_block' ? b.block.title.toLowerCase() : '')))];
  for (const t of titles) {
    const c = blocks.filter((b) => b.op === 'add_block' && b.block.title.toLowerCase() === t).length;
    parts.push(`${c} ${t} ${c === 1 ? 'session' : 'sessions'}`);
  }
  if (count('set_priority')) parts.push(`${count('set_priority')} ${count('set_priority') === 1 ? 'priority' : 'priorities'}`);
  if (count('add_reminder')) parts.push(`${count('add_reminder')} ${count('add_reminder') === 1 ? 'reminder' : 'reminders'}`);
  if (parts.length === 0) return `Nothing to change for ${describeDays(days)}.`;
  return `For ${describeDays(days)}: ${parts.join(', ')}.`;
}

/** Record kept so an applied plan can be undone. */
export interface AppliedPlan {
  id: string;
  appliedAt: string;
  summary: string;
  createdTaskIds: string[];
  createdBlockIds: string[];
  prioritizedTaskIds: string[];
  previousWindows: CommunicationWindow[] | null;
  undone: boolean;
}

/** Start/end timestamps for an operation, for display. */
export function operationTime(op: PlanOperation): Date | null {
  if (op.op === 'add_block') return atTime(op.block.date, op.block.start);
  if (op.op === 'add_reminder') return atTime(op.date, op.time);
  return null;
}
