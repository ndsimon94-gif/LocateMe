import type { CalendarEvent } from '../calendar';
import { busyIntervals, findSlot, freeIntervals, mergeIntervals } from './availability';

const ev = (day: number, sh: number, sm: number, eh: number, em: number, extra: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: `${day}-${sh}${sm}`,
  title: 'e',
  start: new Date(2026, 10, day, sh, sm).toISOString(),
  end: new Date(2026, 10, day, eh, em).toISOString(),
  isMock: true,
  ...extra,
});

describe('availability', () => {
  it('merges overlapping and touching intervals', () => {
    expect(mergeIntervals([{ start: 60, end: 120 }, { start: 100, end: 150 }, { start: 150, end: 160 }, { start: 300, end: 310 }])).toEqual([
      { start: 60, end: 160 },
      { start: 300, end: 310 },
    ]);
  });

  it('computes busy time for a day, ignoring all-day events and clipping overnight ones', () => {
    const events = [ev(9, 9, 0, 10, 0), ev(9, 0, 0, 0, 0, { allDay: true }), ev(10, 9, 0, 10, 0), { ...ev(9, 23, 0, 23, 0), end: new Date(2026, 10, 10, 1, 0).toISOString() }];
    expect(busyIntervals('2026-11-09', events)).toEqual([
      { start: 540, end: 600 },
      { start: 1380, end: 1440 },
    ]);
  });

  it('finds free time with buffers', () => {
    const free = freeIntervals({ start: 480, end: 720 }, [{ start: 540, end: 600 }], 10);
    expect(free).toEqual([
      { start: 480, end: 530 },
      { start: 610, end: 720 },
    ]);
  });

  it('prefers a slot inside the preferred range, else the closest one', () => {
    const free = [{ start: 420, end: 600 }, { start: 900, end: 1200 }];
    expect(findSlot(free, 30, { start: 1050, end: 1200 })).toEqual({ start: 1050, end: 1080 });
    // Preferred range is fully busy: nearest free slot wins.
    expect(findSlot([{ start: 420, end: 600 }], 30, { start: 1050, end: 1200 })).toEqual({ start: 570, end: 600 });
    expect(findSlot([{ start: 420, end: 440 }], 30, { start: 0, end: 1440 })).toBeNull();
  });
});
