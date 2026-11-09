import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { windowStatus, needsReplyCount } from '@/domain/communications/communication';
import { addDays, formatTimeOfDate, greetingFor, longDate, toLocalDate } from '@/domain/dates';
import { remainingMs } from '@/domain/focus/focus-timer';
import { priorityCandidates, todaysPriorities } from '@/domain/tasks/priorities';
import { MAX_DAILY_PRIORITIES } from '@/domain/tasks/task';
import { nextSuggestedAction } from '@/domain/today/next-action';
import { useCalendarEvents } from '@/state/calendar';
import { useClock } from '@/state/clock';
import { useCommunications } from '@/state/communications-store';
import { useFocus } from '@/state/focus-store';
import { usePreferences } from '@/state/preferences-store';
import { useTasks } from '@/state/tasks-store';
import { colors, space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { EmptyState } from '@/ui/empty-state';
import { EventRow } from '@/ui/event-row';
import { SampleBadge } from '@/ui/sample-badge';
import { Screen } from '@/ui/screen';
import { Section } from '@/ui/section';
import { TaskRow } from '@/ui/task-row';
import { Text } from '@/ui/text';

export default function TodayScreen() {
  const router = useRouter();
  const now = useClock(30_000);
  const today = toLocalDate(now);
  const { tasks, updateTask } = useTasks();
  const { events, integration } = useCalendarEvents(today, addDays(today, 1));
  const comms = useCommunications();
  const focus = useFocus();
  const { preferences } = usePreferences();

  const priorities = todaysPriorities(tasks, today);
  const candidates = priorities.length < MAX_DAILY_PRIORITIES ? priorityCandidates(tasks, today) : [];
  const upcoming = events.filter((e) => new Date(e.end) > now);
  const window = windowStatus(preferences.communicationWindows, now);
  const replies = needsReplyCount(comms.items, comms.handledIds);
  const next = nextSuggestedAction({
    now,
    events,
    priorities,
    needsReplyCount: replies,
    window,
    focusRunning: focus.timer.status === 'running',
    focusRemainingMinutes: Math.ceil(remainingMs(focus.timer, now.getTime()) / 60_000),
    windDownTime: preferences.windDownTime,
  });

  const goToNext = () => {
    switch (next.target.screen) {
      case 'focus':
        router.navigate({ pathname: '/focus', params: next.target.taskId ? { taskId: next.target.taskId } : {} });
        break;
      case 'communications':
        router.navigate('/communications');
        break;
      case 'plan':
        router.navigate('/plan');
        break;
    }
  };

  return (
    <Screen title={greetingFor(now)} subtitle={longDate(today)}>
      <Card style={styles.next} accessibilityLabel="Next suggested action">
        <Text variant="label" style={{ color: colors.accent }}>
          Next
        </Text>
        <Text variant="title">{next.title}</Text>
        <Text muted>{next.detail}</Text>
        {next.cta ? <Button label={next.cta} onPress={goToNext} style={styles.nextButton} /> : null}
      </Card>

      <Section title={`Three priorities`}>
        {priorities.length === 0 ? (
          <EmptyState title="No priorities yet" body="Choose up to three things that would make today a good day." />
        ) : (
          priorities.map((t) => <TaskRow key={t.id} task={t} today={today} />)
        )}
        {candidates.length > 0 ? (
          <View style={styles.candidates}>
            <Text variant="small" muted>
              {priorities.length === 0 ? 'From your list:' : 'Add another?'}
            </Text>
            {candidates.map((t) => (
              <View key={t.id} style={styles.candidate}>
                <Text style={styles.candidateTitle} numberOfLines={1}>
                  {t.title}
                </Text>
                <Button
                  compact
                  tone="secondary"
                  label="Prioritise"
                  accessibilityHint={`Makes "${t.title}" one of today's priorities`}
                  onPress={() => updateTask(t.id, { title: t.title, isPriority: true, dueDate: t.dueDate && t.dueDate >= today ? t.dueDate : today })}
                />
              </View>
            ))}
          </View>
        ) : null}
        <Button tone="quiet" compact label="Add a task" onPress={() => router.push({ pathname: '/task/new', params: { date: today } })} style={styles.left} />
      </Section>

      <Section title="Coming up" trailing={integration.isMock ? <SampleBadge /> : null}>
        {upcoming.length === 0 ? (
          <EmptyState title="Nothing else scheduled" body="The rest of the day is yours." />
        ) : (
          upcoming.map((e) => <EventRow key={e.id} event={e} past={new Date(e.start) < now} />)
        )}
      </Section>

      <Section title="Messages" trailing={comms.integration.isMock ? <SampleBadge /> : null}>
        <Card>
          <Text>
            {replies === 0 ? 'Nothing is waiting on you.' : `${replies} ${replies === 1 ? 'message needs' : 'messages need'} a reply.`}
          </Text>
          <Text variant="small" muted>
            {window.open
              ? 'Your communication window is open now.'
              : window.nextOpensAt
                ? `Next window ${toLocalDate(window.nextOpensAt) === today ? 'today' : 'tomorrow'} at ${formatTimeOfDate(window.nextOpensAt)}.`
                : ''}
          </Text>
          {replies > 0 ? <Button tone="secondary" compact label="Open queue" onPress={() => router.navigate('/communications')} style={styles.left} /> : null}
        </Card>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  next: { gap: space.sm, paddingVertical: space.xl },
  nextButton: { alignSelf: 'flex-start', marginTop: space.sm },
  candidates: { gap: space.xs, paddingTop: space.xs },
  candidate: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  candidateTitle: { flex: 1 },
  left: { alignSelf: 'flex-start' },
});
