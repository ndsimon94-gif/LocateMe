import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { BackendError, callFunction } from '@/backend/supabase';
import {
  composeUserContent,
  isResumable,
  newConversation,
  noteForApplied,
  type ChatItem,
  type Conversation,
} from '@/ai/agent/conversation';
import { runTurn, type RelayResponse } from '@/ai/agent/run-turn';
import { respondLocally } from '@/ai/mock-assistant';
import { buildSnapshot } from '@/domain/assistant/snapshot';
import { addDays, toLocalDate } from '@/domain/dates';
import { todaysPriorities } from '@/domain/tasks/priorities';
import { isOpen, newId } from '@/domain/tasks/task';

import { useAuth } from './auth-store';
import { useChanges } from './changes-store';
import { useCommunications } from './communications-store';
import { useConnections } from './connections-store';
import { useFocus } from './focus-store';
import { usePlans } from './plans-store';
import { usePreferences } from './preferences-store';
import { useServices } from './services';
import { useTasks } from './tasks-store';

interface AssistantApi {
  items: ChatItem[];
  busy: boolean;
  /** Claude when signed in, otherwise the basic on-device assistant. */
  mode: 'claude' | 'on-device';
  send(text: string): Promise<void>;
  applyChanges(itemId: string, selectedIds: ReadonlySet<string>): void;
  discardChanges(itemId: string): void;
  undoChanges(itemId: string): void;
  newChat(): void;
}

const AssistantContext = createContext<AssistantApi | null>(null);

const ERRORS: Record<string, string> = {
  unauthorized: 'Your sign-in expired. Sign in again from Account & connections.',
  assistant_not_configured: 'The assistant isn’t set up on the server (Claude API key missing or rejected).',
  rate_limited: 'Claude is busy right now. Try again in a minute.',
  conversation_too_long: 'This conversation got long. Start a new one with “New”.',
  network_error: 'Couldn’t reach the server. Check your connection.',
};

