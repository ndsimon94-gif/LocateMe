import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { AppliedChangeset, StagedChange } from '@/domain/assistant/changeset';
import type { TimeBlock } from '@/domain/planning/time-block';
import { newId, type Task } from '@/domain/tasks/task';

import { useFocus } from './focus-store';
import { usePlans } from './plans-store';
import { usePreferences } from './preferences-store';
import { useServices } from './services';
import { useTasks } from './tasks-store';

interface ApplyResult {
  record: AppliedChangeset;
  failures: string[];
}

interface ChangesApi {
  history: AppliedChangeset[];
  /** Applies approved changes in order and records how to undo them. */
  apply(changes: StagedChange[], summary: string): ApplyResult;
  undo(id: string): void;
}

const ChangesContext = createContext<ChangesApi | null>(null);

/** The one place approved changes touch app data, so every change can be undone the same way. */
export function ChangesProvider({ children }: { children: ReactNode }) {
  const { repositories } = useServices();
  const { getTask, addTask, updateTask, setCompleted, deleteTask, restoreTask } = useTasks();
  const { blocks, upsertBlocks, removeBlocks } = usePlans();
  const { preferences, updatePreferences } = usePreferences();
  const focus = useFocus();
  const [history, setHistory] = useState<AppliedChangeset[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void repositories.appliedChangesets.load().then((h) => {
      setHistory(h);
      setHydrated(true);
    });
  }, [repositories]);
  useEffect(() => {
    if (hydrated) void repositories.appliedChangesets.save(history.slice(-20));
  }, [hydrated, history, repositories]);

  const apply = useCallback(
    (changes: StagedChange[], summary: string): ApplyResult => {
      const now = new Date().toISOString();
      const record: AppliedChangeset = {
        id: newId(),
        appliedAt: now,
        summary,
        createdTaskIds: [],
        previousTasks: [],
        createdBlockIds: [],
        previousBlocks: [],
        previousWindows: null,
        previousSettings: null,
        undone: false,
      };
      const failures: string[] = [];
      const keepTask = (t: Task) => {
        if (!record.previousTasks.some((x) => x.id === t.id)) record.previousTasks.push(t);
      };
      const keepBlock = (b: TimeBlock) => {
        if (!record.previousBlocks.some((x) => x.id === b.id)) record.previousBlocks.push(b);
      };
      let currentBlocks = blocks;

      for (const { change, label } of changes) {
        switch (change.op) {
          case 'add_task': {
            const r = addTask(change.draft);
            if (r.ok) record.createdTaskIds.push(r.value.id);
            else failures.push(`${label}: ${r.error}`);
            break;
          }
          case 'update_task': {
            const t = getTask(change.taskId);
            if (!t) {
              failures.push(`${label}: no longer exists.`);
              break;
            }
            const r = updateTask(t.id, { ...change.patch, title: change.patch.title ?? t.title });
            if (r.ok) keepTask(t);
            else failures.push(`${label}: ${r.error}`);
            break;
          }
          case 'complete_task':
          case 'delete_task': {
            const t = getTask(change.taskId);
            if (!t) {
              failures.push(`${label}: no longer exists.`);
              break;
            }
            keepTask(t);
            if (change.op === 'complete_task') setCompleted(t.id, true);
            else deleteTask(t.id);
            break;
          }
          case 'add_block': {
            const block: TimeBlock = { id: newId(), ...change.block, planId: record.id, createdAt: now };
            record.createdBlockIds.push(block.id);
            currentBlocks = [...currentBlocks, block];
            upsertBlocks([block]);
            break;
          }
          case 'move_block':
          case 'remove_block': {
            const b = currentBlocks.find((x) => x.id === change.blockId);
            if (!b) {
              failures.push(`${label}: no longer exists.`);
              break;
            }
            keepBlock(b);
            if (change.op === 'move_block') {
              const moved = { ...b, date: change.date, start: change.start, end: change.end };
              currentBlocks = currentBlocks.map((x) => (x.id === b.id ? moved : x));
              upsertBlocks([moved]);
            } else {
              currentBlocks = currentBlocks.filter((x) => x.id !== b.id);
              removeBlocks([b.id]);
            }
            break;
          }
          case 'set_communication_windows':
            record.previousWindows ??= preferences.communicationWindows;
            record.previousSettings = { ...record.previousSettings, notifyCommunicationWindows: record.previousSettings?.notifyCommunicationWindows ?? preferences.notifyCommunicationWindows };
            // Windows the user asked for get a quiet heads-up when they open.
            updatePreferences({ communicationWindows: change.windows, notifyCommunicationWindows: true });
            break;
          case 'update_settings': {
            const p = change.patch;
            const prev = { ...record.previousSettings };
            if (p.windDownTime !== undefined && prev.windDownTime === undefined) prev.windDownTime = preferences.windDownTime;
            if (p.notifyCommunicationWindows !== undefined && prev.notifyCommunicationWindows === undefined) prev.notifyCommunicationWindows = preferences.notifyCommunicationWindows;
            if (p.notifyTimeBlocks !== undefined && prev.notifyTimeBlocks === undefined) prev.notifyTimeBlocks = preferences.notifyTimeBlocks;
            if (p.holdMessagesOutsideWindows !== undefined && prev.holdMessagesOutsideWindows === undefined) prev.holdMessagesOutsideWindows = preferences.holdMessagesOutsideWindows;
            record.previousSettings = prev;
            updatePreferences(Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)));
            break;
          }
          case 'start_focus':
            if (focus.timer.status === 'running' || focus.timer.status === 'paused') failures.push(`${label}: a session is already running.`);
            else focus.start(change.intention, change.minutes);
            break;
        }
      }
      setHistory((h) => [...h, record]);
      return { record, failures };
    },
    [addTask, getTask, updateTask, setCompleted, deleteTask, blocks, upsertBlocks, removeBlocks, preferences, updatePreferences, focus],
  );

  const undo = useCallback(
    (id: string) => {
      const record = history.find((r) => r.id === id);
      if (!record || record.undone) return;
      record.createdTaskIds.forEach((t) => deleteTask(t));
      record.previousTasks.forEach((t) => restoreTask(t));
      removeBlocks(record.createdBlockIds);
      if (record.previousBlocks.length) upsertBlocks(record.previousBlocks);
      const restore: Parameters<typeof updatePreferences>[0] = {};
      if (record.previousWindows) restore.communicationWindows = record.previousWindows;
      if (record.previousSettings) Object.assign(restore, record.previousSettings);
      if (Object.keys(restore).length) updatePreferences(restore);
      setHistory((h) => h.map((r) => (r.id === id ? { ...r, undone: true } : r)));
    },
    [history, deleteTask, restoreTask, removeBlocks, upsertBlocks, updatePreferences],
  );

  const value = useMemo(() => ({ history, apply, undo }), [history, apply, undo]);
  return <ChangesContext.Provider value={value}>{children}</ChangesContext.Provider>;
}

export function useChanges(): ChangesApi {
  const ctx = useContext(ChangesContext);
  if (!ctx) throw new Error('useChanges must be used inside ChangesProvider');
  return ctx;
}
