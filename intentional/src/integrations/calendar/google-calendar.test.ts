import { busyIntervals } from '@/domain/planning/availability';

import { fromRemoteEvents } from './google-calendar';

jest.mock('@/backend/supabase', () => ({ callFunction: jest.fn(), BackendError: class extends Error {} }));

describe('fromRemoteEvents', () => {
  it('converts all-day dates to local midnight and keeps free events non-blocking', () => {
    const events = fromRemoteEvents([
      { id: 'a', title: 'Holiday', allDay: true, startDate: '2026-11-11', endDate: '2026-11-12', free: true },
      { id: 'b', title: 'Focus hold', allDay: false, start: new Date(2026, 10, 11, 9).toISOString(), end: new Date(2026, 10, 11, 10).toISOString(), free: true },
      { id: 'c', title: 'Review', allDay: false, start: new Date(2026, 10, 11, 14).toISOString(), end: new Date(2026, 10, 11, 15).toISOString(), free: false, location: 'Room 2' },
      { id: 'd', title: 'Broken', allDay: false, free: false },
    ]);
    expect(events.map((e) => e.id)).toEqual(['google:a', 'google:b', 'google:c']);
    expect(new Date(events[0]!.start).getHours()).toBe(0);
    expect(events.every((e) => !e.isMock)).toBe(true);
    expect(busyIntervals('2026-11-11', events)).toEqual([{ start: 14 * 60, end: 15 * 60 }]);
  });
});
