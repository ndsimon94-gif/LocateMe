import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ProposedAction } from '@/ai/assistant';
import type { ChatItem } from '@/ai/agent/conversation';
import { useAssistant } from '@/state/assistant-store';
import { executeAction } from '@/state/execute-action';
import { useFocus } from '@/state/focus-store';
import { useNotifications } from '@/state/notifications-store';
import { usePlans } from '@/state/plans-store';
import { useTasks } from '@/state/tasks-store';
import { colors, MIN_TOUCH, radius, space, type as typeScale } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { ChangesCard } from '@/ui/changes-card';
import { SampleBadge } from '@/ui/sample-badge';
import { Text } from '@/ui/text';

function starters(now: Date): string[] {
  const h = now.getHours();
  const time = h < 12 ? 'Plan my day' : h >= 17 ? 'Wrap up today' : 'What should I focus on now?';
  return [
    time,
    'Rework the rest of my week',
    'I have a busy week. Organize my priorities, find time for exercise, remind me of anything important, and give me two windows each day to respond to messages.',
    'Remind me to call the dentist tomorrow at 10am',
  ];
}

export default function AssistantScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ prompt?: string }>();
  const assistant = useAssistant();
  const [input, setInput] = useState('');
  const scroll = useRef<ScrollView>(null);
  const sentPrompt = useRef(false);

  // Opened with a prompt (e.g. "Plan my day" from Today): send it once.
  useEffect(() => {
    if (params.prompt && !sentPrompt.current) {
      sentPrompt.current = true;
      void assistant.send(params.prompt);
    }
  }, [params.prompt, assistant]);

  const submit = (text = input) => {
    if (!text.trim() || assistant.busy) return;
    setInput('');
    void assistant.send(text);
  };

  return (
    <SafeAreaView style={styles.safe} edges={Platform.OS === 'ios' ? ['bottom', 'left', 'right'] : undefined}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}>
        <View style={styles.header}>
          <Text variant="title" accessibilityRole="header">
            Assistant
          </Text>
          <View style={styles.headerActions}>
            {assistant.items.length ? <Button compact tone="quiet" label="New" onPress={assistant.newChat} /> : null}
            <Button compact tone="quiet" label="Close" onPress={() => router.back()} />
          </View>
        </View>

        <ScrollView
          ref={scroll}
          style={styles.flex}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
          {assistant.items.length === 0 ? <Intro mode={assistant.mode} onPick={submit} /> : null}
          {assistant.items.map((item) => (
            <Item key={item.id} item={item} />
          ))}
          {assistant.busy ? (
            <Text muted accessibilityLiveRegion="polite">
              Thinking…
            </Text>
          ) : null}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={assistant.items.length ? 'Reply…' : 'What do you need?'}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Message to the assistant"
            multiline
            style={styles.input}
            autoFocus={!params.prompt}
            onSubmitEditing={() => submit()}
            blurOnSubmit
            returnKeyType="send"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            disabled={!input.trim() || assistant.busy}
            onPress={() => submit()}
            style={[styles.send, (!input.trim() || assistant.busy) && styles.sendDisabled]}>
            <Ionicons name="arrow-up" size={20} color={colors.onAccent} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Intro({ mode, onPick }: { mode: 'claude' | 'on-device'; onPick: (t: string) => void }) {
  return (
    <View style={styles.intro}>
      <Text muted>
        Tell me what your day or week needs. I&apos;ll propose changes to your tasks, priorities and time, and nothing
        changes until you apply it.
      </Text>
      {starters(new Date()).map((s) => (
        <Pressable key={s} accessibilityRole="button" onPress={() => onPick(s)} style={({ pressed }) => [styles.starter, pressed && { opacity: 0.7 }]}>
          <Text variant="small" style={{ color: colors.accent }}>
            {s}
          </Text>
        </Pressable>
      ))}
      <Text variant="small" muted>
        {mode === 'claude'
          ? 'Uses Claude. Your request goes with your tasks, plans and this week’s calendar titles, never your messages.'
          : 'Basic on-device assistant. Sign in under Focus → Account & connections to use Claude.'}
      </Text>
    </View>
  );
}

function Item({ item }: { item: ChatItem }) {
  const assistant = useAssistant();
  if (item.role === 'user') {
    return (
      <View style={styles.userBubble}>
        <Text style={{ color: colors.onAccent }}>{item.text}</Text>
      </View>
    );
  }
  if (item.role === 'error') {
    return (
      <Text variant="small" style={{ color: colors.danger }} accessibilityRole="alert">
        {item.text}
      </Text>
    );
  }
  return (
    <View style={styles.assistantBlock}>
      {item.provider === 'on-device' ? <SampleBadge label="On-device assistant" /> : null}
      <Text>{item.text}</Text>
      {item.changes ? (
        <ChangesCard
          staged={item.changes.staged}
          status={item.changes.status}
          failures={item.changes.failures}
          onApply={(sel) => assistant.applyChanges(item.id, sel)}
          onDiscard={() => assistant.discardChanges(item.id)}
          onUndo={() => assistant.undoChanges(item.id)}
        />
      ) : null}
      {item.actions?.map((a, i) => <LocalAction key={i} action={a} />)}
    </View>
  );
}

/** Proposals from the on-device assistant (signed out). */
function LocalAction({ action }: { action: ProposedAction }) {
  const router = useRouter();
  const { addTask } = useTasks();
  const focus = useFocus();
  const plans = usePlans();
  const notifications = useNotifications();
  const [outcome, setOutcome] = useState<string | null>(null);
  if (action.kind === 'requires_authorization') {
    return (
      <View style={styles.assistantBlock}>
        <Text variant="small" muted>
          {action.reason}
        </Text>
        {action.fallback ? <LocalAction action={action.fallback} /> : null}
      </View>
    );
  }
  const run = () => {
    const r = executeAction(action, {
      addTask: (d) => {
        const res = addTask(d);
        if (res.ok && res.value.kind === 'reminder') void notifications.requestIfNeeded();
        return res;
      },
      startFocus: (i, m) => focus.start(i, m),
      navigate: (to, p) => {
        router.dismissAll();
        router.navigate(p ? { pathname: to, params: p } : to);
      },
      reviewPlan: (request) => void plans.propose(request).then(() => router.replace('/plan-review')),
    });
    if (r.message) setOutcome(r.message);
  };
  return (
    <View style={styles.localAction}>
      {action.kind === 'create_task' ? <Text style={styles.flex}>{action.label}</Text> : null}
      {outcome ? (
        <Text variant="small" style={{ color: colors.accent }}>
          {outcome}
        </Text>
      ) : (
        <Button compact label={action.kind === 'create_task' ? 'Add' : action.label} onPress={run} style={styles.left} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.sm },
  headerActions: { flexDirection: 'row', gap: space.xs },
  list: { padding: space.xl, paddingTop: space.sm, gap: space.lg },
  intro: { gap: space.sm },
  starter: { paddingVertical: space.sm, minHeight: 40, justifyContent: 'center' },
  userBubble: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: colors.accent, borderRadius: radius.lg, borderBottomRightRadius: 4, paddingHorizontal: space.md, paddingVertical: space.sm },
  assistantBlock: { gap: space.sm },
  localAction: { gap: space.xs },
  left: { alignSelf: 'flex-start' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.background },
  input: { ...typeScale.body, flex: 1, maxHeight: 120, minHeight: MIN_TOUCH, color: colors.text, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, paddingHorizontal: space.md, paddingTop: 11, paddingBottom: 11 },
  send: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: radius.pill, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.35 },
});
