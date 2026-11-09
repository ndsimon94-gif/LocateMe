import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';

import { toLocalDate } from '@/domain/dates';
import type { Result } from '@/domain/result';
import { applyEdit, createTask, newId, type Task, type TaskDraft } from '@/domain/tasks/task';
import { initialTaskState, taskReducer } from '@/domain/tasks/task-reducer';

import { useServices } from './services';

interface TasksApi {
  hydrated: boolean;
  tasks: Task[];
  getTask(id: string): Task | undefined;
  addTask(draft: TaskDraft): Result<Task>;
  updateTask(id: string, draft: TaskDraft): Result<Task>;
  setCompleted(id: string, completed: boolean): void;
  deleteTask(id: string): void;
}

const TasksContext = createContext<TasksApi | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const { repositories } = useServices();
  const [state, dispatch] = useReducer(taskReducer, initialTaskState);
  // Read the latest tasks synchronously inside callbacks for validation.
  const tasksRef = useRef(state.tasks);
  useEffect(() => {
    tasksRef.current = state.tasks;
  }, [state.tasks]);

  useEffect(() => {
    let cancelled = false;
    repositories.tasks.load().then((tasks) => {
      if (!cancelled) dispatch({ type: 'hydrate', tasks });
    });
    return () => {
      cancelled = true;
    };
  }, [repositories]);

  useEffect(() => {
    if (state.hydrated) void repositories.tasks.save(state.tasks);
  }, [state, repositories]);

  const addTask = useCallback((draft: TaskDraft) => {
    const now = new Date();
    const result = createTask(draft, { id: newId(now), now, existing: tasksRef.current, today: toLocalDate(now) });
    if (result.ok) {
      tasksRef.current = [...tasksRef.current, result.value];
      dispatch({ type: 'add', task: result.value });
    }
    return result;
  }, []);

  const updateTask = useCallback((id: string, draft: TaskDraft): Result<Task> => {
    const task = tasksRef.current.find((t) => t.id === id);
    if (!task) return { ok: false, error: 'This task no longer exists.' };
    const now = new Date();
    const result = applyEdit(task, draft, { now, existing: tasksRef.current, today: toLocalDate(now) });
    if (result.ok) {
      tasksRef.current = tasksRef.current.map((t) => (t.id === id ? result.value : t));
      dispatch({ type: 'replace', task: result.value });
    }
    return result;
  }, []);

  const setCompleted = useCallback((id: string, completed: boolean) => {
    dispatch({ type: 'setCompleted', id, completed, now: new Date() });
  }, []);

  const deleteTask = useCallback((id: string) => dispatch({ type: 'remove', id }), []);

  const value = useMemo<TasksApi>(
    () => ({
      hydrated: state.hydrated,
      tasks: state.tasks,
      getTask: (id) => state.tasks.find((t) => t.id === id),
      addTask,
      updateTask,
      setCompleted,
      deleteTask,
    }),
    [state, addTask, updateTask, setCompleted, deleteTask],
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksApi {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used inside TasksProvider');
  return ctx;
}
