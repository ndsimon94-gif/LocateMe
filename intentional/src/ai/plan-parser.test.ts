import { parsePlanRequest } from '@/domain/planning/plan-request';

import { respondLocally } from './mock-assistant';
import { looksLikePlanningRequest, parsePlanningRequest } from './plan-parser';

const MONDAY = new Date(2026, 10, 9, 8, 0);
const SATURDAY = new Date(2026, 10, 14, 8, 0);
const NORTH_STAR =
  'I have a busy week. Organize my priorities, find time for exercise, remind me of anything important, and give me two windows each day to respond to messages.';

describe('plan parser', () => {
  it('turns the north-star request into a valid structured request', () => {
    expect(looksLikePlanningRequest(NORTH_STAR)).toBe(true);
    const r = parsePlanningRequest(NORTH_STAR, MONDAY);
    expect(r).toEqual({
      horizon: { from: '2026-11-09', days: 7 },
      priorities: { perDay: 3 },
      habits: [{ title: 'Exercise', kind: 'exercise', minutes: 30, frequency: { timesPerWeek: 3 }, preferred: 'any' }],
      communicationWindows: { perDay: 2, minutes: 30 },
      reminders: { importantEvents: true },
    });
    expect(parsePlanRequest(r).ok).toBe(true);
  });

  it('reads frequency, duration and time of day', () => {
    const r = parsePlanningRequest('Plan my week: 45 minute run every morning, and three windows a day for email', MONDAY);
    expect(r.habits?.[0]).toMatchObject({ minutes: 45, frequency: 'daily', preferred: 'morning' });
    expect(r.communicationWindows).toEqual({ perDay: 3, minutes: 30 });
  });

  it('plans the coming week when asked near the weekend', () => {
    expect(parsePlanningRequest('organize my week', SATURDAY).horizon).toEqual({ from: '2026-11-14', days: 7 });
    expect(parsePlanningRequest('plan tomorrow and find time for a walk', MONDAY).horizon).toEqual({ from: '2026-11-10', days: 1 });
  });

  it('does not mistake ordinary captures for plans', () => {
    expect(looksLikePlanningRequest('buy milk')).toBe(false);
    expect(looksLikePlanningRequest('remind me to call mum at 6pm')).toBe(false);
  });

  it('the mock assistant proposes (not applies) a plan', () => {
    const r = respondLocally(NORTH_STAR, {
      now: MONDAY,
      todayEventTitles: [],
      priorityTitles: [],
      openTaskCount: 0,
      needsReplyCount: 0,
      connectedIntegrations: new Set(),
    });
    expect(r.actions).toHaveLength(1);
    expect(r.actions[0]?.kind).toBe('propose_plan');
    expect(r.message).toContain('before anything is applied');
  });
});
