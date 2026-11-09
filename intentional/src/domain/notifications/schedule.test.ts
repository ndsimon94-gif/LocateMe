import { createFakeNotifier } from '@/integrations/notifications';

import { startTimer } from '../focus/focus-timer';
import type { TimeBlock } from '../planning/time-block';
import { createTask, type Task, type TaskDraft } from '../tasks/task';
import { desiredNotifications, diffSchedule, MAX_SCHEDULED, type NotificationPreferences } from './schedule';

const NOW = new Date(2026, 10, 9, 10, 0);
const TODAY = '2026-11-09';
const prefs: NotificationPreferences = {
  communicationWindows: [{ start: '11:30', durationMinutes: 30 }],
  notifyCommunicationWindows: false,
  notifyTimeBlocks: true,
  defaultReminderTime: '09:00',
  windDownTime: '21:30',
};
const task = (d: TaskDraft, id: string): Task => {
  const r = createTask(d, { id, now: NOW, existing: [], today: TODAY });
  if (!r.ok) throw new Error(r.error);
  return r.value;
};
const block = (date: string, start: string, id = 'b1'): TimeBlock => ({ id, title: 'Exercise', kind: 'exercise', date, start, end: '23:59', planId: null, createdAt: '' });
const base = { now: NOW, tasks: [] as Task[], blocks: [] as TimeBlock[], focus: { status: 'idle' as const }, preferences: prefs };

describe('desiredNotifications', () => {
  it('schedules future open reminders only, defaulting untimed ones to the morning', () => {
    const tasks = [
      task({ title: 'Timed', kind: 'reminder', dueDate: TODAY, dueTime: '15:00' }, 'r1'),
      task({ title: 'Untimed tomorrow', kind: 'reminder', dueDate: '2026-11-10' }, 'r2'),
      task({ title: 'Untimed today (9am passed)', kind: 'reminder', dueDate: TODAY }, 'r3'),
      task({ title: 'Plain task', dueDate: TODAY, dueTime: '15:00' }, 't1'),
      { ...task({ title: 'Done', kind: 'reminder', dueDate: TODAY, dueTime: '16:00' }, 'r4'), completedAt: NOW.toISOString() },
      task({ title: 'Too far', kind: 'reminder', dueDate: '2026-11-30' }, 'r5'),
    ];
    const n = desiredNotifications({ ...base, tasks });
    expect(n.map((x) => [x.title, new Date(x.fireAt).getHours()])).toEqual([
      ['Timed', 15],
      ['Untimed tomorrow', 9],
    ]);
  });

  it('notifies when a running focus session ends, not when paused', () => {
    const running = startTimer('Write', 25, NOW.getTime());
    expect(desiredNotifications({ ...base, focus: running }).map((x) => x.kind)).toEqual(['focus_end']);
    expect(desiredNotifications({ ...base, focus: { ...running, status: 'paused', remainingMs: 1, pausedAt: 0 } as never })).toEqual([]);
  });

  it('respects block/window toggles and quiet hours', () => {
    const blocks = [block(TODAY, '18:00', 'a'), block(TODAY, '22:00', 'late')];
    expect(desiredNotifications({ ...base, blocks }).map((x) => x.key.split(':')[1])).toEqual(['a']);
    expect(desiredNotifications({ ...base, blocks, preferences: { ...prefs, notifyTimeBlocks: false } })).toEqual([]);
    const windows = desiredNotifications({ ...base, preferences: { ...prefs, notifyCommunicationWindows: true } });
    expect(windows).toHaveLength(7); // one a day for the week
    expect(windows[0]!.url).toBe('/communications');
  });

  it('caps the schedule below the iOS limit', () => {
    const many = Array.from({ length: 100 }, (_, i) => task({ title: `R${i}`, kind: 'reminder', dueDate: '2026-11-10', dueTime: '10:00' }, `r${i}`));
    expect(desiredNotifications({ ...base, tasks: many })).toHaveLength(MAX_SCHEDULED);
  });

  it('changes key when the time changes, so the OS copy is replaced', () => {
    const a = desiredNotifications({ ...base, tasks: [task({ title: 'x', kind: 'reminder', dueDate: TODAY, dueTime: '15:00' }, 'r')] });
    const b = desiredNotifications({ ...base, tasks: [task({ title: 'x', kind: 'reminder', dueDate: TODAY, dueTime: '16:00' }, 'r')] });
    expect(a[0]!.key).not.toBe(b[0]!.key);
  });
});

describe('diffSchedule + notifier', () => {
  it('only schedules what is missing and cancels what is stale', async () => {
    const { notifier, scheduled } = createFakeNotifier();
    const first = desiredNotifications({ ...base, tasks: [task({ title: 'a', kind: 'reminder', dueDate: TODAY, dueTime: '15:00' }, 'a')] });
    for (const n of diffSchedule(first, await notifier.scheduledKeys()).toSchedule) await notifier.schedule(n);
    expect(scheduled.size).toBe(1);

    const second = desiredNotifications({ ...base, tasks: [task({ title: 'b', kind: 'reminder', dueDate: TODAY, dueTime: '17:00' }, 'b')] });
    const d = diffSchedule(second, await notifier.scheduledKeys());
    expect(d.toCancel).toEqual([first[0]!.key]);
    expect(d.toSchedule.map((n) => n.title)).toEqual(['b']);
  });
});
