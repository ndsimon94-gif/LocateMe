import { executeAction } from '@/state/execute-action';

import type { AssistantContext } from './assistant';
import { mockAssistant, respondLocally } from './mock-assistant';

const ctx: AssistantContext = {
  now: new Date(2026, 10, 9, 10, 0),
  todayEventTitles: ['Team check-in'],
  priorityTitles: ['Write proposal'],
  openTaskCount: 4,
  needsReplyCount: 2,
  connectedIntegrations: new Set(),
};

describe('mock assistant', () => {
  it('is labelled as mock', async () => {
    expect((await mockAssistant.respond('hello', ctx)).provider).toBe('mock');
  });

  it('proposes a task for captured thoughts', () => {
    const r = respondLocally('remind me to water plants tonight', ctx);
    expect(r.actions).toHaveLength(1);
    expect(r.actions[0]).toMatchObject({ kind: 'create_task', draft: { title: 'Water plants', kind: 'reminder', dueDate: '2026-11-09', dueTime: '20:00', source: 'assistant' } });
  });

  it('answers "what is on today" from context', () => {
    const r = respondLocally("what's on today", ctx);
    expect(r.message).toContain('Team check-in');
    expect(r.message).toContain('Write proposal');
    expect(r.message).toContain('2 awaiting');
  });

  it('never proposes sending a message or changing the calendar directly', () => {
    for (const input of ['email Priya about the budget', 'schedule dinner friday at 7pm']) {
      const r = respondLocally(input, ctx);
      expect(r.actions.every((a) => a.kind === 'requires_authorization')).toBe(true);
      const a = r.actions[0];
      expect(a?.kind === 'requires_authorization' && a.fallback?.kind).toBe('create_task');
    }
  });
});

describe('executeAction', () => {
  const deps = () => ({
    addTask: jest.fn((draft) => ({ ok: true as const, value: { ...draft, id: '1' } })),
    startFocus: jest.fn(),
    navigate: jest.fn(),
  });

  it('refuses actions that require authorisation, even if dispatched', () => {
    const d = deps();
    const r = executeAction(
      { kind: 'requires_authorization', label: 'Send', integration: 'gmail', reason: 'Not connected.' },
      d,
    );
    expect(r.ok).toBe(false);
    expect(d.addTask).not.toHaveBeenCalled();
    expect(d.navigate).not.toHaveBeenCalled();
  });

  it('runs local actions', () => {
    const d = deps();
    executeAction({ kind: 'start_focus', label: '', minutes: 30, intention: 'x' }, d);
    expect(d.startFocus).toHaveBeenCalledWith('x', 30);
    expect(d.navigate).toHaveBeenCalledWith('/focus');
    expect(executeAction({ kind: 'create_task', label: '', draft: { title: 'a' } }, d).ok).toBe(true);
  });
});
