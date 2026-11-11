import { ASSISTANT_TOOLS } from '../../../supabase/functions/assistant/tools.ts';
import { generateMockEvents } from '@/integrations/calendar/mock-calendar';
import { createTask, type Task } from '@/domain/tasks/task';

import { composeUserContent, isResumable, newConversation } from './conversation';
import { executeTool, type ToolEnv } from './execute-tool';
import { runTurn, type ApiMessage, type RelayResponse } from './run-turn';

const NOW = new Date(2026, 10, 9, 8, 0); // Monday
const TODAY = '2026-11-09';
let n = 0;
const task = (title: string, id: string, extra = {}): Task => {
  const r = createTask({ title, ...extra }, { id, now: NOW, existing: [], today: TODAY });
  if (!r.ok) throw new Error(r.error);
  return r.value;
};
const env = (over: Partial<ToolEnv> = {}): ToolEnv => ({
  now: NOW,
  sim: { now: NOW, today: TODAY, tasks: [task('Send invoice', 't1', { dueDate: TODAY }), task('Book flights', 't2')], blocks: [], windows: [] },
  staged: [],
  planningHours: { start: '07:00', end: '21:00' },
  newId: () => `n${++n}`,
  getEvents: async (from, to) => generateMockEvents(from, to),
  ...over,
});

describe('tool definitions', () => {
  it('meet strict tool-use rules', () => {
    const visit = (node: unknown) => {
      if (Array.isArray(node)) return node.forEach(visit);
      if (typeof node !== 'object' || node === null) return;
      const o = node as Record<string, unknown>;
      if (o.type === 'object') {
        expect(o.additionalProperties).toBe(false);
        expect([...(o.required as string[])].sort()).toEqual(Object.keys(o.properties as object).sort());
      }
      Object.values(o).forEach(visit);
    };
    for (const t of ASSISTANT_TOOLS) {
      expect(t.strict).toBe(true);
      visit(t.input_schema);
    }
  });
});

describe('executeTool', () => {
  it('stages changes instead of applying them, and validates', async () => {
    const e = env();
    const ok = await executeTool('update_task', { task_id: 't2', title: null, due_date: '2026-11-10', clear_due_date: false, due_time: null, clear_due_time: false, is_priority: true, notes: null }, e);
    expect(ok.isError).toBe(false);
    expect(ok.content).toMatch(/^Staged c1 \(pending the user's approval\): Book flights/);
    expect(e.staged).toHaveLength(1);
    const bad = await executeTool('complete_task', { task_id: 'missing' }, e);
    expect(bad).toEqual({ content: 'No task with id missing.', isError: true });
    expect(e.staged).toHaveLength(1);
  });

  it('finds free time from the calendar, then sees its own staged blocks', async () => {
    const e = env();
    const free = await executeTool('find_free_time', { date: '2026-11-10', minutes: 30, part_of_day: 'morning', count: 2 }, e);
    expect(free.content).toBe('Free on 2026-11-10: 07:00-07:30, 08:00-08:30.');
    await executeTool('schedule_block', { title: 'Run', kind: 'exercise', date: '2026-11-10', start: '07:00', end: '07:30' }, e);
    const again = await executeTool('find_free_time', { date: '2026-11-10', minutes: 30, part_of_day: 'morning', count: 1 }, e);
    expect(again.content).not.toContain('07:00-07:30');
  });

  it('runs the deterministic planner for propose_plan and stages its result', async () => {
    const e = env();
    const r = await executeTool(
      'propose_plan',
      {
        request: {
          horizon: { from: TODAY, days: 7 },
          priorities: { perDay: 3 },
          habits: [{ title: 'Exercise', kind: 'exercise', minutes: 30, frequency: { timesPerWeek: 3 }, preferred: 'any' }],
          communicationWindows: { perDay: 2, minutes: 30 },
          reminders: { importantEvents: true },
        },
      },
      e,
    );
    expect(r.isError).toBe(false);
    expect(r.content).toMatch(/^Planner result: For Mon–Sun: 2 message windows a day, 3 exercise sessions, 2 priorities, 3 reminders\./);
    expect(e.staged.length).toBe(1 + 3 + 2 + 3);
  });

  it('reports invalid plan requests as errors', async () => {
    const r = await executeTool('propose_plan', { request: { horizon: { from: 'soon', days: 9 } } }, env());
    expect(r.isError).toBe(true);
  });
});

describe('runTurn', () => {
  it('loops through tool calls, echoes Claude content verbatim and only appends', async () => {
    const history: ApiMessage[] = [{ role: 'user', content: 'earlier' }, { role: 'assistant', content: [{ type: 'text', text: 'ok' }] }];
    const frozen = JSON.stringify(history);
    const responses: RelayResponse[] = [
      {
        stop_reason: 'tool_use',
        model: 'm',
        content: [
          { type: 'thinking', thinking: '', signature: 'sig' },
          { type: 'tool_use', id: 'tu1', name: 'add_task', input: { title: 'Stretch', kind: 'reminder', due_date: '2026-11-09', due_time: '16:00', is_priority: false, notes: null }, caller: { type: 'direct' } },
          { type: 'tool_use', id: 'tu2', name: 'complete_task', input: { task_id: 'nope' }, caller: { type: 'direct' } },
        ] as unknown as RelayResponse['content'],
      },
      { stop_reason: 'end_turn', model: 'm', content: [{ type: 'text', text: 'I’ve proposed a reminder.', citations: null }] as unknown as RelayResponse['content'] },
    ];
    const sent: ApiMessage[][] = [];
    const relay = async (m: ApiMessage[]) => {
      sent.push(JSON.parse(JSON.stringify(m)));
      return responses.shift()!;
    };
    const r = await runTurn(history, 'remind me to stretch at 4pm', env(), relay);

    expect(JSON.stringify(r.messages.slice(0, 2))).toBe(frozen); // prefix untouched
    expect(r.messages).toHaveLength(6);
    expect(r.messages[3]!.content).toEqual(sent[1]![3]!.content); // assistant content echoed exactly
    const results = r.messages[4]!.content as { type: string; tool_use_id: string; is_error?: boolean }[];
    expect(results.map((x) => [x.tool_use_id, x.is_error ?? false])).toEqual([
      ['tu1', false],
      ['tu2', true],
    ]);
    expect(r.text).toBe('I’ve proposed a reminder.');
    expect(r.staged.map((s) => s.label)).toEqual(['Remind you: Stretch']);
    expect(sent[1]).toHaveLength(5); // second request = history + user + assistant + tool results
  });

  it('throws on relay failure without touching the caller’s history', async () => {
    const history: ApiMessage[] = [];
    await expect(runTurn(history, 'hi', env(), async () => Promise.reject(new Error('offline')))).rejects.toThrow('offline');
    expect(history).toEqual([]);
  });
});

describe('conversation', () => {
  it('starts fresh after a long gap or when too long', () => {
    const c = newConversation(NOW);
    expect(isResumable(c, new Date(NOW.getTime() + 60_000))).toBe(true);
    expect(isResumable(c, new Date(NOW.getTime() + 7 * 3_600_000))).toBe(false);
    expect(isResumable({ ...c, apiMessages: new Array(80).fill({ role: 'user', content: 'x' }) }, NOW)).toBe(false);
  });

  it('puts fresh state and notes before the user’s words', () => {
    expect(composeUserContent('<state>s</state>', ['The user applied: X.'], 'thanks')).toBe('<state>s</state>\n\n<note>\nThe user applied: X.\n</note>\n\nthanks');
  });
});
