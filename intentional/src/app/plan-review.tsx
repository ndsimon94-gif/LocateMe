import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { dayHeading, formatClock, toLocalDate } from '@/domain/dates';
import type { PlanOperation } from '@/domain/planning/plan';
import { useNotifications } from '@/state/notifications-store';
import { planOperationToChange, stageChanges } from '@/domain/assistant/changeset';
import { newId } from '@/domain/tasks/task';
import { useChanges } from '@/state/changes-store';
import { usePlans } from '@/state/plans-store';
import { usePreferences } from '@/state/preferences-store';
import { useTasks } from '@/state/tasks-store';
import { useServices } from '@/state/services';
import { colors, MIN_TOUCH, radius, space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { EmptyState } from '@/ui/empty-state';
import { ModalScreen } from '@/ui/modal-screen';
import { Section } from '@/ui/section';
import { Text } from '@/ui/text';

const GROUPS: { op: PlanOperation['op']; title: string }[] = [
  { op: 'set_communication_windows', title: 'Message windows' },
  { op: 'add_block', title: 'Time set aside' },
  { op: 'set_priority', title: 'Priorities' },
  { op: 'add_reminder', title: 'Reminders' },
];

export default function PlanReviewScreen() {
  const router = useRouter();
  const { draft, clearDraft, blocks } = usePlans();
  const { apply, undo } = useChanges();
  const { tasks } = useTasks();
  const { preferences } = usePreferences();
  const { calendar } = useServices();
  const notifications = useNotifications();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(draft?.operations.map((o) => o.id)));
  const [result, setResult] = useState<{ planId: string; applied: number; failures: string[] } | null>(null);
  const today = toLocalDate(new Date());

  if (result) {
    return (
      <ModalScreen title="Plan applied">
        <Text>
          {result.applied} {result.applied === 1 ? 'change' : 'changes'} made.
          {notifications.permission === 'granted' ? " You'll get a quiet notification for reminders and set-aside time." : ''}
        </Text>
        {notifications.permission === 'denied' ? (
          <Text variant="small" muted>
            Notifications are off for Intentional in your phone&apos;s settings, so reminders will only show in the app.
          </Text>
        ) : null}
        {result.failures.map((f) => (
          <Text key={f} variant="small" style={{ color: colors.warning }}>
            {f}
          </Text>
        ))}
        <Button label="Done" onPress={() => router.back()} />
        <Button
          tone="quiet"
          label="Undo this plan"
          onPress={() => {
            undo(result.planId);
            router.back();
          }}
        />
      </ModalScreen>
    );
  }

  if (!draft) {
    return (
      <ModalScreen title="Plan">
        <EmptyState title="No plan to review" body="Ask from the Capture bar, for example: “Organize my week and find time for exercise.”" action={<Button label="Close" onPress={() => router.back()} />} />
      </ModalScreen>
    );
  }

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const count = draft.operations.filter((o) => selected.has(o.id)).length;
  const calendarInfo = calendar.info();

  return (
    <ModalScreen title="Review plan">
      <Text variant="title">{draft.summary}</Text>
      <Text variant="small" muted>
        Untick anything you don&apos;t want. Nothing changes until you apply.
      </Text>

      {GROUPS.map((g) => {
        const ops = draft.operations.filter((o) => o.op === g.op);
        if (ops.length === 0) return null;
        return (
          <Section key={g.op} title={g.title}>
            <Card style={styles.list}>
              {ops.map((o) => (
                <OperationRow key={o.id} op={o} today={today} checked={selected.has(o.id)} onToggle={() => toggle(o.id)} />
              ))}
            </Card>
          </Section>
        );
      })}

      {draft.notes.length > 0 ? (
        <Section title="Worth knowing">
          {draft.notes.map((n) => (
            <Text key={n} variant="small" muted>
              {n}
            </Text>
          ))}
        </Section>
      ) : null}

      {calendarInfo.status !== 'connected' ? (
        <Text variant="small" muted>
          {calendarInfo.displayName} isn&apos;t connected, so time set aside stays in Intentional and isn&apos;t added to your
          calendar. Planning used {calendarInfo.isMock ? 'sample calendar events' : 'your calendar'}.
        </Text>
      ) : null}

      <Button
        label={count === 0 ? 'Nothing selected' : `Apply ${count} ${count === 1 ? 'change' : 'changes'}`}
        disabled={count === 0}
        onPress={() => {
          const now = new Date();
          const { staged, failures } = stageChanges(
            draft.operations.filter((o) => selected.has(o.id)).map(planOperationToChange),
            { now, today: toLocalDate(now), tasks, blocks, windows: preferences.communicationWindows },
            () => newId(),
          );
          const r = apply(staged, draft.summary);
          clearDraft();
          setResult({ planId: r.record.id, applied: staged.length - r.failures.length, failures: [...failures, ...r.failures] });
          void notifications.requestIfNeeded();
        }}
      />
      <Button
        tone="quiet"
        label="Not now"
        onPress={() => {
          clearDraft();
          router.back();
        }}
      />
    </ModalScreen>
  );
}

function describe(op: PlanOperation, today: string): { title: string; detail: string } {
  switch (op.op) {
    case 'set_communication_windows':
      return {
        title: op.windows.map((w) => `${formatClock(w.start)} (${w.durationMinutes} min)`).join(' · '),
        detail: `Every day, with a quiet notification when each opens. ${op.reason}`,
      };
    case 'add_block':
      return { title: `${op.block.title} · ${dayHeading(op.block.date, today)}`, detail: `${formatClock(op.block.start)}–${formatClock(op.block.end)}. ${op.reason}` };
    case 'set_priority':
      return { title: op.taskTitle, detail: `${dayHeading(op.date, today)}. ${op.reason}` };
    case 'add_reminder':
      return { title: op.title, detail: `${dayHeading(op.date, today)} at ${formatClock(op.time)}. ${op.reason}` };
  }
}

function OperationRow({ op, today, checked, onToggle }: { op: PlanOperation; today: string; checked: boolean; onToggle: () => void }) {
  const { title, detail } = describe(op, today);
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={`${title}. ${detail}`} onPress={onToggle} style={styles.row}>
      <View style={[styles.box, checked && styles.boxOn]}>{checked ? <Text style={styles.tick}>✓</Text> : null}</View>
      <View style={styles.flex}>
        <Text style={!checked ? { color: colors.textMuted } : undefined}>{title}</Text>
        <Text variant="small" muted>
          {detail}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: 0, paddingVertical: space.xs },
  row: { flexDirection: 'row', gap: space.md, minHeight: MIN_TOUCH, paddingVertical: space.sm, alignItems: 'flex-start' },
  box: { width: 22, height: 22, marginTop: 1, borderRadius: radius.sm - 2, borderWidth: 1.5, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.accent },
  tick: { color: colors.onAccent, fontSize: 14, lineHeight: 16, fontWeight: '700' },
  flex: { flex: 1, gap: 2 },
});
