import { dueCheckin } from './checkin';

const none = { morning: null, evening: null };
it('offers each check-in once, at the right time, never during wind-down', () => {
  expect(dueCheckin(new Date(2026, 10, 11, 8), none, '21:30')).toBe('morning');
  expect(dueCheckin(new Date(2026, 10, 11, 8), { morning: '2026-11-11', evening: null }, '21:30')).toBeNull();
  expect(dueCheckin(new Date(2026, 10, 11, 14), none, '21:30')).toBeNull();
  expect(dueCheckin(new Date(2026, 10, 11, 18), none, '21:30')).toBe('evening');
  expect(dueCheckin(new Date(2026, 10, 11, 22), none, '21:30')).toBeNull();
  expect(dueCheckin(new Date(2026, 10, 11, 3), none, '21:30')).toBeNull();
});
