import type { CalendarEvent } from '../calendar';
import type { CommunicationWindow } from '../communications/communication';
import { addDays, minutesSinceMidnight, toLocalDate, weekdayName, type LocalDate } from '../dates';
import { remainingMs, type FocusTimerState } from '../focus/focus-timer';
import type { TimeBlock } from '../planning/time-block';
import { compareTasks, isOpen, type Task } from '../tasks/task';
import { toClock } from '../planning/availability';

export interface SnapshotInput {
  now: Date;
  timeZone: string;
  tasks: Task[];
  blocks: TimeBlock[];
  /** Calendar events covering at least the next 7 days. */
  events: CalendarEvent[];
  calendarSource: 'google' | 'sample';
  windows: CommunicationWindow[];
  settings: { windDownTime: string | null; planningHours: { start: string; end: string }; notifyCommunicationWindows: boolean; notifyTimeBlocks: boolean };
  focus: FocusTimerState;
}

const SNAPSHOT_DAYS = 7;
const MAX_TASKS = 60;
const MAX_EVENTS = 80;

const clock = (iso: string) => toClock(minutesSinceMidnight(new Date(iso)));

/**
 * Compact, text-only state for the assistant. Titles and times only; ids so
 * the assistant can refer to things exactly. Completed tasks are included
 * only for today, so a wrap-up can see what got done.
 */
export function buildSnapshot(s: SnapshotInput): string {
  const today = toLocalDate(s.now);
  const end: LocalDate = addDays(today, SNAPSHOT_DAYS);
  const tasks = s.tasks
    .filter((t) => isOpen(t) || (t.completedAt && toLocalDate(new Date(t.completedAt)) === today))
    .sort(compareTasks)
    .slice(0, MAX_TASKS)
    .map((t) => {
      const parts = [`[${t.id}]`, t.title];
      if (t.kind === 'reminder') parts.push('(reminder)');
      parts.push(t.dueDate ? `due ${t.dueDate}${t.dueTime ? ` ${t.dueTime}` : ''}${t.dueDate < today && isOpen(t) ? ' OVERDUE' : ''}` : 'no day');
      if (t.isPriority) parts.push('PRIORITY');
      if (!isOpen(t)) parts.push('DONE today');
      return `- ${parts.join(' ')}`;
    });
  const blocks = s.blocks
    .filter((b) => b.date >= today && b.date < end)
    .sort((a, b) => (a.date + a.start < b.date + b.start ? -1 : 1))
    .map((b) => `- [${b.id}] ${b.date} ${b.start}-${b.end} ${b.title} (${b.kind})`);
  const events = s.events
    .filter((e) => e.origin !== 'intentional')
    .filter((e) => {
      const d = toLocalDate(new Date(e.start));
      return d >= today && d < end;
    })
    .sort((a, b) => (a.start < b.start ? -1 : 1))
    .slice(0, MAX_EVENTS)
    .map((e) => {
      const d = toLocalDate(new Date(e.start));
      const time = e.allDay ? 'all day' : `${clock(e.start)}-${clock(e.end)}`;
      return `- ${d} ${time} ${e.title}${e.location ? ` @ ${e.location}` : ''}${e.showAsFree ? ' (free)' : ''}`;
    });
  const focus =
    s.focus.status === 'running'
      ? `running, ${Math.ceil(remainingMs(s.focus, s.now.getTime()) / 60_000)} min left${s.focus.intention ? ` on "${s.focus.intention}"` : ''}`
      : s.focus.status === 'paused'
        ? 'paused'
        : 'not running';

  return [
    '<state>',
    `Now: ${weekdayName(s.now.getDay())} ${today} ${toClock(minutesSinceMidnight(s.now))}${s.timeZone ? ` (${s.timeZone})` : ''}`,
    `Calendar: ${s.calendarSource === 'google' ? 'Google Calendar (read-only)' : 'sample events (no calendar connected)'}. Email: not connected.`,
    `Planning hours: ${s.settings.planningHours.start}-${s.settings.planningHours.end}. Wind-down: ${s.settings.windDownTime ?? 'off'}.`,
    `Message windows: ${s.windows.length ? s.windows.map((w) => `${w.start} (${w.durationMinutes} min)`).join(', ') : 'none'}. Notify when windows open: ${s.settings.notifyCommunicationWindows ? 'yes' : 'no'}. Notify when blocks start: ${s.settings.notifyTimeBlocks ? 'yes' : 'no'}.`,
    `Focus: ${focus}.`,
    `Tasks:${tasks.length ? `\n${tasks.join('\n')}` : ' none'}`,
    `Set-aside blocks (next ${SNAPSHOT_DAYS} days):${blocks.length ? `\n${blocks.join('\n')}` : ' none'}`,
    `Calendar events (next ${SNAPSHOT_DAYS} days):${events.length ? `\n${events.join('\n')}` : ' none'}`,
    '</state>',
  ].join('\n');
}
