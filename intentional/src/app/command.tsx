import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import type { AssistantResponse, ProposedAction } from '@/ai/assistant';
import { needsReplyCount } from '@/domain/communications/communication';
import { addDays, toLocalDate } from '@/domain/dates';
import { todaysPriorities } from '@/domain/tasks/priorities';
import { isOpen } from '@/domain/tasks/task';
import { useCalendarEvents } from '@/state/calendar';
import { useCommunications } from '@/state/communications-store';
import { executeAction } from '@/state/execute-action';
import { useFocus } from '@/state/focus-store';
import { useServices } from '@/state/services';
import { useTasks } from '@/state/tasks-store';
import { colors, space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { ModalScreen } from '@/ui/modal-screen';
import { SampleBadge } from '@/ui/sample-badge';
import { Text } from '@/ui/text';
import { TextField } from '@/ui/text-field';

const EXAMPLES = ['Remind me to call the dentist tomorrow at 10am', 'Focus for 45 minutes on the proposal', 'Buy birthday card for Alex friday', "What's on today?"];

export default function CommandScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const { assistant } = useServices();
  const { tasks, addTask } = useTasks();
  const focus = useFocus();
  const comms = useCommunications();
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
      addTask,
      startFocus: focus.start,
      navigate: (to, params) => {
        router.dismissAll();
        router.navigate(params ? { pathname: to, params } : to);
      },
    });
    if (action.kind === 'navigate' || action.kind === 'start_focus') return;
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
            <Button
              key={e}
              compact
              tone="quiet"
              label={e}
              style={styles.left}
              onPress={() => {
                setInput(e);
                void ask(e);
              }}
            />
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
  left: { alignSelf: 'flex-start' },
});
