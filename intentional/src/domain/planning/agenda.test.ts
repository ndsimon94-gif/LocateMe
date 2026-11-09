import { generateMockEvents } from '@/integrations/calendar/mock-calendar';

import { createTask, type Task, type TaskDraft } from '../tasks/task';
import { agendaForDay, busiestDay, unplannedTasks, weekOverview } from './agenda';

const TODAY = '2026-11-09'; // Monday
const NOW = new Date(2026, 10, 9, 10);

const make = (d: TaskDraft, id: string): Task => {
  const r = createTask(d, { id, now: NOW, existing: [], today: TODAY });
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

describe('agendaForDay', () => {
  const tasks = [
    make({ title: 'timed', dueDate: TODAY, dueTime: '14:00' }, 't1'),
    make({ title: 'anytime', dueDate: TODAY }, 't2'),
    make({ title: 'overdue', dueDate: '2026-11-05' }, 't3'),
    make({ title: 'tomorrow', dueDate: '2026-11-10' }, 't4'),
    make({ title: 'unplanned' }, 't5'),
  ];

  it('splits tasks by time and includes overdue only for today', () => {
    const a = agendaForDay(TODAY, TODAY, tasks, []);
    expect(a.timedTasks.map((t) => t.title)).toEqual(['timed']);
    expect(a.anytimeTasks.map((t) => t.title)).toEqual(['anytime']);
    expect(a.overdueTasks.map((t) => t.title)).toEqual(['overdue']);
    expect(a.openCount).toBe(3);

    const tomorrow = agendaForDay('2026-11-10', TODAY, tasks, []);
    expect(tomorrow.overdueTasks).toEqual([]);
    expect(tomorrow.anytimeTasks.map((t) => t.title)).toEqual(['tomorrow']);
  });

  it('includes only that day’s events, sorted', () => {
    const events = generateMockEvents('2026-11-09', '2026-11-16');
    const monday = agendaForDay(TODAY, TODAY, [], events);
    expect(monday.events.map((e) => e.title)).toEqual(['Team check-in', 'Evening walk']);
    expect(monday.events.every((e) => e.isMock)).toBe(true);
  });

  it('collects unplanned tasks', () => {
    expect(unplannedTasks(tasks).map((t) => t.title)).toEqual(['unplanned']);
  });
});

describe('weekOverview', () => {
  it('covers seven days and counts events and open tasks', () => {
    const events = generateMockEvents('2026-11-09', '2026-11-16');
    const tasks = [make({ title: 'a', dueDate: '2026-11-11' }, 'a'), make({ title: 'b', dueDate: '2026-11-20' }, 'b')];
    const w = weekOverview('2026-11-09', TODAY, tasks, events);
    expect(w.days.map((d) => d.date)).toEqual(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15']);
    expect(w.eventCount).toBe(events.length);
    expect(w.openTaskCount).toBe(1);
  });

  it('only flags a busiest day when it is genuinely full', () => {
    const quiet = weekOverview('2026-11-09', TODAY, [], []);
    expect(busiestDay(quiet)).toBeNull();
    const many = Array.from({ length: 6 }, (_, i) => make({ title: `t${i}`, dueDate: '2026-11-12' }, `t${i}`));
    expect(busiestDay(weekOverview('2026-11-09', TODAY, many, []))?.date).toBe('2026-11-12');
  });
});
