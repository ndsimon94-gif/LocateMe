import { ASSISTANT_OUTPUT_SCHEMA } from '../../supabase/functions/assistant/output-schema';

import type { AssistantContext } from './assistant';
import { contextForServer, interpretModelOutput } from './interpret-output';

const ctx: AssistantContext = {
  now: new Date(2026, 10, 11, 10, 0), // Wednesday
  todayEventTitles: ['Standup'],
  priorityTitles: [],
  openTaskCount: 2,
  needsReplyCount: 1,
  connectedIntegrations: new Set(['google_calendar']),
};
const out = (action: unknown, message = 'OK.') => interpretModelOutput({ message, action }, ctx);

describe('assistant output schema', () => {
  it('meets structured-output rules: every object closed and fully required', () => {
    const visit = (node: unknown) => {
      if (Array.isArray(node)) return node.forEach(visit);
      if (typeof node !== 'object' || node === null) return;
      const n = node as Record<string, unknown>;
      if (n.type === 'object') {
        expect(n.additionalProperties).toBe(false);
        expect([...(n.required as string[])].sort()).toEqual(Object.keys(n.properties as object).sort());
      }
      Object.values(n).forEach(visit);
    };
    visit(ASSISTANT_OUTPUT_SCHEMA);
  });
});

describe('interpretModelOutput', () => {
  it('rejects malformed output so the app can fall back', () => {
    expect(interpretModelOutput(null, ctx)).toBeNull();
    expect(interpretModelOutput({ action: { type: 'none' } }, ctx)).toBeNull();
  });

  it('maps create_task, repairing bad dates/times instead of trusting them', () => {
    const r = out({ type: 'create_task', title: ' Call the dentist ', kind: 'reminder', dueDate: '2026-11-12', dueTime: '9:30', isPriority: false });
    expect(r?.provider).toBe('remote');
    expect(r?.actions[0]).toMatchObject({ kind: 'create_task', draft: { title: 'Call the dentist', kind: 'reminder', dueDate: '2026-11-12', dueTime: '09:30' } });
    const bad = out({ type: 'create_task', title: 'x', kind: 'reminder', dueDate: 'tomorrow', dueTime: '25:00', isPriority: false });
    expect(bad?.actions[0]).toMatchObject({ draft: { dueDate: '2026-11-11', dueTime: null } });
  });

  it('validates plan requests and never plans in the past', () => {
    const r = out({
      type: 'propose_plan',
      request: {
        horizon: { from: '2026-11-01', days: 5 },
        priorities: { perDay: 3 },
        habits: [{ title: 'Exercise', kind: 'exercise', minutes: 30, frequency: { timesPerWeek: 3 }, preferred: 'any' }],
        communicationWindows: { perDay: 2, minutes: 30 },
        reminders: null,
      },
    });
    const a = r?.actions[0];
    expect(a?.kind).toBe('propose_plan');
    if (a?.kind === 'propose_plan') {
      expect(a.request.horizon.from).toBe('2026-11-11');
      expect(a.request.reminders).toBeUndefined();
    }
    // Out-of-range values from the model are rejected (fallback), not clamped silently.
    expect(out({ type: 'propose_plan', request: { horizon: { from: '2026-11-11', days: 30 }, priorities: null, habits: [], communicationWindows: null, reminders: null } })).toBeNull();
  });

  it('turns external requests into authorization-required proposals with a local fallback', () => {
    const r = out({ type: 'external_request', integration: 'gmail', summary: 'Reply to Sam about Friday' });
    expect(r?.actions[0]).toMatchObject({ kind: 'requires_authorization', integration: 'gmail', fallback: { kind: 'create_task', draft: { title: 'Reply to Sam about Friday' } } });
  });

  it('ignores unknown actions and routes', () => {
    expect(out({ type: 'delete_everything' })?.actions).toEqual([]);
    expect(out({ type: 'navigate', to: '/settings/danger', view: null })?.actions).toEqual([]);
    expect(out({ type: 'navigate', to: '/plan', view: 'week' })?.actions[0]).toMatchObject({ to: '/plan', params: { view: 'week' } });
    expect(out({ type: 'start_focus', minutes: 999, intention: 'Write' })?.actions[0]).toMatchObject({ minutes: 180 });
  });
});

describe('contextForServer', () => {
  it('sends local date/time and titles only', () => {
    const c = contextForServer(ctx);
    expect(c).toMatchObject({ localDate: '2026-11-11', weekday: 'Wednesday', localTime: '10:00', connectedIntegrations: ['google_calendar'] });
    expect(Object.keys(c).sort()).toEqual(
      ['connectedIntegrations', 'localDate', 'localTime', 'needsReplyCount', 'openTaskCount', 'priorityTitles', 'timeZone', 'todayEventTitles', 'weekday'].sort(),
    );
  });
});
