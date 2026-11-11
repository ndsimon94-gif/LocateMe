import type { CalendarEvent } from '@/domain/calendar';
import { describeChange, planOperationToChange, simulate, type Change, type ChangeState, type StagedChange } from '@/domain/assistant/changeset';
import { findFreeSlots } from '@/domain/assistant/free-time';
import { addDays, isLocalDate } from '@/domain/dates';
import { buildPlan, planDays } from '@/domain/planning/plan';
import { parsePlanRequest } from '@/domain/planning/plan-request';

/**
 * Executes the assistant's tool calls on the device. Read tools answer from
 * real data; write tools only *stage* changes (validated against the state as
 * it would be after earlier staged changes) for the user to approve.
 */
export interface ToolEnv {
  now: Date;
  /** State with this turn's staged changes already applied (simulated). */
  sim: ChangeState;
  staged: StagedChange[];
  planningHours: { start: string; end: string };
  newId(): string;
  getEvents(from: string, toExclusive: string): Promise<CalendarEvent[]>;
}

export interface ToolOutcome {
  content: string;
  isError: boolean;
}

type Input = Record<string, unknown>;
const s = (v: unknown) => (typeof v === 'string' ? v : null);
const b = (v: unknown) => (typeof v === 'boolean' ? v : null);
const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const fail = (content: string): ToolOutcome => ({ content, isError: true });

function stage(env: ToolEnv, change: Change): ToolOutcome {
  const next = simulate(env.sim, change, env.newId);
  if (!next.ok) return fail(next.error);
  const { label, detail } = describeChange(change, env.sim);
  const staged: StagedChange = { id: `c${env.staged.length + 1}`, change, label, detail };
  env.staged.push(staged);
  env.sim = next.value;
  return { content: `Staged ${staged.id} (pending the user's approval): ${label}${detail ? `, ${detail}` : ''}.`, isError: false };
}

/** Converts the model's nullable fields into a PlanRequest candidate. */
function planRequestFrom(raw: Input) {
  return {
    horizon: raw.horizon,
    ...(raw.priorities ? { priorities: raw.priorities } : {}),
    ...(Array.isArray(raw.habits) && raw.habits.length ? { habits: raw.habits } : {}),
    ...(raw.communicationWindows ? { communicationWindows: raw.communicationWindows } : {}),
    ...(raw.reminders ? { reminders: raw.reminders } : {}),
  };
}

