import { formatClock, relativeDayLabel, toLocalDate } from '@/domain/dates';
import { clampMinutes } from '@/domain/focus/focus-timer';

import type { Assistant, AssistantContext, AssistantResponse, ProposedAction } from './assistant';
import { parseIntent } from './intent-parser';
import { looksLikePlanningRequest, parsePlanningRequest } from './plan-parser';

function when(dueDate: string | null, dueTime: string | null, now: Date): string {
  if (!dueDate) return '';
  const day = relativeDayLabel(dueDate, toLocalDate(now));
  return dueTime ? ` · ${day} at ${formatClock(dueTime)}` : ` · ${day}`;
}

/** Deterministic, offline assistant for the prototype. Never calls a network. */
export function respondLocally(input: string, ctx: AssistantContext): AssistantResponse {
  const reply = (message: string, actions: ProposedAction[] = []): AssistantResponse => ({ message, actions, provider: 'mock' });

  if (looksLikePlanningRequest(input)) {
    const request = parsePlanningRequest(input, ctx.now);
    const asks: string[] = [];
    if (request.priorities) asks.push('pick priorities');
    for (const h of request.habits ?? []) asks.push(`find time for ${h.title.toLowerCase()}`);
    if (request.communicationWindows) asks.push(`set ${request.communicationWindows.perDay} message windows a day`);
    if (request.reminders?.importantEvents) asks.push('add reminders before important events');
    if (asks.length === 0) {
      return reply('I can plan priorities, exercise or other habits, message windows and reminders. Which would help?', [
        { kind: 'navigate', label: 'Open weekly plan', to: '/plan', params: { view: 'week' } },
      ]);
    }
    const last = asks.pop();
    const list = asks.length ? `${asks.join(', ')} and ${last}` : last;
    return reply(`I'll ${list}. You'll see every change before anything is applied.`, [
      { kind: 'propose_plan', label: 'Review the plan', request },
    ]);
  }

  const intent = parseIntent(input, ctx.now);

  switch (intent.type) {
    case 'empty':
      return reply('Type a thought to capture, or ask for something like "remind me to call Mum tomorrow at 6pm".');

    case 'create_task': {
      const noun = intent.kind === 'reminder' ? 'reminder' : intent.isPriority ? 'priority' : 'task';
      return reply(`I'll add this as a ${noun}.`, [
        {
          kind: 'create_task',
          label: `${intent.title}${when(intent.dueDate, intent.dueTime, ctx.now)}`,
          draft: {
            title: intent.title,
            kind: intent.kind,
            dueDate: intent.dueDate,
            dueTime: intent.dueTime,
            isPriority: intent.isPriority,
            source: 'assistant',
          },
        },
      ]);
    }

    case 'start_focus': {
      const minutes = clampMinutes(intent.minutes);
      return reply(`A ${minutes}-minute focus session${intent.intention ? ` on "${intent.intention}"` : ''}.`, [
        { kind: 'start_focus', label: `Start ${minutes} min focus`, minutes, intention: intent.intention },
      ]);
    }

    case 'show_today': {
      const parts: string[] = [];
      parts.push(
        ctx.todayEventTitles.length === 0
          ? 'No events today.'
          : `${ctx.todayEventTitles.length} ${ctx.todayEventTitles.length === 1 ? 'event' : 'events'}: ${ctx.todayEventTitles.join(', ')}.`,
      );
      parts.push(ctx.priorityTitles.length === 0 ? 'No priorities set.' : `Priorities: ${ctx.priorityTitles.join('; ')}.`);
      if (ctx.needsReplyCount > 0) parts.push(`${ctx.needsReplyCount} awaiting your reply.`);
      return reply(parts.join(' '), [{ kind: 'navigate', label: 'Open Today', to: '/' }]);
    }

    case 'plan_week':
      return reply(`You have ${ctx.openTaskCount} open ${ctx.openTaskCount === 1 ? 'task' : 'tasks'}. Here's your week.`, [
        { kind: 'navigate', label: 'Open weekly plan', to: '/plan', params: { view: 'week' } },
      ]);

    case 'open_communications':
      return reply(
        ctx.needsReplyCount > 0 ? `${ctx.needsReplyCount} ${ctx.needsReplyCount === 1 ? 'message needs' : 'messages need'} a reply.` : 'Nothing is waiting on you.',
        [{ kind: 'navigate', label: 'Open queue', to: '/communications' }],
      );

    case 'schedule_event': {
      const fallback: ProposedAction = {
        kind: 'create_task',
        label: `${intent.title}${when(intent.dueDate, intent.dueTime, ctx.now)}`,
        draft: { title: intent.title, dueDate: intent.dueDate, dueTime: intent.dueTime, source: 'assistant' },
      };
      if (!ctx.connectedIntegrations.has('google_calendar')) {
        return reply("Google Calendar isn't connected, so I can't add events. I can keep it as a task instead.", [
          {
            kind: 'requires_authorization',
            label: 'Add to calendar',
            integration: 'google_calendar',
            reason: 'Calendar is not connected.',
            fallback,
          },
        ]);
      }
      // Even when connected, changes need explicit confirmation — handled by the caller.
      return reply('Calendar changes need your confirmation.', [
        { kind: 'requires_authorization', label: 'Add to calendar', integration: 'google_calendar', reason: 'Confirm before changing your calendar.', fallback },
      ]);
    }

    case 'send_message': {
      const title = `Reply to ${intent.recipient}${intent.about ? ` about ${intent.about}` : ''}`;
      return reply(
        ctx.connectedIntegrations.has('gmail')
          ? 'I never send messages on your behalf without your review.'
          : "Gmail isn't connected, and I never send messages for you. I can remind you to write it.",
        [
          {
            kind: 'requires_authorization',
            label: `Message ${intent.recipient}`,
            integration: 'gmail',
            reason: 'Sending is not available in this prototype.',
            fallback: { kind: 'create_task', label: title, draft: { title, source: 'assistant' } },
          },
        ],
      );
    }
  }
}

export const mockAssistant: Assistant = {
  respond: async (input, ctx) => respondLocally(input, ctx),
};
