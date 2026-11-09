import { useEffect, useState } from 'react';

import type { CalendarEvent } from '@/domain/calendar';
import type { LocalDate } from '@/domain/dates';

import { useServices } from './services';

/** Events in [from, toExclusive) from whichever calendar provider is configured. */
export function useCalendarEvents(from: LocalDate, toExclusive: LocalDate) {
  const { calendar } = useServices();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  useEffect(() => {
    let cancelled = false;
    calendar.listEvents(from, toExclusive).then((e) => {
      if (!cancelled) setEvents(e);
    });
    return () => {
      cancelled = true;
    };
  }, [calendar, from, toExclusive]);
  return { events, integration: calendar.info() };
}
