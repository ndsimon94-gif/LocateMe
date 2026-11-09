import type { TaskDraft } from '@/domain/tasks/task';

/**
 * Contract between the app and any assistant implementation (mock now,
 * server-side LLM later). The assistant only *proposes* actions; the app
 * decides what to execute, and anything touching an external service must
 * pass an authorisation check first.
 */

export type AppRoute = '/' | '/communications' | '/plan' | '/focus';

export type ProposedAction =
  | { kind: 'create_task'; label: string; draft: TaskDraft }
  | { kind: 'start_focus'; label: string; minutes: number; intention: string }
  | { kind: 'navigate'; label: string; to: AppRoute; params?: Record<string, string> }
  /**
   * The request needs an integration that isn't connected or authorised.
   * `fallback` is an optional local alternative (e.g. a task to do it yourself).
   */
  | { kind: 'requires_authorization'; label: string; integration: 'google_calendar' | 'gmail'; reason: string; fallback?: ProposedAction };

export interface AssistantContext {
  now: Date;
  todayEventTitles: string[];
  priorityTitles: string[];
  openTaskCount: number;
  needsReplyCount: number;
  connectedIntegrations: ReadonlySet<'google_calendar' | 'gmail'>;
}

export interface AssistantResponse {
  message: string;
  actions: ProposedAction[];
  /** Which implementation produced this — shown in the UI so mock output is never mistaken for real AI. */
  provider: 'mock' | 'remote';
}

export interface Assistant {
  respond(input: string, context: AssistantContext): Promise<AssistantResponse>;
}
