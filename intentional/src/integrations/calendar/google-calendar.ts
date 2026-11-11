import { BackendError, callFunction } from '@/backend/supabase';
import type { CalendarEvent } from '@/domain/calendar';
import { atTime, type LocalDate } from '@/domain/dates';

import { IntegrationNotAuthorizedError } from '../types';
import type { CalendarProvider } from './calendar-provider';

/** What the `google` Edge Function returns: only the fields planning needs. */
export interface RemoteEvent {
  id: string;
  title: string;
  allDay: boolean;
  start?: string;
  end?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  free: boolean;
}

/** All-day dates are converted to the device's local midnight. */
export function fromRemoteEvents(events: RemoteEvent[]): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  for (const e of events) {
    const start = e.allDay && e.startDate ? atTime(e.startDate, '00:00').toISOString() : e.start;
    const end = e.allDay && e.endDate ? atTime(e.endDate, '00:00').toISOString() : e.end;
    if (!start || !end) continue;
    out.push({
      id: `google:${e.id}`,
      title: e.title,
      start,
      end,
      allDay: e.allDay || undefined,
      location: e.location,
      showAsFree: e.free || undefined,
      isMock: false,
    });
  }
  return out;
}

/** Read-only Google Calendar via the backend. Writes are not offered in this milestone. */
export function createGoogleCalendarProvider(onReconnectNeeded: () => void): CalendarProvider {
  return {
    info: () => ({ id: 'google_calendar', displayName: 'Google Calendar', status: 'connected', isMock: false }),
    async listEvents(from: LocalDate, toExclusive: LocalDate) {
      try {
        const r = await callFunction<{ events: RemoteEvent[] }>('google', {
          action: 'events',
          timeMin: atTime(from, '00:00').toISOString(),
          timeMax: atTime(toExclusive, '00:00').toISOString(),
        });
        return fromRemoteEvents(r.events);
      } catch (e) {
        if (e instanceof BackendError && e.code === 'reconnect_required') onReconnectNeeded();
        throw e;
      }
    },
    createEvent: async () => {
      throw new IntegrationNotAuthorizedError('google_calendar');
    },
  };
}
