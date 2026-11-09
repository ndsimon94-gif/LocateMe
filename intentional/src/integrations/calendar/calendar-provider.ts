import type { CalendarEvent } from '@/domain/calendar';
import type { LocalDate } from '@/domain/dates';

import type { IntegrationInfo } from '../types';

export interface CalendarProvider {
  info(): IntegrationInfo;
  /** Events overlapping [from, toExclusive). Read-only. */
  listEvents(from: LocalDate, toExclusive: LocalDate): Promise<CalendarEvent[]>;
  /**
   * Write operations exist on the interface so the authorisation path is
   * designed up-front. Implementations must reject unless connected AND
   * the user explicitly confirmed this specific change.
   */
  createEvent(input: { title: string; start: string; end: string }, confirmation: { confirmedByUser: true }): Promise<CalendarEvent>;
}
