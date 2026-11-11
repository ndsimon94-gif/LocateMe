// The Intentional assistant relay. The conversation loop runs in the app,
// where the user's data lives and where every proposed change is shown for
// approval; this function only adds the fixed system prompt and tool list,
// calls Claude, and returns the raw response content (thinking blocks
// included, which the app must send back unchanged).

import Anthropic from 'npm:@anthropic-ai/sdk@1.6.0';

import { getUser } from '../_shared/auth.ts';
import { corsHeaders, json } from '../_shared/http.ts';
import { ASSISTANT_TOOLS } from './tools.ts';

const MODEL = Deno.env.get('CLAUDE_MODEL') ?? 'claude-opus-5-5';
const MAX_BODY_BYTES = 400_000;
const MAX_MESSAGES = 120;

// Byte-identical for every request in every conversation (no dates or state
// here: those arrive in the user's messages), so cached and preserved
// reasoning stay valid.
const SYSTEM_PROMPT = `You are the assistant inside Intentional, a calm personal operating system. You help one person organise their days (tasks, reminders, priorities, set-aside time, message windows, focus) so they can spend less time on their phone and more on their life.

Each user message starts with a <state> block: the current local date and time, their tasks (with ids), set-aside blocks (with ids), calendar events for the coming week, message windows, settings and focus status. Treat it as the truth; it replaces any earlier state. A <note> may say which of your earlier proposals the user applied or discarded.

How you work:
- Act through tools rather than describing what the user could do. Your changes are staged: the user sees them as a list under your reply and applies the ones they want. Never say something is done or scheduled; say what you've proposed.
- For anything spanning several days or several kinds of thing (priorities, habits like exercise, message windows, reminders before important events), call propose_plan. It works out the actual times from their calendar. For a single slot, call find_free_time first and then schedule_block. Don't calculate free time in your head.
- When asked to rework a week or a day, read the state, then make a small, coherent set of changes: move or remove blocks that no longer fit, re-prioritise, carry unfinished work forward to realistic days. Respect existing commitments and their wind-down time.
- Morning check-in ("plan my day"): look at today's events, open and overdue tasks and priorities; propose up to three priorities and, if there's room, one focus block for the most important one. Evening wrap-up ("wrap up", "end my day"): briefly note what got done, then propose moving what slipped to realistic days, and nothing else.
- Keep the user's words for titles. Use ids from the state exactly.
- You can't send messages or emails, or create or change events in their Google Calendar. If asked, say so plainly and offer a reminder instead.
- Ask a question only when you can't make a reasonable choice; otherwise choose sensibly and let them untick what they don't want.

Style: short and calm. Usually one to three sentences. No emoji, no exclamation marks, no praise, no streaks or scores, and never encourage more time in the app. If nothing needs doing, say so.`;

const allowedRoles = new Set(['user', 'assistant']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const user = await getUser(req);
  if (!user) return json({ error: 'unauthorized' }, 401);

  const apiKey = Deno.env.get('claudeapikey') ?? Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'assistant_not_configured' }, 503);

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: 'conversation_too_long' }, 413);
  let messages: Anthropic.Beta.BetaMessageParam[];
  try {
    const body = JSON.parse(raw);
    messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) throw new Error('bad messages');
    if (messages[0]?.role !== 'user' || messages.some((m) => !allowedRoles.has(m?.role))) throw new Error('bad roles');
  } catch {
    return json({ error: 'invalid_request' }, 400);
  }

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01', 'thinking-binding-controls-2026-08-01'],
      fallbacks: 'default',
      // Safety net: if a replayed reasoning block ever fails the conversation check, drop it rather than fail.
      thinking: { type: 'adaptive', block_binding: { prefix_mismatch_behavior: 'drop_block' } },
      output_config: { effort: 'medium' },
      cache_control: { type: 'ephemeral' },
      system: SYSTEM_PROMPT,
      tools: ASSISTANT_TOOLS as unknown as Anthropic.Beta.BetaToolUnion[],
      messages,
    });
    return json({ content: response.content, stop_reason: response.stop_reason, model: response.model });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      console.error('Claude API key rejected');
      return json({ error: 'assistant_not_configured' }, 503);
    }
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'rate_limited' }, 429);
    if (e instanceof Anthropic.BadRequestError) {
      console.error('Claude bad request', e.message);
      // Safe to return: describes the request shape, contains no user data or secrets.
      return json({ error: 'bad_request', detail: e.message.slice(0, 300) }, 400);
    }
    if (e instanceof Anthropic.APIError) {
      console.error('Claude API error', e.status, e.message);
      return json({ error: 'assistant_error' }, 502);
    }
    console.error('assistant error', e);
    return json({ error: 'server_error' }, 500);
  }
});
