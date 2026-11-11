import { TOOLS_VERSION } from '../../../supabase/functions/assistant/tools.ts';
import type { StagedChange } from '@/domain/assistant/changeset';

import type { ProposedAction } from '../assistant';
import type { ApiMessage } from './run-turn';

export type ChangeStatus = 'pending' | 'applied' | 'discarded' | 'undone' | 'expired';

export type ChatItem =
  | { id: string; role: 'user'; text: string }
  | {
      id: string;
      role: 'assistant';
      text: string;
      provider: 'claude' | 'on-device';
      changes?: { staged: StagedChange[]; status: ChangeStatus; appliedId?: string; failures?: string[] };
      /** On-device assistant proposals (signed out). */
      actions?: ProposedAction[];
    }
  | { id: string; role: 'error'; text: string };

export interface Conversation {
  toolsVersion: number;
  startedAt: string;
  updatedAt: string;
  /** Exactly what has been sent to and received from Claude; append-only. */
  apiMessages: ApiMessage[];
  items: ChatItem[];
  /** What the user did with earlier proposals, told to Claude with the next message. */
  pendingNotes: string[];
}

export const IDLE_RESET_MS = 6 * 60 * 60_000;
export const MAX_API_MESSAGES = 80;

export function newConversation(now: Date): Conversation {
  return { toolsVersion: TOOLS_VERSION, startedAt: now.toISOString(), updatedAt: now.toISOString(), apiMessages: [], items: [], pendingNotes: [] };
}

/** A conversation is resumed only if it's recent, compatible and not too long. */
export function isResumable(c: Conversation | null, now: Date): boolean {
  if (!c) return false;
  if (c.toolsVersion !== TOOLS_VERSION) return false;
  if (now.getTime() - new Date(c.updatedAt).getTime() > IDLE_RESET_MS) return false;
  return c.apiMessages.length < MAX_API_MESSAGES;
}

/** The text of the next user message: fresh state, any notes, then what they typed. */
export function composeUserContent(snapshot: string, notes: string[], text: string): string {
  return [snapshot, notes.length ? `<note>\n${notes.join('\n')}\n</note>` : null, text].filter(Boolean).join('\n\n');
}

export function noteForApplied(applied: StagedChange[], skipped: StagedChange[]): string {
  const parts = [`The user applied: ${applied.map((c) => c.label).join('; ')}.`];
  if (skipped.length) parts.push(`They left out: ${skipped.map((c) => c.label).join('; ')}.`);
  return parts.join(' ');
}
