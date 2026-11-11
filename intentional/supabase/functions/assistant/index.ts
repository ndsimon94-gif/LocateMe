// The Intentional assistant: turns one request into a short reply plus at most
// one proposed action, as structured JSON. It never acts; the app validates the
// output and the user confirms anything that changes their data.

import Anthropic from 'npm:@anthropic-ai/sdk@1.6.0';

import { getUser } from '../_shared/auth.ts';
import { corsHeaders, json } from '../_shared/http.ts';
import { ASSISTANT_OUTPUT_SCHEMA } from './output-schema.ts';

const MODEL = Deno.env.get('CLAUDE_MODEL') ?? 'claude-opus-5-5';
const MAX_INPUT = 1000;

const SYSTEM_PROMPT = `You are the assistant inside Intentional, a calm app that helps people organise their day and spend less time on their phone. Each request gets one short reply (one or two plain sentences, no emoji, no exclamation marks) and at most one action. The app shows the action to the user, who confirms it; you never act yourself.

Choose the action:
- propose_plan: the user wants several things arranged over one or more days (priorities, time for exercise or other habits, message windows, reminders before important events). Fill only what they asked for; use null or [] for the rest. You describe what they want, not when: the app finds the actual times from their calendar. horizon.from is a local date (YYYY-MM-DD) and days is 1 to 7; "this week" means today through Sunday, or the next 7 days if that is fewer than 3 days. Habit minutes 10 to 180; perDay for priorities 1 to 3; message windows 1 to 4 per day, 10 to 90 minutes each. When they don't say how often for a habit during a week, use timesPerWeek 3.
- create_task: capture a single thing to do or remember. Use kind "reminder" when they say "remind me". dueDate is a local YYYY-MM-DD or null; dueTime is 24-hour HH:MM or null, and needs a dueDate. Resolve relative dates ("tomorrow", "friday") from the local date given. Keep the title short and in their words.
- start_focus: they want to focus now. minutes 1 to 180, default 25.
- navigate: they want to see their day, plan, week, messages or focus screen.
- external_request: they ask you to send a message or email, or to add or change a calendar event. You can't do that; the app will offer a reminder instead. Put a short task title in summary, e.g. "Reply to Sam about Friday".
- none: anything else, including questions you can answer from the context given. Answer briefly and steer back to their day.

Never claim to have done anything, never say a message was sent, and never invent events or tasks that are not in the context.`;

interface Context {
  localDate: string;
  weekday: string;
  localTime: string;
  timeZone: string;
  todayEventTitles: string[];
  priorityTitles: string[];
  openTaskCount: number;
  needsReplyCount: number;
  connectedIntegrations: string[];
}

function clip(list: unknown, max: number): string[] {
  return Array.isArray(list) ? list.slice(0, max).map((x) => String(x).slice(0, 120)) : [];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const user = await getUser(req);
  if (!user) return json({ error: 'unauthorized' }, 401);

  const apiKey = Deno.env.get('claudeapikey') ?? Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'assistant_not_configured' }, 503);

  let input: string;
  let ctx: Context;
  try {
    const body = await req.json();
    input = String(body.input ?? '').trim().slice(0, MAX_INPUT);
    const c = body.context ?? {};
    ctx = {
      localDate: String(c.localDate ?? ''),
      weekday: String(c.weekday ?? ''),
      localTime: String(c.localTime ?? ''),
      timeZone: String(c.timeZone ?? ''),
      todayEventTitles: clip(c.todayEventTitles, 20),
      priorityTitles: clip(c.priorityTitles, 3),
      openTaskCount: Number(c.openTaskCount) || 0,
      needsReplyCount: Number(c.needsReplyCount) || 0,
      connectedIntegrations: clip(c.connectedIntegrations, 4),
    };
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  if (!input) return json({ error: 'empty_input' }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ctx.localDate)) return json({ error: 'invalid_context' }, 400);

  const contextText = [
    `Local date: ${ctx.localDate} (${ctx.weekday}), local time ${ctx.localTime}, time zone ${ctx.timeZone || 'unknown'}.`,
    `Today's events: ${ctx.todayEventTitles.length ? ctx.todayEventTitles.join('; ') : 'none'}.`,
    `Today's priorities: ${ctx.priorityTitles.length ? ctx.priorityTitles.join('; ') : 'none set'}.`,
    `Open tasks: ${ctx.openTaskCount}. Messages waiting for a reply: ${ctx.needsReplyCount}.`,
    `Connected services: ${ctx.connectedIntegrations.length ? ctx.connectedIntegrations.join(', ') : 'none'}.`,
  ].join('\n');

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: ASSISTANT_OUTPUT_SCHEMA } },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `<context>\n${contextText}\n</context>\n\n<request>\n${input}\n</request>` }],
    });

    if (response.stop_reason === 'refusal') return json({ error: 'refused' }, 422);
    if (response.stop_reason === 'max_tokens') return json({ error: 'truncated' }, 502);
    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') return json({ error: 'no_output' }, 502);
    let output: unknown;
    try {
      output = JSON.parse(text.text);
    } catch {
      return json({ error: 'invalid_output' }, 502);
    }
    return json({ output, model: response.model });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      console.error('Claude API key rejected');
      return json({ error: 'assistant_not_configured' }, 503);
    }
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'rate_limited' }, 429);
    if (e instanceof Anthropic.APIError) {
      console.error('Claude API error', e.status, e.message);
      return json({ error: 'assistant_error' }, 502);
    }
    console.error('assistant error', e);
    return json({ error: 'server_error' }, 500);
  }
});
