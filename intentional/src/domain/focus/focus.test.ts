import { recordFromTimer, weeklyFocusSummary, type FocusSessionRecord } from './focus-history';
import { clampMinutes, finishIfDue, focusedMs, formatCountdown, pauseTimer, remainingMs, resumeTimer, startTimer } from './focus-timer';

const MIN = 60_000;

describe('focus timer', () => {
  it('counts down from absolute time', () => {
    const t = startTimer(' Write ', 25, 0);
    expect(t).toMatchObject({ status: 'running', intention: 'Write' });
    expect(remainingMs(t, 10 * MIN)).toBe(15 * MIN);
  });

  it('pauses and resumes without losing time', () => {
    let t = startTimer('', 25, 0);
    t = pauseTimer(t, 10 * MIN);
    expect(t.status).toBe('paused');
    // Time passing while paused doesn't count.
    expect(remainingMs(t, 60 * MIN)).toBe(15 * MIN);
    t = resumeTimer(t, 60 * MIN);
    expect(remainingMs(t, 65 * MIN)).toBe(10 * MIN);
    expect(focusedMs(t, 65 * MIN)).toBe(15 * MIN);
  });

  it('finishes when due, even after a long gap (app was closed)', () => {
    const t = startTimer('x', 25, 0);
    expect(finishIfDue(t, 24 * MIN)).toBe(t);
    const done = finishIfDue(t, 5 * 60 * MIN);
    expect(done).toMatchObject({ status: 'finished', endedAt: 25 * MIN });
    expect(remainingMs(done, 5 * 60 * MIN)).toBe(0);
  });

  it('ignores invalid transitions', () => {
    const idle = { status: 'idle' as const };
    expect(pauseTimer(idle, 0)).toBe(idle);
    expect(resumeTimer(idle, 0)).toBe(idle);
  });

  it('clamps lengths and formats countdowns', () => {
    expect(clampMinutes(0)).toBe(1);
    expect(clampMinutes(999)).toBe(180);
    expect(clampMinutes(Number.NaN)).toBe(25);
    expect(formatCountdown(25 * MIN)).toBe('25:00');
    expect(formatCountdown(61_500)).toBe('1:02');
    expect(formatCountdown(90 * MIN)).toBe('1:30:00');
  });
});

describe('focus history', () => {
  it('records completed and abandoned sessions, skipping very short ones', () => {
    const t = startTimer('x', 25, 0);
    expect(recordFromTimer(t, 30_000, 'a')).toBeNull();
    expect(recordFromTimer(t, 10 * MIN, 'b')).toMatchObject({ focusedMinutes: 10, plannedMinutes: 25, completed: false });
    expect(recordFromTimer(finishIfDue(t, 30 * MIN), 30 * MIN, 'c')).toMatchObject({ focusedMinutes: 25, completed: true });
  });

  it('summarises the current week without streaks', () => {
    const rec = (day: number, minutes: number, completed = true): FocusSessionRecord => ({
      id: `${day}-${minutes}`,
      intention: '',
      plannedMinutes: minutes,
      focusedMinutes: minutes,
      startedAt: new Date(2026, 10, day, 10).toISOString(),
      endedAt: new Date(2026, 10, day, 11).toISOString(),
      completed,
    });
    const history = [rec(2, 60), rec(9, 25), rec(10, 45, false), rec(16, 30)];
    const s = weeklyFocusSummary(history, '2026-11-10');
    expect(s.weekStart).toBe('2026-11-09');
    expect(s.totalMinutes).toBe(70);
    expect(s.sessionCount).toBe(2);
    expect(s.completedCount).toBe(1);
    expect(s.minutesByDay[0]).toEqual({ date: '2026-11-09', minutes: 25 });
    expect(s.changeFromLastWeek).toBe(10);
    expect(Object.keys(s)).not.toContain('streak');
  });

  it('reports no comparison when there is no earlier data', () => {
    expect(weeklyFocusSummary([], '2026-11-10').changeFromLastWeek).toBeNull();
  });
});
