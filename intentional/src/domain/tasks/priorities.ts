import type { LocalDate } from '../dates';
import { compareTasks, isOpen, MAX_DAILY_PRIORITIES, priorityDate, type Task } from './task';

/** Today's priorities (up to three), including overdue priorities carried forward. */
export function todaysPriorities(tasks: Task[], today: LocalDate): Task[] {
  return tasks
    .filter((t) => t.isPriority && isOpen(t) && priorityDate(t, today) === today)
    .sort(compareTasks)
    .slice(0, MAX_DAILY_PRIORITIES);
}

/**
 * Candidates the user might promote when fewer than three priorities are set:
 * open tasks due today or overdue, then unplanned tasks. Kept short on purpose.
 */
export function priorityCandidates(tasks: Task[], today: LocalDate, limit = 3): Task[] {
  const open = tasks.filter((t) => isOpen(t) && !t.isPriority);
  const dueNow = open.filter((t) => t.dueDate !== null && t.dueDate <= today).sort(compareTasks);
  const unplanned = open.filter((t) => t.dueDate === null).sort(compareTasks);
  return [...dueNow, ...unplanned].slice(0, limit);
}
