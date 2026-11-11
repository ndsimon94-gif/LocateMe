import type { CommunicationWindow } from '../communications/communication';
import { dayHeading, formatClock, isClockTime, isLocalDate, type ClockTime, type LocalDate } from '../dates';
import type { PlanOperation } from '../planning/plan';
import type { BlockKind, TimeBlock } from '../planning/time-block';
import { err, ok, type Result } from '../result';
import { applyEdit, createTask, type Task, type TaskDraft } from '../tasks/task';

/**
 * A change the assistant wants to make. Changes are only ever *staged*; the
 * user approves them (all or some) before anything is applied, and every
 * applied set can be undone.
 */
export type Change =
  | { op: 'add_task'; draft: TaskDraft }
  | { op: 'update_task'; taskId: string; patch: Partial<Pick<Task, 'title' | 'notes' | 'kind' | 'dueDate' | 'dueTime' | 'isPriority'>> }
  | { op: 'complete_task'; taskId: string }
  | { op: 'delete_task'; taskId: string }
  | { op: 'add_block'; block: { title: string; kind: BlockKind; date: LocalDate; start: ClockTime; end: ClockTime } }
  | { op: 'move_block'; blockId: string; date: LocalDate; start: ClockTime; end: ClockTime }
  | { op: 'remove_block'; blockId: string }
  | { op: 'set_communication_windows'; windows: CommunicationWindow[] }
  | { op: 'update_settings'; patch: SettingsPatch }
  | { op: 'start_focus'; minutes: number; intention: string };

export interface SettingsPatch {
  windDownTime?: ClockTime | null;
  notifyCommunicationWindows?: boolean;
  notifyTimeBlocks?: boolean;
  holdMessagesOutsideWindows?: boolean;
}

export interface StagedChange {
  id: string;
  change: Change;
  /** Plain-language line shown to the user. */
  label: string;
  detail: string;
}

/** The slice of app state changes are checked against. */
export interface ChangeState {
  today: LocalDate;
  now: Date;
  tasks: Task[];
  blocks: TimeBlock[];
  windows: CommunicationWindow[];
}

const timeRange = (start: ClockTime, end: ClockTime) => `${formatClock(start)}–${formatClock(end)}`;

/** Applies a change to a copy of state, for validating later changes in the same set. */
export function simulate(state: ChangeState, change: Change, newId: () => string): Result<ChangeState> {
  const ctx = { existing: state.tasks, today: state.today, now: state.now };
  switch (change.op) {
    case 'add_task': {
      const r = createTask(change.draft, { ...ctx, id: newId() });
      return r.ok ? ok({ ...state, tasks: [...state.tasks, r.value] }) : err(r.error);
    }
    case 'update_task': {
      const t = state.tasks.find((x) => x.id === change.taskId);
      if (!t) return err(`No task with id ${change.taskId}.`);
      const r = applyEdit(t, { ...change.patch, title: change.patch.title ?? t.title }, ctx);
      return r.ok ? ok({ ...state, tasks: state.tasks.map((x) => (x.id === t.id ? r.value : x)) }) : err(r.error);
    }
    case 'complete_task':
    case 'delete_task': {
      const t = state.tasks.find((x) => x.id === change.taskId);
      if (!t) return err(`No task with id ${change.taskId}.`);
      if (change.op === 'complete_task') {
        if (t.completedAt) return err(`"${t.title}" is already done.`);
        return ok({ ...state, tasks: state.tasks.map((x) => (x.id === t.id ? { ...x, completedAt: state.now.toISOString() } : x)) });
      }
      return ok({ ...state, tasks: state.tasks.filter((x) => x.id !== t.id) });
    }
    case 'add_block':
    case 'move_block': {
      const { date, start, end } = change.op === 'add_block' ? change.block : change;
      if (!isLocalDate(date)) return err('That date is not valid.');
      if (!isClockTime(start) || !isClockTime(end) || end <= start) return err('Use a start time before the end time, like 07:30–08:00.');
      if (date < state.today) return err('That day has already passed.');
      if (change.op === 'add_block') {
        if (!change.block.title.trim()) return err('Give the block a short title.');
        const block: TimeBlock = { id: newId(), ...change.block, title: change.block.title.trim(), planId: null, createdAt: state.now.toISOString() };
        return ok({ ...state, blocks: [...state.blocks, block] });
      }
      const b = state.blocks.find((x) => x.id === change.blockId);
      if (!b) return err(`No set-aside block with id ${change.blockId}.`);
      return ok({ ...state, blocks: state.blocks.map((x) => (x.id === b.id ? { ...x, date, start, end } : x)) });
    }
    case 'remove_block': {
      if (!state.blocks.some((x) => x.id === change.blockId)) return err(`No set-aside block with id ${change.blockId}.`);
      return ok({ ...state, blocks: state.blocks.filter((x) => x.id !== change.blockId) });
    }
    case 'set_communication_windows': {
      if (change.windows.length > 4) return err('At most four message windows a day.');
      for (const w of change.windows) {
        if (!isClockTime(w.start) || w.durationMinutes < 10 || w.durationMinutes > 90) return err('Each window needs a start like 11:30 and 10–90 minutes.');
      }
      return ok({ ...state, windows: change.windows });
    }
    case 'update_settings': {
      const w = change.patch.windDownTime;
      if (w !== undefined && w !== null && !isClockTime(w)) return err('Use a wind-down time like 21:30.');
      return ok(state);
    }
    case 'start_focus':
      if (!(change.minutes >= 1 && change.minutes <= 180)) return err('Focus sessions are 1 to 180 minutes.');
      return ok(state);
  }
}

