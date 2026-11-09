import { addDays, normalizeClockTime, toLocalDate, type ClockTime, type LocalDate } from '@/domain/dates';

/**
 * Rule-based natural-language parsing used by the mock assistant. It is
 * intentionally small and predictable; a server-side LLM will replace it
 * behind the same `Assistant` interface.
 */

export type Intent =
  | { type: 'create_task'; title: string; kind: 'task' | 'reminder'; dueDate: LocalDate | null; dueTime: ClockTime | null; isPriority: boolean }
  | { type: 'start_focus'; minutes: number; intention: string }
  | { type: 'show_today' }
  | { type: 'plan_week' }
  | { type: 'open_communications' }
  | { type: 'schedule_event'; title: string; dueDate: LocalDate | null; dueTime: ClockTime | null }
  | { type: 'send_message'; recipient: string; about: string }
  | { type: 'empty' };

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

interface Extracted<T> {
  value: T;
  rest: string;
}

function strip(text: string, match: RegExpExecArray): string {
  return (text.slice(0, match.index) + ' ' + text.slice(match.index + match[0].length)).replace(/\s+/g, ' ').trim();
}

export function extractDate(text: string, now: Date): Extracted<LocalDate | null> {
  const today = toLocalDate(now);
  const rel = /\b(?:on |by |for )?(today|tonight|tomorrow)\b/i.exec(text);
  if (rel) {
    const word = rel[1]!.toLowerCase();
    return { value: word === 'tomorrow' ? addDays(today, 1) : today, rest: strip(text, rel) };
  }
  const wd = /\b(?:on |by |this |next )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i.exec(text);
  if (wd) {
    const target = WEEKDAYS.indexOf(wd[1]!.toLowerCase());
    let delta = (target - now.getDay() + 7) % 7;
    if (delta === 0) delta = 7; // "monday" said on a Monday means next Monday
    if (/^next /i.test(wd[0]) && delta < 7) delta += 7;
    return { value: addDays(today, delta), rest: strip(text, wd) };
  }
  return { value: null, rest: text };
}

export function extractTime(text: string): Extracted<ClockTime | null> {
  const ampm = /\b(?:at |@ ?)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i.exec(text);
  if (ampm) {
    let h = Number(ampm[1]);
    const m = ampm[2] ?? '00';
    const pm = ampm[3]!.toLowerCase() === 'pm';
    if (h >= 1 && h <= 12 && Number(m) < 60) {
      if (pm && h !== 12) h += 12;
      if (!pm && h === 12) h = 0;
      return { value: normalizeClockTime(`${h}:${m}`), rest: strip(text, ampm) };
    }
  }
  const h24 = /\b(?:at |@ ?)(\d{1,2}:\d{2})\b/i.exec(text) ?? /\b(\d{1,2}:\d{2})\b/.exec(text);
  if (h24) {
    const t = normalizeClockTime(h24[1]!);
    if (t) return { value: t, rest: strip(text, h24) };
  }
  if (/\bnoon\b/i.test(text)) {
    const m = /\b(?:at )?noon\b/i.exec(text)!;
    return { value: '12:00', rest: strip(text, m) };
  }
  return { value: null, rest: text };
}

function cleanTitle(text: string): string {
  const t = text
    .replace(/^(?:please |can you |could you )/i, '')
    .replace(/^(?:to |that i need to |that i should |i need to |i have to |i should )/i, '')
    .replace(/[.!?]+$/, '')
    .trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function parseIntent(input: string, now: Date): Intent {
  const text = input.trim().replace(/\s+/g, ' ');
  if (!text) return { type: 'empty' };
  const lower = text.toLowerCase();

  // Focus
  const focus = /^(?:start (?:a )?)?focus(?: session)?(?: for)?(?: (\d{1,3}) ?(?:m|min|mins|minutes?))?(?: on (.+))?$/i.exec(text);
  if (focus) {
    return { type: 'start_focus', minutes: focus[1] ? Number(focus[1]) : 25, intention: focus[2] ? cleanTitle(focus[2]) : '' };
  }
  const focusHours = /^(?:start (?:a )?)?focus(?: session)?(?: for)? (\d) ?(?:h|hr|hrs|hours?)(?: on (.+))?$/i.exec(text);
  if (focusHours) {
    return { type: 'start_focus', minutes: Number(focusHours[1]) * 60, intention: focusHours[2] ? cleanTitle(focusHours[2]) : '' };
  }

  // Navigation / questions
  if (/^(?:what(?:'s| is) (?:on )?(?:my )?(?:day|today|on today)|show (?:me )?(?:my )?(?:day|today)|my day)\??$/i.test(lower)) {
    return { type: 'show_today' };
  }
  if (/\b(?:plan|review) (?:my |the )?week\b/i.test(lower)) return { type: 'plan_week' };
  if (/^(?:show |open |check )?(?:my )?(?:messages|inbox|emails?|communications)\??$/i.test(lower)) {
    return { type: 'open_communications' };
  }

  // Sending messages — always requires an authorised integration.
  const send = /^(?:send (?:an? )?(?:email|message|text) to|email|message|text|reply to|write to) ([a-z][\w'.-]*(?: [A-Z][\w'.-]*)?)(?:\s+(?:about|re|saying|that)\s+(.+))?$/i.exec(text);
  if (send) return { type: 'send_message', recipient: send[1]!, about: send[2] ?? '' };

  // Calendar changes — always requires an authorised integration.
  const schedule = /^(?:schedule|book|set up|put)(?: an?)? (.+?)(?: (?:on|in) (?:my |the )?calendar)?$/i.exec(text);
  if (schedule && !/^(?:a )?focus\b/i.test(schedule[1]!)) {
    const d = extractDate(schedule[1]!, now);
    const t = extractTime(d.rest);
    return { type: 'schedule_event', title: cleanTitle(t.rest.replace(/ (?:on|in) (?:my |the )?calendar$/i, '')), dueDate: d.value, dueTime: t.value };
  }

  // Reminders and tasks (the default: capture the thought).
  let body = text;
  let kind: 'task' | 'reminder' = 'task';
  const remind = /^remind me (?:to |that |about )?/i.exec(body);
  if (remind) {
    kind = 'reminder';
    body = body.slice(remind[0].length);
  } else {
    body = body.replace(/^(?:add (?:a )?(?:task|todo|to-do)(?: to)?:?|add|todo:?|task:?|capture:?|note:?)\s+/i, '');
  }
  let isPriority = false;
  const prio = /\s*(?:,? as (?:a |my )?(?:top )?priority|!+)$/i.exec(body);
  if (prio && prio[0].trim()) {
    isPriority = true;
    body = body.slice(0, prio.index);
  }
  const tonight = /\btonight\b/i.test(body);
  const d = extractDate(body, now);
  const t = extractTime(d.rest);
  let dueDate = d.value;
  const dueTime = t.value ?? (tonight ? '20:00' : null);
  if (t.value && !dueDate) {
    // A bare time means the next occurrence of it.
    const [hh, mm] = t.value.split(':').map(Number);
    const passed = hh! * 60 + mm! <= now.getHours() * 60 + now.getMinutes();
    dueDate = passed ? addDays(toLocalDate(now), 1) : toLocalDate(now);
  }
  if (kind === 'reminder' && !dueDate) dueDate = toLocalDate(now);
  const title = cleanTitle(t.rest);
  if (!title) return { type: 'empty' };
  return { type: 'create_task', title, kind, dueDate, dueTime, isPriority };
}
