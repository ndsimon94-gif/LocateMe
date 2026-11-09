import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { newId } from '@/domain/tasks/task';
import { recordFromTimer, type FocusSessionRecord } from '@/domain/focus/focus-history';
import {
  finishIfDue,
  idleTimer,
  pauseTimer,
  resumeTimer,
  startTimer,
  type FocusTimerState,
} from '@/domain/focus/focus-timer';

import { useServices } from './services';

interface FocusApi {
  timer: FocusTimerState;
  history: FocusSessionRecord[];
  start(intention: string, minutes: number): void;
  pause(): void;
  resume(): void;
  /** Ends the session early; time already focused is still recorded. */
  stop(): void;
  /** Clears a finished session so a new one can begin. */
  dismiss(): void;
}

const FocusContext = createContext<FocusApi | null>(null);

export function FocusProvider({ children }: { children: ReactNode }) {
  const { repositories } = useServices();
  const [timer, setTimer] = useState<FocusTimerState>(idleTimer);
  const [history, setHistory] = useState<FocusSessionRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    Promise.all([repositories.activeFocus.load(), repositories.focusHistory.load()]).then(([active, past]) => {
      setTimer(active);
      setHistory(past);
      setHydrated(true);
    });
  }, [repositories]);

  useEffect(() => {
    if (hydrated) void repositories.activeFocus.save(timer);
  }, [hydrated, timer, repositories]);

  useEffect(() => {
    if (hydrated) void repositories.focusHistory.save(history);
  }, [hydrated, history, repositories]);

  const record = useCallback((state: FocusTimerState, now: number) => {
    const entry = recordFromTimer(state, now, newId(new Date(now)));
    if (entry) setHistory((h) => [...h, entry]);
  }, []);

  // Transition to `finished` when the end time passes (including while the app was closed).
  useEffect(() => {
    if (timer.status !== 'running') return;
    const check = () => {
      const now = Date.now();
      const next = finishIfDue(timer, now);
      if (next !== timer) {
        record(next, now);
        setTimer(next);
      }
    };
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [timer, record]);

  const start = useCallback((intention: string, minutes: number) => setTimer(startTimer(intention, minutes, Date.now())), []);
  const pause = useCallback(() => setTimer((t) => pauseTimer(t, Date.now())), []);
  const resume = useCallback(() => setTimer((t) => resumeTimer(t, Date.now())), []);
  const stop = useCallback(() => {
    if (timer.status === 'running' || timer.status === 'paused') record(timer, Date.now());
    setTimer(idleTimer);
  }, [timer, record]);
  const dismiss = useCallback(() => setTimer(idleTimer), []);

  const value = useMemo(
    () => ({ timer, history, start, pause, resume, stop, dismiss }),
    [timer, history, start, pause, resume, stop, dismiss],
  );
  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useFocus(): FocusApi {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error('useFocus must be used inside FocusProvider');
  return ctx;
}
