import { compareEvents, eventDate, type CalendarEvent } from '../calendar';
import { addDays, weekDates, type LocalDate } from '../dates';
import { compareTasks, isOpen, type Task } from '../tasks/task';

export interface DayAgenda {
  date: LocalDate;
  events: CalendarEvent[];
  /** Tasks due on this day with a specific time. */
  timedTasks: Task[];
  /** Tasks due on this day with no time. */
  anytimeTasks: Task[];
  /** Open tasks from earlier days, only shown when viewing today. */
  overdueTasks: Task[];
  openCount: number;
}

export function agendaForDay(
  date: LocalDate,
  today: LocalDate,
  tasks: Task[],
  events: CalendarEvent[],
): DayAgenda {
  const dayTasks = tasks.filter((t) => t.dueDate === date).sort(compareTasks);
  const overdueTasks =
    date === today
      ? tasks.filter((t) => isOpen(t) && t.dueDate !== null && t.dueDate < today).sort(compareTasks)
      : [];
  return {
    date,
    events: events.filter((e) => eventDate(e) === date).sort(compareEvents),
    timedTasks: dayTasks.filter((t) => t.dueTime !== null),
    anytimeTasks: dayTasks.filter((t) => t.dueTime === null),
    overdueTasks,
    openCount: dayTasks.filter(isOpen).length + overdueTasks.length,
  };
}

export interface WeekOverview {
  weekStart: LocalDate;
  days: DayAgenda[];
  openTaskCount: number;
  eventCount: number;
}

export function weekOverview(
  weekStart: LocalDate,
  today: LocalDate,
  tasks: Task[],
  events: CalendarEvent[],
): WeekOverview {
  const days = weekDates(weekStart).map((d) => agendaForDay(d, today, tasks, events));
  return {
    weekStart,
    days,
    openTaskCount: days.reduce((n, d) => n + d.timedTasks.concat(d.anytimeTasks).filter(isOpen).length, 0),
    eventCount: days.reduce((n, d) => n + d.events.length, 0),
  };
}

/** Open tasks with no date: captured but not yet planned. */
export function unplannedTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => isOpen(t) && t.dueDate === null).sort(compareTasks);
}

/** A light-touch nudge for the week view. Returns null when the week looks reasonable. */
export function busiestDay(week: WeekOverview): { date: LocalDate; load: number } | null {
  let best: { date: LocalDate; load: number } | null = null;
  for (const day of week.days) {
    const load = day.events.length + day.timedTasks.length + day.anytimeTasks.filter(isOpen).length;
    if (!best || load > best.load) best = { date: day.date, load };
  }
  return best && best.load >= 6 ? best : null;
}

export const nextWeek = (weekStart: LocalDate) => addDays(weekStart, 7);
export const previousWeek = (weekStart: LocalDate) => addDays(weekStart, -7);
