/**
 * Focus timer as a pure state machine. State stores absolute timestamps
 * rather than counting ticks, so the remaining time stays correct when the
 * app is backgrounded, the JS thread is paused, or the app is restarted.
 */

export type FocusTimerState =
  | { status: 'idle' }
  | { status: 'running'; intention: string; durationMs: number; startedAt: number; endsAt: number; pausedMs: number }
  | { status: 'paused'; intention: string; durationMs: number; startedAt: number; remainingMs: number; pausedAt: number; pausedMs: number }
  | { status: 'finished'; intention: string; durationMs: number; startedAt: number; endedAt: number };

export const MIN_FOCUS_MINUTES = 1;
export const MAX_FOCUS_MINUTES = 180;

export const idleTimer: FocusTimerState = { status: 'idle' };

export function clampMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return 25;
  return Math.min(MAX_FOCUS_MINUTES, Math.max(MIN_FOCUS_MINUTES, Math.round(minutes)));
}

export function startTimer(intention: string, minutes: number, now: number): FocusTimerState {
  const durationMs = clampMinutes(minutes) * 60_000;
  return { status: 'running', intention: intention.trim(), durationMs, startedAt: now, endsAt: now + durationMs, pausedMs: 0 };
}

export function pauseTimer(state: FocusTimerState, now: number): FocusTimerState {
  if (state.status !== 'running') return state;
  const remainingMs = Math.max(0, state.endsAt - now);
  if (remainingMs === 0) return finishIfDue(state, now);
  return {
    status: 'paused',
    intention: state.intention,
    durationMs: state.durationMs,
    startedAt: state.startedAt,
    remainingMs,
    pausedAt: now,
    pausedMs: state.pausedMs,
  };
}

export function resumeTimer(state: FocusTimerState, now: number): FocusTimerState {
  if (state.status !== 'paused') return state;
  return {
    status: 'running',
    intention: state.intention,
    durationMs: state.durationMs,
    startedAt: state.startedAt,
    endsAt: now + state.remainingMs,
    pausedMs: state.pausedMs + (now - state.pausedAt),
  };
}

/** Moves a running timer to `finished` once its end time has passed. */
export function finishIfDue(state: FocusTimerState, now: number): FocusTimerState {
  if (state.status !== 'running' || now < state.endsAt) return state;
  return {
    status: 'finished',
    intention: state.intention,
    durationMs: state.durationMs,
    startedAt: state.startedAt,
    endedAt: state.endsAt,
  };
}

export function remainingMs(state: FocusTimerState, now: number): number {
  switch (state.status) {
    case 'running':
      return Math.max(0, state.endsAt - now);
    case 'paused':
      return state.remainingMs;
    case 'finished':
      return 0;
    case 'idle':
      return 0;
  }
}

/** Time actually spent focusing (excludes pauses). */
export function focusedMs(state: FocusTimerState, now: number): number {
  switch (state.status) {
    case 'idle':
      return 0;
    case 'finished':
      return state.durationMs;
    default:
      return state.durationMs - remainingMs(state, now);
  }
}

export function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