/** Human description of a change, using current state for names. */
export function describeChange(change: Change, state: ChangeState): { label: string; detail: string } {
  const taskTitle = (id: string) => state.tasks.find((t) => t.id === id)?.title ?? 'a task';
  const when = (date: LocalDate | null | undefined, time?: ClockTime | null) =>
    date ? `${dayHeading(date, state.today)}${time ? ` at ${formatClock(time)}` : ''}` : 'no day';
  switch (change.op) {
    case 'add_task':
      return {
        label: `${change.draft.kind === 'reminder' ? 'Remind you' : 'Add'}: ${change.draft.title}`,
        detail: [when(change.draft.dueDate, change.draft.dueTime), change.draft.isPriority ? 'priority' : null].filter(Boolean).join(' · '),
      };
    case 'update_task': {
      const p = change.patch;
      const parts: string[] = [];
      if (p.title) parts.push(`rename to "${p.title}"`);
      if (p.dueDate !== undefined) parts.push(p.dueDate ? `move to ${when(p.dueDate, p.dueTime)}` : 'remove its day');
      else if (p.dueTime !== undefined) parts.push(p.dueTime ? `set time ${formatClock(p.dueTime)}` : 'remove its time');
      if (p.isPriority !== undefined) parts.push(p.isPriority ? 'make it a priority' : 'no longer a priority');
      if (p.kind) parts.push(p.kind === 'reminder' ? 'turn into a reminder' : 'turn into a task');
      if (p.notes !== undefined) parts.push('update notes');
      return { label: taskTitle(change.taskId), detail: parts.join(', ') || 'update' };
    }
    case 'complete_task':
      return { label: `Mark done: ${taskTitle(change.taskId)}`, detail: '' };
    case 'delete_task':
      return { label: `Remove: ${taskTitle(change.taskId)}`, detail: '' };
    case 'add_block':
      return { label: `Set aside: ${change.block.title}`, detail: `${when(change.block.date)}, ${timeRange(change.block.start, change.block.end)}` };
    case 'move_block': {
      const b = state.blocks.find((x) => x.id === change.blockId);
      return { label: `Move: ${b?.title ?? 'set-aside time'}`, detail: `to ${when(change.date)}, ${timeRange(change.start, change.end)}` };
    }
    case 'remove_block': {
      const b = state.blocks.find((x) => x.id === change.blockId);
      return { label: `Remove: ${b?.title ?? 'set-aside time'}`, detail: b ? `${when(b.date)}, ${timeRange(b.start, b.end)}` : '' };
    }
    case 'set_communication_windows':
      return {
        label: 'Message windows',
        detail: change.windows.length ? `Every day at ${change.windows.map((w) => `${formatClock(w.start)} (${w.durationMinutes} min)`).join(', ')}` : 'None',
      };
    case 'update_settings': {
      const p = change.patch;
      const parts: string[] = [];
      if (p.windDownTime !== undefined) parts.push(p.windDownTime ? `wind down from ${formatClock(p.windDownTime)}` : 'no wind-down time');
      if (p.notifyCommunicationWindows !== undefined) parts.push(`${p.notifyCommunicationWindows ? 'notify' : "don't notify"} when message windows open`);
      if (p.notifyTimeBlocks !== undefined) parts.push(`${p.notifyTimeBlocks ? 'notify' : "don't notify"} when set-aside time starts`);
      if (p.holdMessagesOutsideWindows !== undefined) parts.push(`${p.holdMessagesOutsideWindows ? 'hold' : "don't hold"} messages outside windows`);
      return { label: 'Settings', detail: parts.join(', ') };
    }
    case 'start_focus':
      return { label: `Start a ${change.minutes}-minute focus session`, detail: change.intention };
  }
}