export function AssistantProvider({ children }: { children: ReactNode }) {
  const { repositories, calendar } = useServices();
  const { session } = useAuth();
  const { google } = useConnections();
  const { tasks } = useTasks();
  const { blocks } = usePlans();
  const { preferences } = usePreferences();
  const focus = useFocus();
  const comms = useCommunications();
  const changes = useChanges();
  const [conversation, setConversation] = useState<Conversation>(() => newConversation(new Date()));
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const mode: AssistantApi['mode'] = session ? 'claude' : 'on-device';

  // Latest values for use inside async turns.
  const live = useRef({ tasks, blocks, preferences, focus: focus.timer, conversation });
  useEffect(() => {
    live.current = { tasks, blocks, preferences, focus: focus.timer, conversation };
  });

  useEffect(() => {
    void repositories.conversation.load().then((c) => {
      if (c && isResumable(c, new Date())) setConversation(c);
      setHydrated(true);
    });
  }, [repositories]);
  useEffect(() => {
    if (hydrated) void repositories.conversation.save(conversation);
  }, [hydrated, conversation, repositories]);

  const update = useCallback((fn: (c: Conversation) => Conversation) => {
    setConversation((c) => {
      const next = { ...fn(c), updatedAt: new Date().toISOString() };
      live.current.conversation = next;
      return next;
    });
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      const now = new Date();
      // Start fresh after a long gap: a calm app shouldn't drag yesterday's chat along.
      let convo = live.current.conversation;
      if (!isResumable(convo, now) && convo.items.length) convo = newConversation(now);

      // Proposals left pending are now out of date.
      const expiredNotes: string[] = [];
      const items = convo.items.map((it) => {
        if (it.role === 'assistant' && it.changes?.status === 'pending') {
          expiredNotes.push('The user did not apply your previous proposal.');
          return { ...it, changes: { ...it.changes, status: 'expired' as const } };
        }
        return it;
      });
      const userItem: ChatItem = { id: newId(), role: 'user', text: trimmed };
      convo = { ...convo, items: [...items, userItem], pendingNotes: [...convo.pendingNotes, ...expiredNotes] };
      setConversation(convo);
      live.current.conversation = convo;
      setBusy(true);

      try {
        if (mode === 'on-device') {
          const today = toLocalDate(now);
          const r = respondLocally(trimmed, {
            now,
            todayEventTitles: [],
            priorityTitles: todaysPriorities(live.current.tasks, today).map((t) => t.title),
            openTaskCount: live.current.tasks.filter(isOpen).length,
            needsReplyCount: comms.needsReplyCount,
            connectedIntegrations: new Set(),
          });
          update((c) => ({ ...c, items: [...c.items, { id: newId(), role: 'assistant', text: r.message, provider: 'on-device', actions: r.actions }] }));
          return;
        }

        const today = toLocalDate(now);
        const { tasks: t, blocks: b, preferences: p, focus: f } = live.current;
        const events = await calendar.listEvents(today, addDays(today, 7)).catch(() => []);
        const snapshot = buildSnapshot({
          now,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
          tasks: t,
          blocks: b,
          events,
          calendarSource: google === 'connected' ? 'google' : 'sample',
          windows: p.communicationWindows,
          settings: {
            windDownTime: p.windDownTime,
            planningHours: p.planningHours,
            notifyCommunicationWindows: p.notifyCommunicationWindows,
            notifyTimeBlocks: p.notifyTimeBlocks,
          },
          focus: f,
        });
        const relay = (messages: Conversation['apiMessages']) => callFunction<RelayResponse>('assistant', { messages });
        const env = {
          now,
          sim: { now, today, tasks: t, blocks: b, windows: p.communicationWindows },
          staged: [],
          planningHours: p.planningHours,
          newId: () => newId(),
          getEvents: (from: string, to: string) => calendar.listEvents(from, to),
        };
        const result = await runTurn(convo.apiMessages, composeUserContent(snapshot, convo.pendingNotes, trimmed), env, relay);
        update((c) => ({
          ...c,
          apiMessages: result.messages,
          pendingNotes: [],
          items: [
            ...c.items,
            {
              id: newId(),
              role: 'assistant',
              text: result.text,
              provider: 'claude',
              ...(result.staged.length ? { changes: { staged: result.staged, status: 'pending' as const } } : {}),
            },
          ],
        }));
      } catch (e) {
        const code = e instanceof BackendError ? e.code : 'unknown';
        const detail = e instanceof BackendError && e.detail ? ` Details: ${e.detail}` : '';
        const message = ERRORS[code] ?? `Something went wrong (${code}). Nothing was changed.${detail}`;
        // The history is untouched, so the user can simply try again.
        update((c) => ({ ...c, items: [...c.items, { id: newId(), role: 'error', text: message }] }));
      } finally {
        setBusy(false);
      }
    },
    [busy, mode, calendar, google, comms.needsReplyCount, update],
  );

  const applyChanges = useCallback(
    (itemId: string, selectedIds: ReadonlySet<string>) => {
      const item = live.current.conversation.items.find((i) => i.id === itemId);
      if (!item || item.role !== 'assistant' || !item.changes || item.changes.status !== 'pending') return;
      const chosen = item.changes.staged.filter((c) => selectedIds.has(c.id));
      const skipped = item.changes.staged.filter((c) => !selectedIds.has(c.id));
      if (!chosen.length) return;
      const { record, failures } = changes.apply(chosen, chosen.map((c) => c.label).join('; '));
      update((c) => ({
        ...c,
        pendingNotes: [...c.pendingNotes, noteForApplied(chosen, skipped), ...(failures.length ? [`These failed: ${failures.join('; ')}.`] : [])],
        items: c.items.map((i) =>
          i.id === itemId && i.role === 'assistant' && i.changes ? { ...i, changes: { ...i.changes, status: 'applied', appliedId: record.id, failures } } : i,
        ),
      }));
    },
    [changes, update],
  );

  const discardChanges = useCallback(
    (itemId: string) => {
      update((c) => ({
        ...c,
        pendingNotes: [...c.pendingNotes, 'The user discarded your last proposal.'],
        items: c.items.map((i) => (i.id === itemId && i.role === 'assistant' && i.changes ? { ...i, changes: { ...i.changes, status: 'discarded' } } : i)),
      }));
    },
    [update],
  );

  const undoChanges = useCallback(
    (itemId: string) => {
      const item = live.current.conversation.items.find((i) => i.id === itemId);
      if (!item || item.role !== 'assistant' || item.changes?.status !== 'applied' || !item.changes.appliedId) return;
      changes.undo(item.changes.appliedId);
      update((c) => ({
        ...c,
        pendingNotes: [...c.pendingNotes, 'The user undid the changes they had applied from your last proposal.'],
        items: c.items.map((i) => (i.id === itemId && i.role === 'assistant' && i.changes ? { ...i, changes: { ...i.changes, status: 'undone' } } : i)),
      }));
    },
    [changes, update],
  );

  const newChat = useCallback(() => {
    const fresh = newConversation(new Date());
    live.current.conversation = fresh;
    setConversation(fresh);
  }, []);

  const value = useMemo(
    () => ({ items: conversation.items, busy, mode, send, applyChanges, discardChanges, undoChanges, newChat }),
    [conversation.items, busy, mode, send, applyChanges, discardChanges, undoChanges, newChat],
  );
  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant(): AssistantApi {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error('useAssistant must be used inside AssistantProvider');
  return ctx;
}
