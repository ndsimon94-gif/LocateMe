import { useEffect, useState } from 'react';

import type { CalendarEvent } from '@/domain/calendar';
import type { LocalDate } from '@/domain/dates';

import { useServices } from './services';

/** Events in [from, toExclusive) from whichever calendar provider is configured. */
export function useCalendarEvents(from: LocalDate, toExclusive: LocalDate) {
  const { calendar } = useServices();
  const [result, setResult] = useState<{ key: string; events: CalendarEvent[]; error: string | null }>({ key: '', events: [], error: null });
  const info = calendar.info();
  const key = `${info.id}:${info.isMock}:${from}:${toExclusive}`;

  useEffect(() => {
    let cancelled = false;
    calendar
      .listEvents(from, toExclusive)
      .then((events) => {
        if (!cancelled) setResult({ key, events, error: null });
      })
      .catch(() => {
        // Never substitute sample events for a real calendar that failed to load.
        if (!cancelled) setResult({ key, events: [], error: `Couldn’t load ${info.displayName} right now.` });
      });
    return () => {
      cancelled = true;
    };
  }, [calendar, from, toExclusive, key, info.displayName]);

  // Don't show the previous provider's or range's events while the new ones load.
  const current = result.key === key ? result : { events: [], error: null };
  return { events: current.events, error: current.error, integration: info };
}
