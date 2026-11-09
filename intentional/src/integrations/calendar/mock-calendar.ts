import type { CalendarEvent } from '@/domain/calendar';
import { addDays, atTime, dayOfWeek, type LocalDate } from '@/domain/dates';

import { IntegrationNotAuthorizedError } from '../types';
import type { CalendarProvider } from './calendar-provider';

/** [weekday (0=Sun), start, end, title, location?] */
type Template = [number[], string, string, string, string?];

const TEMPLATES: Template[] = [
  [[1, 2, 3, 4, 5], '09:30', '09:45', 'Team check-in'],
  [[2], '12:30', '13:30', 'Lunch with Sam', 'Corner Café'],
  [[3], '15:00', '16:00', 'Project review'],
  [[4], '10:00', '11:00', 'Dentist', 'Elm Street Clinic'],
  [[1, 3], '18:00', '19:00', 'Evening walk'],
  [[5], '16:00', '16:30', 'Week wrap-up'],
  [[6], '10:00', '12:00', "Farmers' market"],
  [[0], '17:00', '18:30', 'Family dinner'],
];

/**
 * Generates a predictable sample calendar relative to the requested dates,
 * so the prototype always has a realistic-looking day. Every event is
 * flagged `isMock` and the UI labels it as sample data.
 */
export function generateMockEvents(from: LocalDate, toExclusive: LocalDate): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (let d = from; d < toExclusive; d = addDays(d, 1)) {
    const wd = dayOfWeek(d);
    TEMPLATES.forEach(([days, start, end, title, location], i) => {
      if (!days.includes(wd)) return;
      events.push({
        id: `mock-${d}-${i}`,
        title,
        start: atTime(d, start).toISOString(),
        end: atTime(d, end).toISOString(),
        location,
        isMock: true,
      });
    });
  }
  return events;
}

export const mockCalendarProvider: CalendarProvider = {
  info: () => ({ id: 'google_calendar', displayName: 'Google Calendar', status: 'not_connected', isMock: true }),
  listEvents: async (from, to) => generateMockEvents(from, to),
  createEvent: async () => {
    throw new IntegrationNotAuthorizedError('google_calendar');
  },
};
