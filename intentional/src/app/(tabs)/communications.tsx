import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import {
  buildQueue,
  TRIAGE_LABELS,
  windowStatus,
  type CommunicationItem,
} from '@/domain/communications/communication';
import { formatTimeOfDate, relativeDayLabel, toLocalDate } from '@/domain/dates';
import { useClock } from '@/state/clock';
import { useCommunications } from '@/state/communications-store';
import { usePreferences } from '@/state/preferences-store';
import { useTasks } from '@/state/tasks-store';
import { colors, space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { EmptyState } from '@/ui/empty-state';
import { NotConnectedNote, SampleBadge } from '@/ui/sample-badge';
import { Screen } from '@/ui/screen';
import { Section } from '@/ui/section';
import { Text } from '@/ui/text';

export default function CommunicationsScreen() {
  const now = useClock();
  const comms = useCommunications();
  const { preferences } = usePreferences();
  const [showAll, setShowAll] = useState(false);
  const [openDraftId, setOpenDraftId] = useState<string | null>(null);

  const status = windowStatus(preferences.communicationWindows, now);
  const windowOpen = status.open || !preferences.holdMessagesOutsideWindows;
  const queue = buildQueue(comms.items, { handledIds: comms.handledIds, windowOpen, showAllOutsideWindow: showAll });

  const windowText = status.open
    ? `Communication window open until ${formatTimeOfDate(status.closesAt)}.`
    : status.nextOpensAt
      ? `Next communication window: ${relativeDayLabel(toLocalDate(status.nextOpensAt), toLocalDate(now))} at ${formatTimeOfDate(status.nextOpensAt)}.`
      : 'No communication windows set.';

  return (
    <Screen title="Messages" subtitle={queue.pendingCount === 0 ? 'All handled.' : `${queue.pendingCount} to look at`}>
      <Card style={!status.open ? styles.closedCard : undefined}>
        <Text>{windowText}</Text>
        {!windowOpen && queue.heldCount > 0 ? (
          <>
            <Text variant="small" muted>
              {queue.heldCount} non-urgent {queue.heldCount === 1 ? 'message is' : 'messages are'} being held until then.
            </Text>
            <Button tone="quiet" compact label={showAll ? 'Hold them again' : 'Show them anyway'} onPress={() => setShowAll((v) => !v)} style={styles.left} />
          </>
        ) : null}
      </Card>

      {comms.integration.isMock ? (
        <View style={styles.mockNote}>
          <SampleBadge />
          <NotConnectedNote service={comms.integration.displayName} />
        </View>
      ) : null}

      {!comms.loaded ? null : queue.sections.length === 0 ? (
        <EmptyState
          title={queue.pendingCount === 0 ? 'Inbox handled' : 'Nothing urgent'}
          body={queue.pendingCount === 0 ? 'Nothing needs you. Go do something else.' : 'The rest can wait for your next window.'}
        />
      ) : (
        queue.sections.map((section) => (
          <Section key={section.triage} title={TRIAGE_LABELS[section.triage].title}>
            {section.items.map((item) => (
              <MessageCard
                key={item.id}
                item={item}
                today={toLocalDate(now)}
                draftOpen={openDraftId === item.id}
                onToggleDraft={() => setOpenDraftId((id) => (id === item.id ? null : item.id))}
              />
            ))}
          </Section>
        ))
      )}
    </Screen>
  );
}

function MessageCard({
  item,
  today,
  draftOpen,
  onToggleDraft,
}: {
  item: CommunicationItem;
  today: string;
  draftOpen: boolean;
  onToggleDraft: () => void;
}) {
  const { markHandled, undoHandled } = useCommunications();
  const { addTask } = useTasks();

  const toTask = () => {
    const result = addTask({
      title: item.triage === 'needs_reply' ? `Reply to ${item.from}: ${item.subject}` : `${item.from}: ${item.subject}`,
      notes: item.summary,
      source: 'communication',
    });
    if (result.ok) {
      markHandled(item.id);
      Alert.alert('Saved as a task', 'You can find it in Plan under "Not yet planned".', [
        { text: 'Undo', style: 'cancel', onPress: () => undoHandled(item.id) },
        { text: 'OK' },
      ]);
    }
  };

  return (
    <Card>
      <View style={styles.cardHeader}>
        <Text variant="heading" style={styles.flex}>
          {item.from}
        </Text>
        {item.timeSensitive ? (
          <Text variant="small" style={{ color: colors.warning }}>
            Time-sensitive
          </Text>
        ) : null}
      </View>
      <Text variant="small" muted>
        {item.subject} · {relativeDayLabel(toLocalDate(new Date(item.receivedAt)), today)}
      </Text>
      <Text>{item.summary}</Text>
      <Text variant="small" muted>
        {item.isMock ? 'Sample summary (mock assistant)' : 'AI summary'}
      </Text>

      {draftOpen && item.suggestedReply ? (
        <View style={styles.draft}>
          <Text variant="label" muted>
            Suggested reply
          </Text>
          <Text>{item.suggestedReply}</Text>
          <Text variant="small" muted>
            Sending isn&apos;t available: Gmail isn&apos;t connected. Intentional will never send a message without your review and
            explicit approval.
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button compact tone="secondary" label="Done" accessibilityHint="Marks this message as handled" onPress={() => markHandled(item.id)} />
        {item.suggestedReply ? (
          <Button compact tone="quiet" label={draftOpen ? 'Hide draft' : 'Draft reply'} onPress={onToggleDraft} />
        ) : null}
        <Button compact tone="quiet" label="Make task" onPress={toTask} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  closedCard: { backgroundColor: colors.surfaceSunken },
  mockNote: { gap: space.xs },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  draft: { backgroundColor: colors.surfaceSunken, borderRadius: 10, padding: space.md, gap: space.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.xs },
  left: { alignSelf: 'flex-start' },
});
