import { addDays, isClockTime, isLocalDate, normalizeClockTime, toLocalDate, weekdayName } from '@/domain/dates';
import { clampMinutes } from '@/domain/focus/focus-timer';
import { parsePlanRequest } from '@/domain/planning/plan-request';

import type { AppRoute, AssistantContext, AssistantResponse, ProposedAction } from './assistant';

/**
 * Turns the model's structured output into proposals the app can show.
 * Everything is re-validated here: anything malformed is dropped rather than
 * trusted, and external actions can only ever become "requires authorization".
 */
export function interpretModelOutput(output: unknown, ctx: AssistantContext): AssistantResponse | null {
  if (typeof output !== 'object' || output === null) return null;
  const { message, action } = output as { message?: unknown; action?: unknown };
  if (typeof message !== 'string' || !message.trim()) return null;
  const reply = (actions: ProposedAction[] = []): AssistantResponse => ({ message: message.trim().slice(0, 500), actions, provider: 'remote' });
  if (typeof action !== 'object' || action === null) return reply();
  const a = action as Record<string, unknown>;

  switch (a.type) {
    case 'none':
      return reply();

    case 'create_task': {
      const title = typeof a.title === 'string' ? a.title.trim().slice(0, 200) : '';
      if (!title) return reply();
      const kind = a.kind === 'reminder' ? 'reminder' : 'task';
      let dueDate = typeof a.dueDate === 'string' && isLocalDate(a.dueDate) ? a.dueDate : null;
      const dueTime = typeof a.dueTime === 'string' && isClockTime(a.dueTime) ? normalizeClockTime(a.dueTime) : null;
      if (kind === 'reminder' && !dueDate) dueDate = toLocalDate(ctx.now);
      if (dueTime && !dueDate) dueDate = toLocalDate(ctx.now);
      const isPriority = a.isPriority === true;
      return reply([
        {
          kind: 'create_task',
          label: title,
          draft: { title, kind, dueDate, dueTime, isPriority, source: 'assistant' },
        },
      ]);
    }

    case 'start_focus': {
      const minutes = clampMinutes(typeof a.minutes === 'number' ? a.minutes : 25);
      const intention = typeof a.intention === 'string' ? a.intention.trim().slice(0, 200) : '';
      return reply([{ kind: 'start_focus', label: `Start ${minutes} min focus`, minutes, intention }]);
    }

    case 'navigate': {
      const routes: Record<string, string> = { '/': 'Open Today', '/communications': 'Open messages', '/plan': 'Open plan', '/focus': 'Open focus' };
      const to = typeof a.to === 'string' && a.to in routes ? (a.to as AppRoute) : null;
      if (!to) return reply();
      const params = to === '/plan' && (a.view === 'week' || a.view === 'day') ? { view: a.view } : undefined;
      return reply([{ kind: 'navigate', label: params?.view === 'week' ? 'Open weekly plan' : routes[to]!, to, params }]);
    }

    case 'propose_plan': {
      const raw = a.request as Record<string, unknown> | undefined;
      if (!raw) return reply();
      // Nullable fields from the model become absent; empty habit lists are dropped.
      const candidate = {
        horizon: raw.horizon,
        ...(raw.priorities ? { priorities: raw.priorities } : {}),
        ...(Array.isArray(raw.habits) && raw.habits.length ? { habits: raw.habits } : {}),
        ...(raw.communicationWindows ? { communicationWindows: raw.communicationWindows } : {}),
        ...(raw.reminders ? { reminders: raw.reminders } : {}),
      };
      const parsed = parsePlanRequest(candidate);
      if (!parsed.ok) return null; // fall back to the local planner parser
      // Never plan in the past or too far out.
      const today = toLocalDate(ctx.now);
      const request = parsed.value.horizon.from < today || parsed.value.horizon.from > addDays(today, 14) ? { ...parsed.value, horizon: { ...parsed.value.horizon, from: today } } : parsed.value;
      return reply([{ kind: 'propose_plan', label: 'Review the plan', request }]);
    }

    case 'external_request': {
      const integration = a.integration === 'gmail' ? 'gmail' : 'google_calendar';
      const summary = typeof a.summary === 'string' && a.summary.trim() ? a.summary.trim().slice(0, 200) : 'Follow up';
      return reply([
        {
          kind: 'requires_authorization',
          label: integration === 'gmail' ? 'Send a message' : 'Change your calendar',
          integration,
          reason: integration === 'gmail' ? 'Intentional never sends messages for you.' : 'Intentional can read your calendar but not change it yet.',
          fallback: { kind: 'create_task', label: summary, draft: { title: summary, source: 'assistant' } },
        },
      ]);
    }

    default:
      return reply();
  }
}

/** Context sent to the server: titles and counts only, never message bodies. */
export function contextForServer(ctx: AssistantContext) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    localDate: toLocalDate(ctx.now),
    weekday: weekdayName(ctx.now.getDay()),
    localTime: `${pad(ctx.now.getHours())}:${pad(ctx.now.getMinutes())}`,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
    todayEventTitles: ctx.todayEventTitles,
    priorityTitles: ctx.priorityTitles,
    openTaskCount: ctx.openTaskCount,
    needsReplyCount: ctx.needsReplyCount,
    connectedIntegrations: [...ctx.connectedIntegrations],
  };
}
