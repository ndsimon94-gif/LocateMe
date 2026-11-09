import { addDays, dayOfWeek, toLocalDate } from '@/domain/dates';
import type { HabitRequest, PartOfDay, PlanRequest } from '@/domain/planning/plan-request';

/**
 * Rule-based stand-in for the LLM: turns a planning request in plain
 * language into a `PlanRequest`. The real assistant will produce the same
 * structure via schema-constrained output.
 */

const NUMBER_WORDS: Record<string, number> = { one: 1, a: 1, an: 1, single: 1, two: 2, couple: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };

const PLANNING_CUES = [
  /\b(organi[sz]e|plan|arrange|structure)\b.*\b(day|week|priorities|schedule|time)\b/i,
  /\bbusy (day|week)\b/i,
  /\bfind (some )?time (for|to)\b/i,
  /\b\w+ windows? (each|a|per|every) day\b/i,
];

export function looksLikePlanningRequest(text: string): boolean {
  return PLANNING_CUES.some((r) => r.test(text));
}

function num(word: string | undefined): number | null {
  if (!word) return null;
  const n = Number(word);
  if (Number.isFinite(n)) return n;
  return NUMBER_WORDS[word.toLowerCase()] ?? null;
}

function partOfDay(text: string): PartOfDay {
  if (/\bmornings?\b|\bbefore work\b/i.test(text)) return 'morning';
  if (/\blunch(time)?\b|\bmidday\b/i.test(text)) return 'midday';
  if (/\bafternoons?\b/i.test(text)) return 'afternoon';
  if (/\bevenings?\b|\bafter work\b/i.test(text)) return 'evening';
  return 'any';
}

function horizon(text: string, now: Date): PlanRequest['horizon'] {
  const today = toLocalDate(now);
  if (/\btomorrow\b/i.test(text)) return { from: addDays(today, 1), days: 1 };
  if (/\btoday\b|\bmy day\b/i.test(text) && !/\bweek\b/i.test(text)) return { from: today, days: 1 };
  if (/\bnext week\b/i.test(text)) {
    const toMonday = (8 - dayOfWeek(today)) % 7 || 7;
    return { from: addDays(today, toMonday), days: 7 };
  }
  // "this week" / default: the rest of the week, or the next 7 days near the weekend.
  const left = (7 - dayOfWeek(today)) % 7 + 1; // through Sunday
  return { from: today, days: left >= 3 ? left : 7 };
}

const HABITS: { pattern: RegExp; title: string; kind: HabitRequest['kind']; minutes: number }[] = [
  { pattern: /\b(exercise|work ?out|gym|run|running|training|yoga|swim)\b/i, title: 'Exercise', kind: 'exercise', minutes: 30 },
  { pattern: /\b(walk|walks)\b/i, title: 'Walk', kind: 'exercise', minutes: 30 },
  { pattern: /\b(deep work|focus time|focused work)\b/i, title: 'Deep work', kind: 'focus', minutes: 90 },
  { pattern: /\b(read|reading)\b/i, title: 'Reading', kind: 'personal', minutes: 30 },
];

export function parsePlanningRequest(text: string, now: Date): PlanRequest {
  const request: PlanRequest = { horizon: horizon(text, now) };

  if (/\bpriorit/i.test(text)) request.priorities = { perDay: 3 };

  const habits: HabitRequest[] = [];
  for (const h of HABITS) {
    const m = h.pattern.exec(text);
    if (!m) continue;
    // Look for details in the clause around the habit.
    const clause = text.slice(Math.max(0, m.index - 40), m.index + 60);
    const minutes = num(/(\d{2,3}) ?(?:min|minutes?)/i.exec(clause)?.[1]) ?? (/\b(an?|one) hour\b/i.test(clause) ? 60 : h.minutes);
    const times = num(/\b(\w+) times\b/i.exec(clause)?.[1]);
    const frequency: HabitRequest['frequency'] = /\b(every ?day|daily|each day|every (?:morning|lunch(?:time)?|afternoon|evening|night))\b/i.test(clause)
      ? 'daily'
      : /\bweekdays?\b/i.test(clause)
        ? 'weekdays'
        : { timesPerWeek: Math.min(7, times ?? (request.horizon.days === 1 ? 1 : 3)) };
    habits.push({ title: h.title, kind: h.kind, minutes: Math.min(180, Math.max(10, minutes)), frequency, preferred: partOfDay(clause) });
  }
  if (habits.length) request.habits = habits;

  // "two windows" or "two message windows".
  const windows = /\bwindows?\b/i.test(text);
  if (windows) {
    const count = num(/\b(\w+) windows?\b/i.exec(text)?.[1]) ?? num(/\b(\w+) \w+ windows?\b/i.exec(text)?.[1]);
    const perDay = Math.min(4, Math.max(1, count ?? 2));
    const minutes = num(/windows?[^.]*?(\d{2}) ?(?:min|minutes?)/i.exec(text)?.[1]) ?? 30;
    request.communicationWindows = { perDay, minutes: Math.min(90, Math.max(10, minutes)) };
  }

  if (/\bremind\b/i.test(text)) request.reminders = { importantEvents: true };

  return request;
}
