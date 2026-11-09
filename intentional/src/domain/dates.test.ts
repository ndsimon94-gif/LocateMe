import {
  addDays,
  dayHeading,
  formatClock,
  isClockTime,
  isLocalDate,
  normalizeClockTime,
  relativeDayLabel,
  startOfWeek,
  toLocalDate,
  weekDates,
} from './dates';

describe('dates', () => {
  it('formats local dates without timezone drift', () => {
    expect(toLocalDate(new Date(2026, 10, 9, 23, 59))).toBe('2026-11-09');
    expect(toLocalDate(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('validates dates and times', () => {
    expect(isLocalDate('2026-02-30')).toBe(false);
    expect(isLocalDate('2026-02-28')).toBe(true);
    expect(isClockTime('24:00')).toBe(false);
    expect(isClockTime('9:05')).toBe(true);
    expect(normalizeClockTime('9:05')).toBe('09:05');
    expect(normalizeClockTime('9:5')).toBeNull();
  });

  it('starts weeks on Monday', () => {
    expect(startOfWeek('2026-11-09')).toBe('2026-11-09'); // Monday
    expect(startOfWeek('2026-11-15')).toBe('2026-11-09'); // Sunday
    expect(weekDates('2026-11-09')).toHaveLength(7);
    expect(weekDates('2026-11-09')[6]).toBe('2026-11-15');
  });

  it('formats clock times and relative labels', () => {
    expect(formatClock('00:00')).toBe('12 AM');
    expect(formatClock('12:30')).toBe('12:30 PM');
    expect(formatClock('17:00')).toBe('5 PM');
    expect(relativeDayLabel('2026-11-10', '2026-11-09')).toBe('Tomorrow');
    expect(relativeDayLabel('2026-11-12', '2026-11-09')).toBe('Thu, Nov 12');
    expect(dayHeading('2026-11-09', '2026-11-09')).toBe('Today · Mon, Nov 9');
    expect(dayHeading('2026-11-18', '2026-11-09')).toBe('Wednesday, Nov 18');
  });
});
