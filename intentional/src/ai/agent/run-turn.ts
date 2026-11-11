import type Anthropic from '@anthropic-ai/sdk';

import type { StagedChange } from '@/domain/assistant/changeset';

import { executeTool, type ToolEnv } from './execute-tool';

export type ApiMessage = Anthropic.Beta.BetaMessageParam;
type ContentBlock = Anthropic.Beta.BetaContentBlock;

export interface RelayResponse {
  content: ContentBlock[];
  stop_reason: string | null;
  model: string;
}

/** Sends the conversation to the relay and returns Claude's response. */
export type Relay = (messages: ApiMessage[]) => Promise<RelayResponse>;

export interface TurnResult {
  /** Full history including this turn: append-only, safe to send next time. */
  messages: ApiMessage[];
  text: string;
  staged: StagedChange[];
}

const MAX_ROUNDS = 8;

/**
 * One user turn: send, run any tool calls on the device, send the results,
 * repeat until Claude answers. The history is only ever appended to, and
 * Claude's content (including reasoning blocks) is sent back exactly as
 * received. On failure, the caller keeps its previous history, so a
 * half-finished turn never leaves the conversation in an invalid state.
 */
export async function runTurn(history: ApiMessage[], userContent: string, env: ToolEnv, relay: Relay): Promise<TurnResult> {
  const messages: ApiMessage[] = [...history, { role: 'user', content: [{ type: 'text', text: userContent }] }];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await relay(messages);
    // Echo Claude's content back verbatim (reasoning blocks included).
    messages.push({ role: 'assistant', content: response.content as unknown as Anthropic.Beta.BetaContentBlockParam[] });

    if (response.stop_reason === 'refusal') {
      return { messages, text: "I can't help with that one.", staged: env.staged };
    }

    const toolUses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use');
    // Any tool call must get a result, whatever the stop reason, or the next request is invalid.
    if (toolUses.length === 0) {
      const text = response.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      return { messages, text: text || (env.staged.length ? 'Here’s what I’d change.' : 'Done.'), staged: env.staged };
    }

    // All results for this round go back in one message, in order.
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const use of toolUses) {
      let outcome;
      try {
        outcome = await executeTool(use.name, (use.input ?? {}) as Record<string, unknown>, env);
      } catch (e) {
        outcome = { content: `The tool failed: ${e instanceof Error ? e.message : 'unknown error'}.`, isError: true };
      }
      results.push({ type: 'tool_result', tool_use_id: use.id, content: outcome.content, ...(outcome.isError ? { is_error: true } : {}) });
    }
    messages.push({ role: 'user', content: results });
  }

  return { messages, text: 'That took more steps than expected. Here’s what I have so far.', staged: env.staged };
}
