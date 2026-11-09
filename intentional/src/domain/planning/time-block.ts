import type { CalendarEvent } from '../calendar';
import { atTime, type ClockTime, type LocalDate } from '../dates';

export type BlockKind = 'exercise' | 'focus' | 'personal';

/**
 * Time the user has set aside through Intentional. Until a calendar is
 * connected these live only in the app (and in local notifications).
 */
export interface TimeBlock {
  id: string;
  title: string;
  kind: BlockKind;
  date: LocalDate;
  start: ClockTime;
  end: ClockTime;
  /** The applied plan that created it, if any. */
  planId: string | null;
  createdAt: string;
}

/** Lets blocks appear alongside calendar events in agendas. */
export function blockToEvent(block: TimeBlock): CalendarEvent {
  return {
    id: `block:${block.id}`,
    title: block.title,
    start: atTime(block.date, block.start).toISOString(),
    end: atTime(block.date, block.end).toISOString(),
    isMock: false,
    origin: 'intentional',
  };
}