/** Plan operations from the deterministic planner, as changes. */
export function planOperationToChange(op: PlanOperation): Change {
  switch (op.op) {
    case 'set_communication_windows':
      return { op: 'set_communication_windows', windows: op.windows };
    case 'add_block':
      return { op: 'add_block', block: op.block };
    case 'set_priority':
      return { op: 'update_task', taskId: op.taskId, patch: { isPriority: true, dueDate: op.date } };
    case 'add_reminder':
      return { op: 'add_task', draft: { title: op.title, kind: 'reminder', dueDate: op.date, dueTime: op.time, source: 'assistant' } };
  }
}

/** What's needed to reverse an applied set. */
export interface AppliedChangeset {
  id: string;
  appliedAt: string;
  summary: string;
  createdTaskIds: string[];
  /** Tasks as they were before being edited, completed or deleted. */
  previousTasks: Task[];
  createdBlockIds: string[];
  /** Blocks as they were before being moved or removed. */
  previousBlocks: TimeBlock[];
  previousWindows: CommunicationWindow[] | null;
  previousSettings: SettingsPatch | null;
  undone: boolean;
}

export function summarizeChanges(changes: Change[]): string {
  const count = (pred: (c: Change) => boolean) => changes.filter(pred).length;
  const parts: string[] = [];
  const add = (n: number, one: string, many: string) => n && parts.push(`${n} ${n === 1 ? one : many}`);
  add(count((c) => c.op === 'add_block' || c.op === 'move_block'), 'block of time', 'blocks of time');
  add(count((c) => c.op === 'add_task' && c.draft.kind === 'reminder'), 'reminder', 'reminders');
  add(count((c) => c.op === 'add_task' && c.draft.kind !== 'reminder'), 'new task', 'new tasks');
  add(count((c) => c.op === 'update_task' || c.op === 'complete_task' || c.op === 'delete_task' || c.op === 'remove_block'), 'other change', 'other changes');
  if (changes.some((c) => c.op === 'set_communication_windows')) parts.push('message windows');
  if (changes.some((c) => c.op === 'update_settings')) parts.push('settings');
  if (changes.some((c) => c.op === 'start_focus')) parts.push('a focus session');
  return parts.length ? parts.join(', ') : 'No changes';
}

/** Validates and describes a list of changes in order, as one staged set. */
export function stageChanges(changes: Change[], state: ChangeState, newId: () => string): { staged: StagedChange[]; failures: string[] } {
  let sim = state;
  const staged: StagedChange[] = [];
  const failures: string[] = [];
  for (const change of changes) {
    const next = simulate(sim, change, newId);
    const { label, detail } = describeChange(change, sim);
    if (!next.ok) {
      failures.push(`${label}: ${next.error}`);
      continue;
    }
    staged.push({ id: `c${staged.length + 1}`, change, label, detail });
    sim = next.value;
  }
  return { staged, failures };
}
