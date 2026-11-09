import { isClockTime, isLocalDate, type ClockTime, type LocalDate } from '../dates';
import { err, ok, type Result } from '../result';

export type TaskKind = 'task' | 'reminder';
export type TaskSource = 'manual' | 'assistant' | 'communication';

export interface Task {
  id: string;
  title: string;
  notes: string;
  kind: TaskKind;
  dueDate: LocalDate | null;
  dueTime: ClockTime | null;
  isPriority: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  source: TaskSource;
}

/** What a user (or the assistant) supplies when creating or editing a task. */
export interface TaskDraft {
  title: string;
  notes?: string;
  kind?: TaskKind;
  dueDate?: LocalDate | null;
  dueTime?: ClockTime | null;
  isPriority?: boolean;
  source?: TaskSource;
}

export const MAX_TITLE_LENGTH = 200;
export const MAX_DAILY_PRIORITIES = 3;

export const isOpen = (task: Task) => task.completedAt === null;

/**
 * The date a priority counts against. Overdue priorities roll forward to
 * today so they still occupy one of today's three slots.
 */
export function priorityDate(task: Task, today: LocalDate): LocalDate {
  if (!task.dueDate || task.dueDate < today) return today;
  return task.dueDate;
}

export function openPriorityCount(tasks: Task[], date: LocalDate, today: LocalDate, excludeId?: string): number {
  return tasks.filter(
    (t) => t.id !== excludeId && t.isPriority && isOpen(t) && priorityDate(t, today) === date,
  ).length;
}

interface ValidationContext {
  existing: Task[];
  today: LocalDate;
  /** Set when editing so the task doesn't count against its own priority slot. */
  editingId?: string;
}

export function validateDraft(draft: TaskDraft, ctx: ValidationContext): Result<Required<Omit<TaskDraft, 'source'>>> {
  const title = draft.title.trim();
  if (!title) return err('Give the task a short title.');
  if (title.length > MAX_TITLE_LENGTH) return err(`Keep the title under ${MAX_TITLE_LENGTH} characters.`);

  const dueDate = draft.dueDate ?? null;
  const dueTime = draft.dueTime ?? null;
  if (dueDate !== null && !isLocalDate(dueDate)) return err('That date is not valid.');
  if (dueTime !== null && !isClockTime(dueTime)) return err('Use a time like 09:30 or 14:00.');
  if (dueTime !== null && dueDate === null) return err('Pick a day for this time.');

  const kind = draft.kind ?? 'task';
  if (kind === 'reminder' && dueDate === null) return err('Reminders need a day.');

  const isPriority = draft.isPriority ?? false;
  // A priority with no date belongs to today.
  const effectiveDate = isPriority && dueDate === null ? ctx.today : dueDate;
  if (isPriority) {
    const slotDate = effectiveDate! < ctx.today ? ctx.today : effectiveDate!;
    if (openPriorityCount(ctx.existing, slotDate, ctx.today, ctx.editingId) >= MAX_DAILY_PRIORITIES) {
      return err(`You already have ${MAX_DAILY_PRIORITIES} priorities for that day. Three is the point.`);
    }
  }

  return ok({
    title,
    notes: (draft.notes ?? '').trim(),
    kind,
    dueDate: effectiveDate,
    dueTime,
    isPriority,
  });
}

export function createTask(
  draft: TaskDraft,
  ctx: ValidationContext & { id: string; now: Date },
): Result<Task> {
  const valid = validateDraft(draft, ctx);
  if (!valid.ok) return valid;
  const stamp = ctx.now.toISOString();
  return ok({
    id: ctx.id,
    ...valid.value,
    completedAt: null,
    createdAt: stamp,
    updatedAt: stamp,
    source: draft.source ?? 'manual',
  });
}

export function applyEdit(
  task: Task,
  draft: TaskDraft,
  ctx: ValidationContext & { now: Date },
): Result<Task> {
  const merged: TaskDraft = {
    title: draft.title,
    notes: draft.notes ?? task.notes,
    kind: draft.kind ?? task.kind,
    dueDate: draft.dueDate === undefined ? task.dueDate : draft.dueDate,
    dueTime: draft.dueTime === undefined ? task.dueTime : draft.dueTime,
    // Completed tasks don't occupy a priority slot, so only validate the slot for open tasks.
    isPriority: draft.isPriority ?? task.isPriority,
  };
  const valid = validateDraft(isOpen(task) ? merged : { ...merged, isPriority: false }, {
    ...ctx,
    editingId: task.id,
  });
  if (!valid.ok) return valid;
  return ok({
    ...task,
    ...valid.value,
    isPriority: merged.isPriority ?? false,
    updatedAt: ctx.now.toISOString(),
  });
}

/** Stable ordering: overdue/dated first by date+time, undated last, then by creation. */
export function compareTasks(a: Task, b: Task): number {
  const ad = a.dueDate ?? '9999-12-31';
  const bd = b.dueDate ?? '9999-12-31';
  if (ad !== bd) return ad < bd ? -1 : 1;
  const at = a.dueTime ?? '99:99';
  const bt = b.dueTime ?? '99:99';
  if (at !== bt) return at < bt ? -1 : 1;
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

export function newId(now: Date = new Date()): string {
  return `${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
