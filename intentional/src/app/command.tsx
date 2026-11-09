import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type TextInput } from 'react-native';

import type { AssistantResponse, ProposedAction } from '@/ai/assistant';
import { needsReplyCount } from '@/domain/communications/communication';
import { addDays, toLocalDate } from '@/domain/dates';
import { todaysPriorities } from '@/domain/tasks/priorities';
import { isOpen } from '@/domain/tasks/task';
import { useCalendarEvents } from '@/state/calendar';
import { useCommunications } from '@/state/communications-store';
import { executeAction } from '@/state/execute-action';
import { useFocus } from '@/state/focus-store';
import { useNotifications } from '@/state/notifications-store';
import { usePlans } from '@/state/plans-store';
import { useServices } from '@/state/services';
import { useTasks } from '@/state/tasks-store';
import { colors, space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { ModalScreen } from '@/ui/modal-screen';
import { SampleBadge } from '@/ui/sample-badge';
import { Text } from '@/ui/text';
import { TextField } from '@/ui/text-field';

const EXAMPLES = [
  'I have a busy week. Organize my priorities, find time for exercise, remind me of anything important, and give me two windows each day to respond to messages.',
  'Remind me to call the dentist tomorrow at 10am',
  'Focus for 45 minutes on the proposal',
  "What's on today?",
];

export default function CommandScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const { assistant } = useServices();
  const { tasks, addTask } = useTasks();
  const focus = useFocus();
  const comms = useCommunications();
  const plans = usePlans();
  const notifications = useNotifications();
  const now = new Date();
  const today = toLocalDate(now);
  const { events } = useCalendarEvents(today, addDays(today, 1));

  const [input, setInput] = useState('');
  const [response, setResponse] = useState<AssistantResponse | null>(null);
  const [outcome, setOutcome] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const ask = async (text = input) => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setOutcome(null);
    try {
      const r = await assistant.respond(text, {
        now: new Date(),
        todayEventTitles: events.map((e) => e.title),
        priorityTitles: todaysPriorities(tasks, today).map((t) => t.title),
        openTaskCount: tasks.filter(isOpen).length,
        needsReplyCount: needsReplyCount(comms.items, comms.handledIds),
        // Nothing is connected in this milestone.
        connectedIntegrations: new Set(),
      });
      setResponse(r);
    } finally {
      setBusy(false);
    }
  };

  const run = (action: ProposedAction) => {
    const result = executeAction(action, {
      addTask: (draft) => {
        const r = addTask(draft);
        if (r.ok && r.value.kind === 'reminder') void notifications.requestIfNeeded();
        return r;
      },
      startFocus: (intention, minutes) => {
        focus.start(intention, minutes);
        void notifications.requestIfNeeded();
      },
      reviewPlan: (request) => {
        setBusy(true);
        void plans
          .propose(request)
          .then(() => router.replace('/plan-review'))
          .finally(() => setBusy(false));
      },
      navigate: (to, params) => {
        router.dismissAll();
        router.navigate(params ? { pathname: to, params } : to);
      },
    });
    if (action.kind === 'navigate' || action.kind === 'start_focus' || action.kind === 'propose_plan') return;
    setOutcome(result);
    if (result.ok) {
      setInput('');
      setResponse(null);
      inputRef.current?.focus();
    }
  };

  return (
    <ModalScreen title="Capture or ask">
      <TextField
        ref={inputRef}
        label="Thought or request"
        value={input}
        onChangeText={(t) => {
          setInput(t);
          setResponse(null);
        }}
        placeholder="e.g. remind me to water the plants tonight"
        autoFocus
        returnKeyType="send"
        onSubmitEditing={() => ask()}
        blurOnSubmit={false}
      />
      <Button label={busy ? 'Thinking…' : 'Continue'} onPress={() => ask()} disabled={!input.trim() || busy} />

      {outcome ? (
        <Text style={{ color: outcome.ok ? colors.accent : colors.danger }} accessibilityRole="alert">
          {outcome.message}
        </Text>
      ) : null}

      {response ? (
        <Card>
          <View style={styles.row}>
            <Text variant="label" muted style={styles.flex}>
              Assistant
            </Text>
            {response.provider === 'mock' ? <SampleBadge label="Mock assistant" /> : null}
          </View>
          <Text>{response.message}</Text>
          {response.actions.map((a, i) => (
            <ActionView key={i} action={a} onRun={run} />
          ))}
        </Card>
      ) : null}

      {!response && !input ? (
        <View style={styles.examples}>
          <Text variant="label" muted>
            Try
          </Text>
          {EXAMPLES.map((e) => (
            <Pressable
              key={e}
              accessibilityRole="button"
              onPress={() => {
                setInput(e);
                void ask(e);
              }}
              style={({ pressed }) => [styles.example, pressed && { opacity: 0.7 }]}>
              <Text variant="small" style={{ color: colors.accent }}>
                {e}
              </Text>
            </Pressable>
          ))}
          <Text variant="small" muted>
            Runs entirely on this device. Nothing you type here is sent anywhere.
          </Text>
        </View>
      ) : null}
    </ModalScreen>
  );
}

function ActionView({ action, onRun }: { action: ProposedAction; onRun: (a: ProposedAction) => void }) {
  if (action.kind === 'requires_authorization') {
    return (
      <View style={styles.action}>
        <Text variant="small" muted>
          {action.label}: {action.reason} Nothing will be sent or changed.
        </Text>
        {action.fallback ? <ActionView action={action.fallback} onRun={onRun} /> : null}
      </View>
    );
  }
  const verb = action.kind === 'create_task' ? 'Add' : action.kind === 'start_focus' ? 'Start' : 'Go';
  if (action.kind === 'propose_plan') {
    return (
      <View style={styles.action}>
        <Button label={action.label} onPress={() => onRun(action)} />
      </View>
    );
  }
  return (
    <View style={styles.action}>
      {action.kind === 'create_task' ? <Text style={styles.flex}>{action.label}</Text> : null}
      <Button compact label={action.kind === 'create_task' ? verb : action.label} onPress={() => onRun(action)} style={styles.left} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  action: { gap: space.sm, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  examples: { gap: space.xs },
  example: { paddingVertical: space.sm, minHeight: 44, justifyContent: 'center' },
  left: { alignSelf: 'flex-start' },
});
