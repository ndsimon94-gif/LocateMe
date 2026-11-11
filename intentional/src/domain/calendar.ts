import { toLocalDate, type LocalDate } from './dates';

/** A read-only calendar event as the app understands it, independent of provider. */
export interface CalendarEvent {
  id: string;
  title: string;
  /** ISO timestamps. */
  start: string;
  end: string;
  location?: string;
  allDay?: boolean;
  /** True for generated sample data. The UI must label these. */
  isMock: boolean;
  /** 'intentional' for time blocks created in this app; absent for calendar events. */
  origin?: 'intentional';
  /** Marked "free" in the calendar: shown, but doesn't block time for planning. */
  showAsFree?: boolean;
}

export function eventDate(event: CalendarEvent): LocalDate {
  return toLocalDate(new Date(event.start));
}

export function compareEvents(a: CalendarEvent, b: CalendarEvent): number {
  return a.start < b.start ? -1 : a.start > b.start ? 1 : 0;
}
