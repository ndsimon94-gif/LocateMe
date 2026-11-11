import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { addDays } from '@/domain/dates';
import { buildPlan, planDays, type PlanProposal } from '@/domain/planning/plan';
import type { PlanRequest } from '@/domain/planning/plan-request';
import type { TimeBlock } from '@/domain/planning/time-block';
import { newId } from '@/domain/tasks/task';

import { usePreferences } from './preferences-store';
import { useServices } from './services';
import { useTasks } from './tasks-store';

interface PlansApi {
  blocks: TimeBlock[];
  /** The plan proposal awaiting review (on-device assistant path), if any. */
  draft: PlanProposal | null;
  propose(request: PlanRequest): Promise<PlanProposal>;
  clearDraft(): void;
  /** Adds or replaces blocks by id. */
  upsertBlocks(blocks: TimeBlock[]): void;
  removeBlocks(ids: string[]): void;
}

const PlansContext = createContext<PlansApi | null>(null);

/** Set-aside time and plan drafts. Applying and undoing changes lives in the changes store. */
export function PlansProvider({ children }: { children: ReactNode }) {
  const { repositories, calendar } = useServices();
  const { tasks } = useTasks();
  const { preferences } = usePreferences();
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [draft, setDraft] = useState<PlanProposal | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void repositories.timeBlocks.load().then((b) => {
      setBlocks(b);
      setHydrated(true);
    });
  }, [repositories]);

  useEffect(() => {
    if (hydrated) void repositories.timeBlocks.save(blocks);
  }, [hydrated, blocks, repositories]);

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

  const upsertBlocks = useCallback((incoming: TimeBlock[]) => {
    setBlocks((current) => {
      const ids = new Set(incoming.map((b) => b.id));
      return [...current.filter((b) => !ids.has(b.id)), ...incoming];
    });
  }, []);
  const removeBlocks = useCallback((ids: string[]) => {
    const set = new Set(ids);
    setBlocks((current) => current.filter((b) => !set.has(b.id)));
  }, []);
  const clearDraft = useCallback(() => setDraft(null), []);

  const value = useMemo(
    () => ({ blocks, draft, propose, clearDraft, upsertBlocks, removeBlocks }),
    [blocks, draft, propose, clearDraft, upsertBlocks, removeBlocks],
  );
  return <PlansContext.Provider value={value}>{children}</PlansContext.Provider>;
}

export function usePlans(): PlansApi {
  const ctx = useContext(PlansContext);
  if (!ctx) throw new Error('usePlans must be used inside PlansProvider');
  return ctx;
}
