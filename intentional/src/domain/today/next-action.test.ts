import type { CalendarEvent } from '../calendar';
import type { Task } from '../tasks/task';
import { nextSuggestedAction, type NextActionInput } from './next-action';

const NOW = new Date(2026, 10, 9, 10, 0);
const event = (h: number, m: number, title = 'Meeting'): CalendarEvent => ({
  id: title,
  title,
  start: new Date(2026, 10, 9, h, m).toISOString(),
  end: new Date(2026, 10, 9, h + 1, m).toISOString(),
  isMock: true,
});
const task = { id: 'p1', title: 'Write proposal' } as Task;

const base: NextActionInput = {
  now: NOW,
  events: [],
  priorities: [],
  needsReplyCount: 0,
  window: { open: false, nextOpensAt: null },
  focusRunning: false,
  focusRemainingMinutes: 0,
  windDownTime: '21:30',
};

describe('nextSuggestedAction', () => {
  it('protects an active focus session above all', () => {
    const a = nextSuggestedAction({ ...base, focusRunning: true, focusRemainingMinutes: 12, events: [event(10, 5)] });
    expect(a.target.screen).toBe('focus');
    expect(a.detail).toContain('12 min');
  });

  it('prepares for an imminent event', () => {
    expect(nextSuggestedAction({ ...base, events: [event(10, 10)] }).title).toBe('Get ready for Meeting');
    // Not for one an hour away.
    expect(nextSuggestedAction({ ...base, events: [event(11, 0)] }).title).not.toContain('Get ready');
  });

  it('suggests replying only while a window is open', () => {
    const open = nextSuggestedAction({ ...base, needsReplyCount: 2, window: { open: true, closesAt: new Date(2026, 10, 9, 10, 30) } });
    expect(open.target.screen).toBe('communications');
    const closed = nextSuggestedAction({ ...base, needsReplyCount: 2, priorities: [task] });
    expect(closed.target).toEqual({ screen: 'focus', taskId: 'p1' });
  });

  it('suggests putting the phone down when nothing is pressing', () => {
    expect(nextSuggestedAction(base).target.screen).toBe('none');
  });

  it('stops suggesting work after wind-down time and before 5am', () => {
    expect(nextSuggestedAction({ ...base, now: new Date(2026, 10, 9, 22), priorities: [task] }).title).toBe('Time to wind down');
    expect(nextSuggestedAction({ ...base, now: new Date(2026, 10, 9, 2), priorities: [task] }).title).toBe('Time to wind down');
    expect(nextSuggestedAction({ ...base, now: new Date(2026, 10, 9, 22), priorities: [task], windDownTime: null }).title).toBe('Write proposal');
  });
});
