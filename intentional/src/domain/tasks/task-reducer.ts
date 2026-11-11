import type { Task } from './task';

export type TaskAction =
  | { type: 'hydrate'; tasks: Task[] }
  | { type: 'add'; task: Task }
  | { type: 'replace'; task: Task }
  | { type: 'setCompleted'; id: string; completed: boolean; now: Date }
  | { type: 'remove'; id: string }
  /** Puts a task back exactly as it was (used by undo). */
  | { type: 'restore'; task: Task };

export interface TaskState {
  hydrated: boolean;
  tasks: Task[];
}

export const initialTaskState: TaskState = { hydrated: false, tasks: [] };

/**
 * Pure state transitions. Validation happens before actions are dispatched
 * (see `createTask` / `applyEdit`), so the reducer can stay simple.
 */
export function taskReducer(state: TaskState, action: TaskAction): TaskState {
  switch (action.type) {
    case 'hydrate':
      return { hydrated: true, tasks: action.tasks };
    case 'add':
      return { ...state, tasks: [...state.tasks, action.task] };
    case 'replace':
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.task.id ? action.task : t)),
      };
    case 'setCompleted':
      return {
        ...state,
        tasks: state.tasks.map((t) => {
          if (t.id !== action.id) return t;
          const stamp = action.now.toISOString();
          return action.completed
            ? { ...t, completedAt: t.completedAt ?? stamp, updatedAt: stamp }
            : { ...t, completedAt: null, updatedAt: stamp };
        }),
      };
    case 'remove':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };
    case 'restore':
      return state.tasks.some((t) => t.id === action.task.id)
        ? { ...state, tasks: state.tasks.map((t) => (t.id === action.task.id ? action.task : t)) }
        : { ...state, tasks: [...state.tasks, action.task] };
  }
}
