import { atTime, clockTimeToMinutes, minutesSinceMidnight, toLocalDate, addDays, type ClockTime } from '../dates';

export type Triage = 'needs_reply' | 'review' | 'fyi';
export type Channel = 'email' | 'message';

/**
 * A message that may need the user's attention. Only metadata and a short
 * summary are kept — never full message bodies — to minimise stored data.
 */
export interface CommunicationItem {
  id: string;
  channel: Channel;
  from: string;
  subject: string;
  receivedAt: string;
  /** AI-generated summary. For mock data this is pre-written and labelled as such. */
  summary: string;
  triage: Triage;
  /** Time-sensitive items are shown even outside communication windows. */
  timeSensitive: boolean;
  /** A suggested draft. Drafts are never sent without explicit, authorised user action. */
  suggestedReply?: string;
  isMock: boolean;
}

export const TRIAGE_ORDER: Triage[] = ['needs_reply', 'review', 'fyi'];

export const TRIAGE_LABELS: Record<Triage, { title: string; hint: string }> = {
  needs_reply: { title: 'Needs a reply', hint: 'Someone is waiting on you.' },
  review: { title: 'Worth reading', hint: 'No reply needed, but relevant.' },
  fyi: { title: 'Can wait', hint: 'Skim later, or not at all.' },
};

export interface QueueSection {
  triage: Triage;
  items: CommunicationItem[];
}

export interface QueueOptions {
  handledIds: ReadonlySet<string>;
  /** When false (outside a window), only time-sensitive items are returned. */
  windowOpen: boolean;
  showAllOutsideWindow?: boolean;
}

export interface QueueView {
  sections: QueueSection[];
  /** Items hidden because the window is closed. */
  heldCount: number;
  pendingCount: number;
}

export function buildQueue(items: CommunicationItem[], opts: QueueOptions): QueueView {
  const pending = items.filter((i) => !opts.handledIds.has(i.id));
  const visibleAll = opts.windowOpen || opts.showAllOutsideWindow;
  const visible = visibleAll ? pending : pending.filter((i) => i.timeSensitive);
  const sections = TRIAGE_ORDER.map((triage) => ({
    triage,
    items: visible
      .filter((i) => i.triage === triage)
      .sort((a, b) => Number(b.timeSensitive) - Number(a.timeSensitive) || (a.receivedAt < b.receivedAt ? 1 : -1)),
  })).filter((s) => s.items.length > 0);
  return { sections, heldCount: pending.length - visible.length, pendingCount: pending.length };
}

export function needsReplyCount(items: CommunicationItem[], handledIds: ReadonlySet<string>): number {
  return items.filter((i) => i.triage === 'needs_reply' && !handledIds.has(i.id)).length;
}

/** A recurring daily period for dealing with messages. */
export interface CommunicationWindow {
  start: ClockTime;
  durationMinutes: number;
}

export type WindowStatus =
  | { open: true; closesAt: Date }
  | { open: false; nextOpensAt: Date | null };

export function windowStatus(windows: CommunicationWindow[], now: Date): WindowStatus {
  if (windows.length === 0) return { open: true, closesAt: addMinutes(now, 24 * 60) };
  const nowMin = minutesSinceMidnight(now);
  const sorted = [...windows].sort((a, b) => clockTimeToMinutes(a.start) - clockTimeToMinutes(b.start));
  for (const w of sorted) {
    const start = clockTimeToMinutes(w.start);
    if (nowMin >= start && nowMin < start + w.durationMinutes) {
      return { open: true, closesAt: addMinutes(atTime(toLocalDate(now), w.start), w.durationMinutes) };
    }
  }
  const today = toLocalDate(now);
  const laterToday = sorted.find((w) => clockTimeToMinutes(w.start) > nowMin);
  if (laterToday) return { open: false, nextOpensAt: atTime(today, laterToday.start) };
  const first = sorted[0];
  return { open: false, nextOpensAt: first ? atTime(addDays(today, 1), first.start) : null };
}

function addMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * 60_000);
}
