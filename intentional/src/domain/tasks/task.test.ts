import { todaysPriorities, priorityCandidates } from './priorities';
import { applyEdit, compareTasks, createTask, MAX_DAILY_PRIORITIES, type Task, type TaskDraft } from './task';
import { initialTaskState, taskReducer } from './task-reducer';

const TODAY = '2026-11-09';
const NOW = new Date(2026, 10, 9, 10, 0);
let seq = 0;

function make(draft: TaskDraft, existing: Task[] = []): Task {
  const r = createTask(draft, { id: `t${++seq}`, now: NOW, existing, today: TODAY });
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

describe('createTask', () => {
  it('trims and fills defaults', () => {
    const t = make({ title: '  Buy milk  ' });
    expect(t).toMatchObject({ title: 'Buy milk', notes: '', kind: 'task', dueDate: null, dueTime: null, isPriority: false, completedAt: null, source: 'manual' });
  });

  it('rejects empty titles, bad times, and a time without a day', () => {
    const ctx = { id: 'x', now: NOW, existing: [], today: TODAY };
    expect(createTask({ title: '   ' }, ctx).ok).toBe(false);
    expect(createTask({ title: 'a', dueDate: TODAY, dueTime: '25:00' }, ctx).ok).toBe(false);
    expect(createTask({ title: 'a', dueTime: '10:00' }, ctx).ok).toBe(false);
    expect(createTask({ title: 'a', dueDate: '2026-13-01' }, ctx).ok).toBe(false);
  });

  it('requires reminders to have a day', () => {
    const r = createTask({ title: 'Call', kind: 'reminder' }, { id: 'x', now: NOW, existing: [], today: TODAY });
    expect(r.ok).toBe(false);
  });

  it('assigns undated priorities to today', () => {
    expect(make({ title: 'Write', isPriority: true }).dueDate).toBe(TODAY);
  });

  it('allows at most three open priorities per day', () => {
    const existing: Task[] = [];
    for (let i = 0; i < MAX_DAILY_PRIORITIES; i++) existing.push(make({ title: `p${i}`, isPriority: true }, existing));
    const r = createTask({ title: 'fourth', isPriority: true }, { id: 'x', now: NOW, existing, today: TODAY });
    expect(r.ok).toBe(false);
    // A different day still has room.
    const tomorrow = createTask({ title: 'tomorrow', isPriority: true, dueDate: '2026-11-10' }, { id: 'y', now: NOW, existing, today: TODAY });
    expect(tomorrow.ok).toBe(true);
  });

  it('counts overdue priorities against today', () => {
    const overdue = [0, 1, 2].map((i) => make({ title: `old${i}`, isPriority: true, dueDate: '2026-11-01' }));
    const r = createTask({ title: 'new', isPriority: true }, { id: 'x', now: NOW, existing: overdue, today: TODAY });
    expect(r.ok).toBe(false);
  });
});

describe('applyEdit', () => {
  it('updates fields and timestamp, and lets a priority keep its own slot', () => {
    const existing: Task[] = [];
    for (let i = 0; i < 3; i++) existing.push(make({ title: `p${i}`, isPriority: true }, existing));
    const later = new Date(2026, 10, 9, 12);
    const r = applyEdit(existing[0]!, { title: 'Renamed' }, { now: later, existing, today: TODAY });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.title).toBe('Renamed');
      expect(r.value.isPriority).toBe(true);
      expect(r.value.updatedAt).toBe(later.toISOString());
    }
  });

  it('can clear a date and time', () => {
    const t = make({ title: 'x', dueDate: TODAY, dueTime: '09:00' });
    const r = applyEdit(t, { title: 'x', dueDate: null, dueTime: null }, { now: NOW, existing: [t], today: TODAY });
    expect(r.ok && r.value.dueDate).toBeNull();
  });
});

describe('taskReducer', () => {
  it('adds, completes, reopens, and removes tasks', () => {
    const t = make({ title: 'x' });
    let s = taskReducer(initialTaskState, { type: 'hydrate', tasks: [] });
    s = taskReducer(s, { type: 'add', task: t });
    expect(s.tasks).toHaveLength(1);

    s = taskReducer(s, { type: 'setCompleted', id: t.id, completed: true, now: NOW });
    expect(s.tasks[0]!.completedAt).toBe(NOW.toISOString());

    // Completing again keeps the original completion time.
    s = taskReducer(s, { type: 'setCompleted', id: t.id, completed: true, now: new Date(2030, 0, 1) });
    expect(s.tasks[0]!.completedAt).toBe(NOW.toISOString());

    s = taskReducer(s, { type: 'setCompleted', id: t.id, completed: false, now: NOW });
    expect(s.tasks[0]!.completedAt).toBeNull();

    s = taskReducer(s, { type: 'remove', id: t.id });
    expect(s.tasks).toHaveLength(0);
  });
});

describe('priorities', () => {
  it('lists open priorities for today including overdue ones, max three', () => {
    const a = make({ title: 'a', isPriority: true, dueDate: '2026-11-08' });
    const b = make({ title: 'b', isPriority: true }, [a]);
    const c = make({ title: 'c', isPriority: true, dueDate: '2026-11-10' });
    const done = { ...make({ title: 'd', isPriority: true }, [a, b]), completedAt: NOW.toISOString() };
    expect(todaysPriorities([a, b, c, done], TODAY).map((t) => t.title)).toEqual(['a', 'b']);
  });

  it('suggests due and unplanned tasks as candidates', () => {
    const due = make({ title: 'due', dueDate: TODAY });
    const later = make({ title: 'later', dueDate: '2026-11-20' });
    const loose = make({ title: 'loose' });
    expect(priorityCandidates([later, loose, due], TODAY).map((t) => t.title)).toEqual(['due', 'loose']);
  });

  it('sorts by date, then time, undated last', () => {
    const x = make({ title: 'x' });
    const y = make({ title: 'y', dueDate: TODAY, dueTime: '15:00' });
    const z = make({ title: 'z', dueDate: TODAY, dueTime: '08:00' });
    expect([x, y, z].sort(compareTasks).map((t) => t.title)).toEqual(['z', 'y', 'x']);
  });
});
