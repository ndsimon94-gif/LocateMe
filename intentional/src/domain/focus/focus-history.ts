import { addDays, toLocalDate, weekDates, startOfWeek, type LocalDate } from '../dates';
import { focusedMs, type FocusTimerState } from './focus-timer';

export interface FocusSessionRecord {
  id: string;
  intention: string;
  plannedMinutes: number;
  focusedMinutes: number;
  startedAt: string;
  endedAt: string;
  /** True when the full planned time was completed. */
  completed: boolean;
}

/** Turns a finished or abandoned timer into a history record. Returns null for idle timers or sessions under a minute. */
export function recordFromTimer(state: FocusTimerState, now: number, id: string): FocusSessionRecord | null {
  if (state.status === 'idle') return null;
  const minutes = Math.floor(focusedMs(state, now) / 60_000);
  if (minutes < 1) return null;
  const endedAt = state.status === 'finished' ? state.endedAt : now;
  return {
    id,
    intention: state.intention,
    plannedMinutes: Math.round(state.durationMs / 60_000),
    focusedMinutes: minutes,
    startedAt: new Date(state.startedAt).toISOString(),
    endedAt: new Date(endedAt).toISOString(),
    completed: state.status === 'finished',
  };
}

export interface WeeklyFocusSummary {
  weekStart: LocalDate;
  totalMinutes: number;
  sessionCount: number;
  completedCount: number;
  /** Minutes per day, Monday first. */
  minutesByDay: { date: LocalDate; minutes: number }[];
  /** Change versus the previous week, in minutes. Null if there is no prior data. */
  changeFromLastWeek: number | null;
}

function minutesInRange(history: FocusSessionRecord[], from: LocalDate, toExclusive: LocalDate) {
  return history
    .filter((r) => {
      const d = toLocalDate(new Date(r.startedAt));
      return d >= from && d < toExclusive;
    })
    .reduce((sum, r) => sum + r.focusedMinutes, 0);
}

/**
 * Plain, descriptive insights. Deliberately no streaks, scores or goals:
 * the point is reflection, not a reason to open the app.
 */
export function weeklyFocusSummary(history: FocusSessionRecord[], today: LocalDate): WeeklyFocusSummary {
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 7);
  const thisWeek = history.filter((r) => {
    const d = toLocalDate(new Date(r.startedAt));
    return d >= weekStart && d < weekEnd;
  });
  const lastWeekStart = addDays(weekStart, -7);
  const hadPriorData = history.some((r) => toLocalDate(new Date(r.startedAt)) < weekStart);
  const totalMinutes = thisWeek.reduce((sum, r) => sum + r.focusedMinutes, 0);
  return {
    weekStart,
    totalMinutes,
    sessionCount: thisWeek.length,
    completedCount: thisWeek.filter((r) => r.completed).length,
    minutesByDay: weekDates(weekStart).map((date) => ({
      date,
      minutes: minutesInRange(thisWeek, date, addDays(date, 1)),
    })),
    changeFromLastWeek: hadPriorData ? totalMinutes - minutesInRange(history, lastWeekStart, weekStart) : null,
  };
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
