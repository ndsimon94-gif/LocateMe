import { z } from 'zod';

/**
 * The structured request an assistant (mock now, LLM later) produces from
 * natural language. It only says *what* the user wants; the deterministic
 * planner works out *when*, using real calendar data. LLM output is parsed
 * with this schema and rejected if it doesn't match.
 */

const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const partOfDay = z.enum(['morning', 'midday', 'afternoon', 'evening', 'any']);

export const habitSchema = z.object({
  title: z.string().trim().min(1).max(60),
  kind: z.enum(['exercise', 'focus', 'personal']),
  minutes: z.number().int().min(10).max(180),
  /** 'daily', 'weekdays', or a number of sessions spread across the horizon. */
  frequency: z.union([z.literal('daily'), z.literal('weekdays'), z.object({ timesPerWeek: z.number().int().min(1).max(7) })]),
  preferred: partOfDay,
});

export const planRequestSchema = z.object({
  horizon: z.object({ from: localDate, days: z.number().int().min(1).max(7) }),
  priorities: z.object({ perDay: z.number().int().min(1).max(3) }).optional(),
  habits: z.array(habitSchema).max(4).optional(),
  communicationWindows: z
    .object({ perDay: z.number().int().min(1).max(4), minutes: z.number().int().min(10).max(90) })
    .optional(),
  reminders: z.object({ importantEvents: z.boolean() }).optional(),
});

export type PartOfDay = z.infer<typeof partOfDay>;
export type HabitRequest = z.infer<typeof habitSchema>;
export type PlanRequest = z.infer<typeof planRequestSchema>;

export function parsePlanRequest(value: unknown): { ok: true; value: PlanRequest } | { ok: false; error: string } {
  const r = planRequestSchema.safeParse(value);
  return r.success ? { ok: true, value: r.data } : { ok: false, error: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
}

/** True if the request asks for anything at all. */
export function isEmptyRequest(r: PlanRequest): boolean {
  return !r.priorities && !(r.habits && r.habits.length) && !r.communicationWindows && !r.reminders?.importantEvents;
}
