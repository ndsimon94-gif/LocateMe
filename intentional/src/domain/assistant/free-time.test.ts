import type { CalendarEvent } from '../calendar';
import { findFreeSlots, type FreeTimeContext } from './free-time';

const ev = (d: number, sh: number, eh: number): CalendarEvent => ({
  id: `${d}${sh}`,
  title: 'e',
  start: new Date(2026, 10, d, sh).toISOString(),
  end: new Date(2026, 10, d, eh).toISOString(),
  isMock: false,
});
const ctx = (over: Partial<FreeTimeContext> = {}): FreeTimeContext => ({
  now: new Date(2026, 10, 11, 8, 0),
  events: [ev(12, 9, 12), ev(12, 13, 17)],
  blocks: [],
  windows: [{ start: '12:15', durationMinutes: 30 }],
  planningHours: { start: '07:00', end: '21:00' },
  ...over,
});

describe('findFreeSlots', () => {
  it('avoids events, message windows and buffers', () => {
    const slots = findFreeSlots({ date: '2026-11-12', minutes: 30, partOfDay: 'any', count: 5 }, ctx());
    expect(slots[0]).toEqual({ start: '07:00', end: '07:30' });
    // 12:10-12:45 window+buffer and 12:50 event buffer leave nothing at midday.
    expect(slots.some((s) => s.start >= '12:00' && s.start < '13:00')).toBe(false);
    expect(slots.length).toBeGreaterThan(1);
  });

  it('respects part of day and never offers past time', () => {
    expect(findFreeSlots({ date: '2026-11-12', minutes: 45, partOfDay: 'evening', count: 2 }, ctx())[0]).toEqual({ start: '17:30', end: '18:15' });
    const today = findFreeSlots({ date: '2026-11-11', minutes: 30, partOfDay: 'any', count: 1 }, ctx({ events: [] }));
    expect(today[0]!.start >= '08:15').toBe(true);
    expect(findFreeSlots({ date: '2026-11-10', minutes: 30, partOfDay: 'any', count: 1 }, ctx())).toEqual([]);
  });
});
