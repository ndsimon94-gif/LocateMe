import { generateMockEvents } from '@/integrations/calendar/mock-calendar';

import type { CalendarEvent } from '../calendar';
import { atTime } from '../dates';
import { createTask, type Task, type TaskDraft } from '../tasks/task';
import { buildPlan, chooseCommunicationWindows, planDays, type PlanContext } from './plan';
import { parsePlanRequest, type PlanRequest } from './plan-request';

const NOW = new Date(2026, 10, 9, 8, 0); // Monday 08:00
const TODAY = '2026-11-09';

const make = (d: TaskDraft, id: string): Task => {
  const r = createTask(d, { id, now: NOW, existing: [], today: TODAY });
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

const ctx = (over: Partial<PlanContext> = {}): PlanContext => ({
  now: NOW,
  id: 'plan-1',
  tasks: [],
  events: generateMockEvents('2026-11-09', '2026-11-16'),
  blocks: [],
  currentWindows: [],
  planningHours: { start: '07:00', end: '21:00' },
  ...over,
});

const week = (rest: Omit<PlanRequest, 'horizon'>): PlanRequest => ({ horizon: { from: TODAY, days: 7 }, ...rest });

describe('plan request schema', () => {
  it('accepts a valid request and rejects malformed LLM output', () => {
    expect(parsePlanRequest(week({ priorities: { perDay: 3 } })).ok).toBe(true);
    expect(parsePlanRequest({ horizon: { from: 'next week', days: 7 } }).ok).toBe(false);
    expect(parsePlanRequest(week({ priorities: { perDay: 9 } })).ok).toBe(false);
    expect(parsePlanRequest({ ...week({}), habits: [{ title: 'Run', kind: 'exercise', minutes: 2, frequency: 'daily', preferred: 'any' }] }).ok).toBe(false);
  });
});

describe('planDays', () => {
  it('never plans in the past', () => {
    expect(planDays({ horizon: { from: '2026-11-07', days: 4 } }, NOW)).toEqual(['2026-11-09', '2026-11-10']);
  });
});

describe('communication windows', () => {
  it('moves a window off a recurring meeting', () => {
    const lunch: CalendarEvent[] = ['2026-11-09', '2026-11-10', '2026-11-11'].map((d, i) => ({
      id: `l${i}`,
      title: 'Standup',
      start: atTime(d, '11:30').toISOString(),
      end: atTime(d, '12:00').toISOString(),
      isMock: true,
    }));
    const w = chooseCommunicationWindows(2, 30, ['2026-11-09', '2026-11-10', '2026-11-11'], lunch, { start: 420, end: 1260 });
    expect(w.map((x) => x.start)).toEqual(['11:00', '16:30']);
  });
});

describe('buildPlan', () => {
  it('handles the full "busy week" request', () => {
    const tasks = [make({ title: 'Send invoice', dueDate: TODAY }, 'a'), make({ title: 'Book flights' }, 'b'), make({ title: 'Report', dueDate: '2026-11-11' }, 'c')];
    const plan = buildPlan(
      week({
        priorities: { perDay: 3 },
        habits: [{ title: 'Exercise', kind: 'exercise', minutes: 30, frequency: { timesPerWeek: 3 }, preferred: 'any' }],
        communicationWindows: { perDay: 2, minutes: 30 },
        reminders: { importantEvents: true },
      }),
      ctx({ tasks }),
    );

    const windows = plan.operations.find((o) => o.op === 'set_communication_windows');
    expect(windows && windows.op === 'set_communication_windows' && windows.windows.length).toBe(2);

    const blocks = plan.operations.flatMap((o) => (o.op === 'add_block' ? [o.block] : []));
    expect(blocks).toHaveLength(3);
    // Never on top of an event or a message window.
    for (const b of blocks) {
      const start = atTime(b.date, b.start).getTime();
      const end = atTime(b.date, b.end).getTime();
      for (const e of ctx().events) expect(start < new Date(e.end).getTime() && new Date(e.start).getTime() < end).toBe(false);
    }

    const priorities = plan.operations.flatMap((o) => (o.op === 'set_priority' ? [[o.taskTitle, o.date]] : []));
    expect(priorities).toEqual([
      ['Send invoice', TODAY],
      ['Book flights', TODAY],
      ['Report', '2026-11-11'],
    ]);

    // Location events (lunch at Corner Café, dentist) get "leave" reminders 30 min before.
    const reminders = plan.operations.flatMap((o) => (o.op === 'add_reminder' ? [o] : []));
    expect(reminders.map((r) => `${r.date} ${r.time}`)).toEqual(['2026-11-10 12:00', '2026-11-11 14:45', '2026-11-12 09:30']);
    expect(plan.summary).toBe('For Mon–Sun: 2 message windows a day, 3 exercise sessions, 3 priorities, 3 reminders.');
  });

  it('respects existing priorities and blocks (re-running is safe)', () => {
    const tasks = [0, 1, 2].map((i) => make({ title: `P${i}`, isPriority: true }, `p${i}`)).concat(make({ title: 'Extra' }, 'x'));
    const blocks = [{ id: 'b', title: 'Exercise', kind: 'exercise' as const, date: TODAY, start: '07:00', end: '07:30', planId: null, createdAt: '' }];
    const plan = buildPlan(
      { horizon: { from: TODAY, days: 1 }, priorities: { perDay: 3 }, habits: [{ title: 'Exercise', kind: 'exercise', minutes: 30, frequency: 'daily', preferred: 'any' }] },
      ctx({ tasks, blocks }),
    );
    expect(plan.operations).toEqual([]);
    expect(plan.summary).toBe('Nothing to change for Mon, Nov 9.');
  });

  it('honours preferred time of day, working around events with a buffer', () => {
    const evening = buildPlan(
      { horizon: { from: TODAY, days: 1 }, habits: [{ title: 'Run', kind: 'exercise', minutes: 45, frequency: 'daily', preferred: 'evening' }] },
      ctx(),
    );
    // Monday has an 18:00–19:00 walk; 45 min won't fit before it, so it goes after (+10 min buffer).
    const op = evening.operations[0];
    expect(op?.op === 'add_block' && [op.block.start, op.block.end]).toEqual(['19:15', '20:00']);
    expect(op?.reason).toBe('Free time in the evening.');
  });

  it('notes when there is no room', () => {
    const allDay: CalendarEvent = { id: 'x', title: 'Conference', start: atTime(TODAY, '06:00').toISOString(), end: atTime(TODAY, '22:00').toISOString(), isMock: true };
    const plan = buildPlan(
      { horizon: { from: TODAY, days: 1 }, habits: [{ title: 'Exercise', kind: 'exercise', minutes: 30, frequency: 'daily', preferred: 'any' }] },
      ctx({ events: [allDay] }),
    );
    expect(plan.operations).toEqual([]);
    expect(plan.notes.join(' ')).toMatch(/No free 30 minutes/);
  });
});
