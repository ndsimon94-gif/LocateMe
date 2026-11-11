import { createTask, type Task, type TaskDraft } from '../tasks/task';
import { describeChange, planOperationToChange, simulate, stageChanges, summarizeChanges, type ChangeState } from './changeset';

const NOW = new Date(2026, 10, 11, 9, 0); // Wed
const TODAY = '2026-11-11';
let n = 0;
const id = () => `id${++n}`;
const task = (d: TaskDraft, tid: string): Task => {
  const r = createTask(d, { id: tid, now: NOW, existing: [], today: TODAY });
  if (!r.ok) throw new Error(r.error);
  return r.value;
};
const base = (tasks: Task[] = []): ChangeState => ({
  now: NOW,
  today: TODAY,
  tasks,
  blocks: [{ id: 'b1', title: 'Run', kind: 'exercise', date: TODAY, start: '07:00', end: '07:30', planId: null, createdAt: '' }],
  windows: [],
});

describe('changeset', () => {
  it('validates changes against the state as it would be after earlier changes', () => {
    const tasks = [task({ title: 'A', isPriority: true }, 'a'), task({ title: 'B', isPriority: true }, 'b'), task({ title: 'C' }, 'c'), task({ title: 'D' }, 'd')];
    const { staged, failures } = stageChanges(
      [
        { op: 'update_task', taskId: 'c', patch: { isPriority: true } },
        { op: 'update_task', taskId: 'd', patch: { isPriority: true } }, // 4th priority today
      ],
      base(tasks),
      id,
    );
    expect(staged.map((s) => s.label)).toEqual(['C']);
    expect(failures[0]).toMatch(/already have 3 priorities/);
  });

  it('rejects unknown ids, bad times and past days', () => {
    expect(simulate(base(), { op: 'complete_task', taskId: 'nope' }, id).ok).toBe(false);
    expect(simulate(base(), { op: 'move_block', blockId: 'b1', date: TODAY, start: '09:00', end: '08:00' }, id).ok).toBe(false);
    expect(simulate(base(), { op: 'add_block', block: { title: 'X', kind: 'focus', date: '2026-11-01', start: '09:00', end: '10:00' } }, id).ok).toBe(false);
    expect(simulate(base(), { op: 'set_communication_windows', windows: [{ start: '9am', durationMinutes: 30 }] }, id).ok).toBe(false);
    expect(simulate(base(), { op: 'start_focus', minutes: 500, intention: '' }, id).ok).toBe(false);
  });

  it('later changes can refer to blocks earlier changes moved', () => {
    const r = stageChanges(
      [
        { op: 'move_block', blockId: 'b1', date: '2026-11-12', start: '18:00', end: '18:30' },
        { op: 'remove_block', blockId: 'b1' },
      ],
      base(),
      id,
    );
    expect(r.failures).toEqual([]);
    expect(r.staged[1]!.detail).toBe('Tomorrow · Thu, Nov 12, 6 PM–6:30 PM');
  });

  it('describes changes in plain words', () => {
    const tasks = [task({ title: 'Report', dueDate: TODAY }, 'r')];
    expect(describeChange({ op: 'update_task', taskId: 'r', patch: { dueDate: '2026-11-13', isPriority: true } }, base(tasks))).toEqual({
      label: 'Report',
      detail: 'move to Friday, Nov 13, make it a priority',
    });
    expect(describeChange({ op: 'add_task', draft: { title: 'Call Sam', kind: 'reminder', dueDate: TODAY, dueTime: '18:00' } }, base()).label).toBe('Remind you: Call Sam');
    expect(summarizeChanges([{ op: 'add_block', block: { title: 'Run', kind: 'exercise', date: TODAY, start: '07:00', end: '07:30' } }, { op: 'set_communication_windows', windows: [] }])).toBe(
      '1 block of time, message windows',
    );
  });

  it('turns planner operations into changes', () => {
    expect(planOperationToChange({ id: 'o', op: 'set_priority', taskId: 't', taskTitle: 'T', date: TODAY, reason: '' })).toEqual({
      op: 'update_task',
      taskId: 't',
      patch: { isPriority: true, dueDate: TODAY },
    });
  });
});