export async function executeTool(name: string, input: Input, env: ToolEnv): Promise<ToolOutcome> {
  switch (name) {
    case 'find_free_time': {
      const date = s(input.date);
      if (!date || !isLocalDate(date)) return fail('date must be YYYY-MM-DD.');
      const events = await env.getEvents(date, addDays(date, 1));
      const part = s(input.part_of_day);
      const slots = findFreeSlots(
        {
          date,
          minutes: n(input.minutes) ?? 30,
          partOfDay: part === 'morning' || part === 'midday' || part === 'afternoon' || part === 'evening' ? part : 'any',
          count: n(input.count) ?? 3,
        },
        { now: env.now, events, blocks: env.sim.blocks, windows: env.sim.windows, planningHours: env.planningHours },
      );
      return {
        content: slots.length ? `Free on ${date}: ${slots.map((x) => `${x.start}-${x.end}`).join(', ')}.` : `No free slot of that length on ${date} in that part of the day.`,
        isError: false,
      };
    }

    case 'propose_plan': {
      const parsed = parsePlanRequest(planRequestFrom((input.request ?? {}) as Input));
      if (!parsed.ok) return fail(`Invalid plan request: ${parsed.error}`);
      const days = planDays(parsed.value, env.now);
      if (days.length === 0) return fail('That horizon is entirely in the past.');
      const events = await env.getEvents(days[0]!, addDays(days[days.length - 1]!, 1));
      const proposal = buildPlan(parsed.value, {
        now: env.now,
        id: env.newId(),
        tasks: env.sim.tasks,
        events,
        blocks: env.sim.blocks,
        currentWindows: env.sim.windows,
        planningHours: env.planningHours,
      });
      const lines: string[] = [];
      for (const op of proposal.operations) {
        const r = stage(env, planOperationToChange(op));
        lines.push(r.isError ? `Skipped (${r.content})` : r.content);
      }
      return {
        content: [`Planner result: ${proposal.summary}`, ...lines, ...proposal.notes.map((x) => `Note: ${x}`)].join('\n'),
        isError: false,
      };
    }

    case 'add_task': {
      const title = s(input.title)?.trim();
      if (!title) return fail('title is required.');
      return stage(env, {
        op: 'add_task',
        draft: {
          title,
          kind: input.kind === 'reminder' ? 'reminder' : 'task',
          dueDate: s(input.due_date),
          dueTime: s(input.due_time),
          isPriority: input.is_priority === true,
          notes: s(input.notes) ?? '',
          source: 'assistant',
        },
      });
    }

    case 'update_task': {
      const taskId = s(input.task_id);
      if (!taskId) return fail('task_id is required.');
      const patch: Extract<Change, { op: 'update_task' }>['patch'] = {};
      const title = s(input.title);
      if (title) patch.title = title;
      if (input.clear_due_date === true) {
        patch.dueDate = null;
        patch.dueTime = null;
      } else if (s(input.due_date)) patch.dueDate = s(input.due_date);
      if (input.clear_due_time === true) patch.dueTime = null;
      else if (s(input.due_time)) patch.dueTime = s(input.due_time);
      const pri = b(input.is_priority);
      if (pri !== null) patch.isPriority = pri;
      const notes = s(input.notes);
      if (notes !== null) patch.notes = notes;
      if (Object.keys(patch).length === 0) return fail('Nothing to change.');
      return stage(env, { op: 'update_task', taskId, patch });
    }

    case 'complete_task':
    case 'delete_task': {
      const taskId = s(input.task_id);
      if (!taskId) return fail('task_id is required.');
      return stage(env, { op: name, taskId });
    }

    case 'schedule_block': {
      const kind = input.kind === 'exercise' || input.kind === 'focus' || input.kind === 'personal' ? input.kind : 'personal';
      return stage(env, {
        op: 'add_block',
        block: { title: s(input.title) ?? '', kind, date: s(input.date) ?? '', start: s(input.start) ?? '', end: s(input.end) ?? '' },
      });
    }

    case 'move_block':
      return stage(env, { op: 'move_block', blockId: s(input.block_id) ?? '', date: s(input.date) ?? '', start: s(input.start) ?? '', end: s(input.end) ?? '' });

    case 'remove_block':
      return stage(env, { op: 'remove_block', blockId: s(input.block_id) ?? '' });

    case 'set_message_windows': {
      const raw = Array.isArray(input.windows) ? (input.windows as Input[]) : [];
      const windows = raw.map((w) => ({ start: s(w.start) ?? '', durationMinutes: n(w.minutes) ?? 30 })).sort((a, z) => (a.start < z.start ? -1 : 1));
      return stage(env, { op: 'set_communication_windows', windows });
    }

    case 'update_settings': {
      const patch: Extract<Change, { op: 'update_settings' }>['patch'] = {};
      if (input.clear_wind_down === true) patch.windDownTime = null;
      else if (s(input.wind_down_time)) patch.windDownTime = s(input.wind_down_time);
      const w = b(input.notify_message_windows);
      if (w !== null) patch.notifyCommunicationWindows = w;
      const bl = b(input.notify_blocks);
      if (bl !== null) patch.notifyTimeBlocks = bl;
      const h = b(input.hold_messages_outside_windows);
      if (h !== null) patch.holdMessagesOutsideWindows = h;
      if (Object.keys(patch).length === 0) return fail('Nothing to change.');
      return stage(env, { op: 'update_settings', patch });
    }

    case 'start_focus':
      return stage(env, { op: 'start_focus', minutes: Math.round(n(input.minutes) ?? 25), intention: s(input.intention) ?? '' });

    default:
      return fail(`Unknown tool ${name}.`);
  }
}
