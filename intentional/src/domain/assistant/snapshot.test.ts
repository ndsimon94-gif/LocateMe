import { createTask, type Task, type TaskDraft } from '../tasks/task';
import { buildSnapshot } from './snapshot';

const NOW = new Date(2026, 10, 11, 9, 5);
const task = (d: TaskDraft, id: string, extra: Partial<Task> = {}): Task => {
  const r = createTask(d, { id, now: NOW, existing: [], today: '2026-11-11' });
  if (!r.ok) throw new Error(r.error);
  return { ...r.value, ...extra };
};

it('gives the assistant ids, overdue marks and only relevant items', () => {
  const s = buildSnapshot({
    now: NOW,
    timeZone: 'Europe/London',
    tasks: [
      task({ title: 'Old', dueDate: '2026-11-09' }, 't1'),
      task({ title: 'Done today', dueDate: '2026-11-11' }, 't2', { completedAt: NOW.toISOString() }),
      task({ title: 'Done long ago' }, 't3', { completedAt: new Date(2026, 9, 1).toISOString() }),
      task({ title: 'Top', isPriority: true }, 't4'),
    ],
    blocks: [{ id: 'b1', title: 'Run', kind: 'exercise', date: '2026-11-12', start: '07:00', end: '07:30', planId: null, createdAt: '' }],
    events: [{ id: 'e', title: 'Dentist', start: new Date(2026, 10, 12, 10).toISOString(), end: new Date(2026, 10, 12, 11).toISOString(), location: 'Clinic', isMock: false }],
    calendarSource: 'google',
    windows: [{ start: '11:30', durationMinutes: 30 }],
    settings: { windDownTime: '21:30', planningHours: { start: '07:00', end: '21:00' }, notifyCommunicationWindows: true, notifyTimeBlocks: true },
    focus: { status: 'idle' },
  });
  expect(s).toContain('Now: Wednesday 2026-11-11 09:05 (Europe/London)');
  expect(s).toContain('[t1] Old due 2026-11-09 OVERDUE');
  expect(s).toContain('[t2] Done today due 2026-11-11 DONE today');
  expect(s).not.toContain('Done long ago');
  expect(s).toContain('PRIORITY');
  expect(s).toContain('[b1] 2026-11-12 07:00-07:30 Run (exercise)');
  expect(s).toContain('2026-11-12 10:00-11:00 Dentist @ Clinic');
  expect(s).toContain('Google Calendar (read-only)');
});
