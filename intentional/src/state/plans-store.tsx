import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { addDays } from '@/domain/dates';
import { buildPlan, planDays, type AppliedPlan, type PlanProposal } from '@/domain/planning/plan';
import type { PlanRequest } from '@/domain/planning/plan-request';
import type { TimeBlock } from '@/domain/planning/time-block';
import { newId } from '@/domain/tasks/task';

import { usePreferences } from './preferences-store';
import { useServices } from './services';
import { useTasks } from './tasks-store';

interface ApplyResult {
  applied: number;
  failures: string[];
}

interface PlansApi {
  blocks: TimeBlock[];
  appliedPlans: AppliedPlan[];
  /** The proposal awaiting review, if any. */
  draft: PlanProposal | null;
  propose(request: PlanRequest): Promise<PlanProposal>;
  clearDraft(): void;
  apply(proposal: PlanProposal, selectedIds: ReadonlySet<string>): ApplyResult;
  undo(planId: string): void;
  removeBlock(id: string): void;
}

const PlansContext = createContext<PlansApi | null>(null);

export function PlansProvider({ children }: { children: ReactNode }) {
  const { repositories, calendar } = useServices();
  const { tasks, getTask, addTask, updateTask, deleteTask } = useTasks();
  const { preferences, updatePreferences } = usePreferences();
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [appliedPlans, setAppliedPlans] = useState<AppliedPlan[]>([]);
  const [draft, setDraft] = useState<PlanProposal | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    Promise.all([repositories.timeBlocks.load(), repositories.appliedPlans.load()]).then(([b, p]) => {
      setBlocks(b);
      setAppliedPlans(p);
      setHydrated(true);
    });
  }, [repositories]);

  useEffect(() => {
    if (hydrated) void repositories.timeBlocks.save(blocks);
  }, [hydrated, blocks, repositories]);
  useEffect(() => {
    // Keep the undo history short.
    if (hydrated) void repositories.appliedPlans.save(appliedPlans.slice(-10));
  }, [hydrated, appliedPlans, repositories]);

  const propose = useCallback(
    async (request: PlanRequest) => {
      const now = new Date();
      const days = planDays(request, now);
      const from = days[0] ?? request.horizon.from;
      const events = await calendar.listEvents(from, addDays(days[days.length - 1] ?? from, 1));
      const proposal = buildPlan(request, {
        now,
        id: newId(now),
        tasks,
        events,
        blocks,
        currentWindows: preferences.communicationWindows,
        planningHours: preferences.planningHours,
      });
      setDraft(proposal);
      return proposal;
    },
    [calendar, tasks, blocks, preferences.communicationWindows, preferences.planningHours],
  );

  const apply = useCallback(
    (proposal: PlanProposal, selectedIds: ReadonlySet<string>): ApplyResult => {
      const record: AppliedPlan = {
        id: proposal.id,
        appliedAt: new Date().toISOString(),
        summary: proposal.summary,
        createdTaskIds: [],
        createdBlockIds: [],
        prioritizedTaskIds: [],
        previousWindows: null,
        undone: false,
      };
      const failures: string[] = [];
      const newBlocks: TimeBlock[] = [];
      for (const op of proposal.operations) {
        if (!selectedIds.has(op.id)) continue;
        switch (op.op) {
          case 'set_communication_windows':
            record.previousWindows = preferences.communicationWindows;
            updatePreferences({ communicationWindows: op.windows, notifyCommunicationWindows: true });
            break;
          case 'add_block': {
            const id = newId();
            newBlocks.push({ id, ...op.block, planId: proposal.id, createdAt: record.appliedAt });
            record.createdBlockIds.push(id);
            break;
          }
          case 'set_priority': {
            const task = getTask(op.taskId);
            if (!task) {
              failures.push(`"${op.taskTitle}" no longer exists.`);
              break;
            }
            const r = updateTask(task.id, { title: task.title, isPriority: true, dueDate: op.date });
            if (r.ok) record.prioritizedTaskIds.push(task.id);
            else failures.push(`${op.taskTitle}: ${r.error}`);
            break;
          }
          case 'add_reminder': {
            const r = addTask({ title: op.title, kind: 'reminder', dueDate: op.date, dueTime: op.time, source: 'assistant' });
            if (r.ok) record.createdTaskIds.push(r.value.id);
            else failures.push(`${op.title}: ${r.error}`);
            break;
          }
        }
      }
      if (newBlocks.length) setBlocks((b) => [...b, ...newBlocks]);
      setAppliedPlans((p) => [...p, record]);
      setDraft(null);
      const applied = record.createdBlockIds.length + record.createdTaskIds.length + record.prioritizedTaskIds.length + (record.previousWindows ? 1 : 0);
      return { applied, failures };
    },
    [preferences.communicationWindows, updatePreferences, getTask, updateTask, addTask],
  );

  const undo = useCallback(
    (planId: string) => {
      const record = appliedPlans.find((p) => p.id === planId);
      if (!record || record.undone) return;
      record.createdTaskIds.forEach(deleteTask);
      for (const id of record.prioritizedTaskIds) {
        const t = getTask(id);
        if (t) updateTask(id, { title: t.title, isPriority: false });
      }
      if (record.previousWindows) updatePreferences({ communicationWindows: record.previousWindows });
      setBlocks((b) => b.filter((x) => x.planId !== planId));
      setAppliedPlans((p) => p.map((x) => (x.id === planId ? { ...x, undone: true } : x)));
    },
    [appliedPlans, deleteTask, getTask, updateTask, updatePreferences],
  );

  const removeBlock = useCallback((id: string) => setBlocks((b) => b.filter((x) => x.id !== id)), []);
  const clearDraft = useCallback(() => setDraft(null), []);

  const value = useMemo(
    () => ({ blocks, appliedPlans, draft, propose, clearDraft, apply, undo, removeBlock }),
    [blocks, appliedPlans, draft, propose, clearDraft, apply, undo, removeBlock],
  );
  return <PlansContext.Provider value={value}>{children}</PlansContext.Provider>;
}

export function usePlans(): PlansApi {
  const ctx = useContext(PlansContext);
  if (!ctx) throw new Error('usePlans must be used inside PlansProvider');
  return ctx;
}
