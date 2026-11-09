import type { CalendarEvent } from '../calendar';
import { clockTimeToMinutes, formatTimeOfDate, minutesSinceMidnight, type ClockTime } from '../dates';
import type { WindowStatus } from '../communications/communication';
import type { Task } from '../tasks/task';

export type NextActionTarget =
  | { screen: 'focus'; taskId?: string }
  | { screen: 'communications' }
  | { screen: 'plan' }
  | { screen: 'none' };

export interface NextAction {
  title: string;
  detail: string;
  cta: string | null;
  target: NextActionTarget;
}

export interface NextActionInput {
  now: Date;
  /** Today's events, any order. */
  events: CalendarEvent[];
  priorities: Task[];
  needsReplyCount: number;
  window: WindowStatus;
  focusRunning: boolean;
  focusRemainingMinutes: number;
  /** After this time the app stops suggesting work. */
  windDownTime?: ClockTime | null;
}

export const PREP_WINDOW_MINUTES = 15;
/** Wind-down lasts until 5am. */
const EARLY_MORNING_END = 5 * 60;

/**
 * Picks the single most useful next step. The ordering is deliberate:
 * protect an active focus session, respect wind-down time, then honour
 * imminent commitments,
 * then reply while the communication window is open, then priorities.
 * When nothing is pressing, the answer is to put the phone down.
 */
export function nextSuggestedAction(input: NextActionInput): NextAction {
  const { now } = input;

  if (input.focusRunning) {
    return {
      title: 'Stay with your focus session',
      detail: `${input.focusRemainingMinutes} min left. Everything else can wait.`,
      cta: 'Back to focus',
      target: { screen: 'focus' },
    };
  }

  const minutes = minutesSinceMidnight(now);
  if (input.windDownTime && (minutes >= clockTimeToMinutes(input.windDownTime) || minutes < EARLY_MORNING_END)) {
    return {
      title: 'Time to wind down',
      detail: "The day is done. Your plan will be here in the morning.",
      cta: null,
      target: { screen: 'none' },
    };
  }

  const soon = input.events
    .filter((e) => !e.allDay)
    .map((e) => ({ e, start: new Date(e.start) }))
    .filter(({ start }) => {
      const mins = (start.getTime() - now.getTime()) / 60_000;
      return mins >= 0 && mins <= PREP_WINDOW_MINUTES;
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0];
  if (soon) {
    if (soon.e.origin === 'intentional') {
      return {
        title: `Coming up: ${soon.e.title.toLowerCase()}`,
        detail: `You set aside ${formatTimeOfDate(soon.start)}–${formatTimeOfDate(new Date(soon.e.end))}. A good moment to put the phone down.`,
        cta: null,
        target: { screen: 'none' },
      };
    }
    return {
      title: `Get ready for ${soon.e.title}`,
      detail: `Starts at ${formatTimeOfDate(soon.start)}${soon.e.location ? ` · ${soon.e.location}` : ''}.`,
      cta: null,
      target: { screen: 'none' },
    };
  }

  if (input.window.open && input.needsReplyCount > 0) {
    const n = input.needsReplyCount;
    return {
      title: `Reply to ${n} ${n === 1 ? 'message' : 'messages'}`,
      detail: `Your communication window is open until ${formatTimeOfDate(input.window.closesAt)}.`,
      cta: 'Open queue',
      target: { screen: 'communications' },
    };
  }

  const top = input.priorities[0];
  if (top) {
    return {
      title: top.title,
      detail: 'Your top priority. A focused block is the fastest way through it.',
      cta: 'Start focusing',
      target: { screen: 'focus', taskId: top.id },
    };
  }

  return {
    title: 'Nothing needs you right now',
    detail: 'You can put the phone down. Your day is in order.',
    cta: null,
    target: { screen: 'none' },
  };
}
