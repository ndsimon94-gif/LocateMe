import type { AppRoute, ProposedAction } from '@/ai/assistant';
import type { Result } from '@/domain/result';
import type { Task, TaskDraft } from '@/domain/tasks/task';

export interface ActionDeps {
  addTask(draft: TaskDraft): Result<Task>;
  startFocus(intention: string, minutes: number): void;
  navigate(to: AppRoute, params?: Record<string, string>): void;
}

export type ActionOutcome = { ok: true; message: string } | { ok: false; message: string };

/**
 * Executes an assistant proposal after the user confirmed it. Only local
 * actions can run; anything needing an external integration is refused
 * here as a second line of defence, regardless of what the assistant said.
 */
export function executeAction(action: ProposedAction, deps: ActionDeps): ActionOutcome {
  switch (action.kind) {
    case 'create_task': {
      const r = deps.addTask(action.draft);
      return r.ok ? { ok: true, message: `Added "${r.value.title}".` } : { ok: false, message: r.error };
    }
    case 'start_focus':
      deps.startFocus(action.intention, action.minutes);
      deps.navigate('/focus');
      return { ok: true, message: 'Focus session started.' };
    case 'navigate':
      deps.navigate(action.to, action.params);
      return { ok: true, message: '' };
    case 'requires_authorization':
      return { ok: false, message: `${action.reason} Nothing was sent or changed.` };
  }
}
