import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { addDays, dayHeading, formatTimeOfDate, isLocalDate, relativeDayLabel, shortDate, startOfWeek, toLocalDate, type LocalDate } from '@/domain/dates';
import { agendaForDay, busiestDay, unplannedTasks, weekOverview, type DayAgenda } from '@/domain/planning/agenda';
import { blockToEvent } from '@/domain/planning/time-block';
import { isOpen } from '@/domain/tasks/task';
import { useCalendarEvents } from '@/state/calendar';
import { useClock } from '@/state/clock';
import { usePlans } from '@/state/plans-store';
import { useTasks } from '@/state/tasks-store';
import { colors, MIN_TOUCH, radius, space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { EmptyState } from '@/ui/empty-state';
import { EventRow } from '@/ui/event-row';
import { SampleBadge } from '@/ui/sample-badge';
import { Screen } from '@/ui/screen';
import { Section } from '@/ui/section';
import { Segmented } from '@/ui/segmented';
import { TaskRow } from '@/ui/task-row';
import { Text } from '@/ui/text';

type Mode = 'day' | 'week';

export default function PlanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ view?: string; date?: string }>();
  const now = useClock();
  const today = toLocalDate(now);
  const [mode, setMode] = useState<Mode>(params.view === 'week' ? 'week' : 'day');
  const [date, setDate] = useState<LocalDate>(params.date && isLocalDate(params.date) ? params.date : today);

  // Let deep links / the assistant switch the view after mount (state adjusted during render when params change).
  const paramsKey = `${params.view ?? ''}|${params.date ?? ''}`;
  const [seenParams, setSeenParams] = useState(paramsKey);
  if (paramsKey !== seenParams) {
    setSeenParams(paramsKey);
    if (params.view === 'week' || params.view === 'day') setMode(params.view);
    if (params.date && isLocalDate(params.date)) setDate(params.date);
  }

  const weekStart = startOfWeek(date);
  const { tasks } = useTasks();
  const { events: calendarEvents, integration } = useCalendarEvents(weekStart, addDays(weekStart, 7));
  const { blocks, appliedPlans, undo } = usePlans();
  // Time set aside through Intentional shows alongside calendar events.
  const events = [...calendarEvents, ...blocks.map(blockToEvent)];
  const recentPlan = [...appliedPlans].reverse().find((p) => !p.undone && now.getTime() - new Date(p.appliedAt).getTime() < 7 * 86_400_000);

  const addTask = (d: LocalDate | null) =>
    router.push({ pathname: '/task/new', params: d ? { date: d } : {} });

  return (
    <Screen title="Plan">
      <Segmented
        label="Planning view"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'day', label: 'Day' },
          { value: 'week', label: 'Week' },
        ]}
      />

      {recentPlan ? (
        <Card>
          <Text variant="label" muted>
            Current plan
          </Text>
          <Text>{recentPlan.summary}</Text>
          <Button compact tone="quiet" label="Undo plan" style={styles.left} onPress={() => undo(recentPlan.id)} accessibilityHint="Removes the time blocks, reminders and priorities this plan added" />
        </Card>
      ) : null}

      {mode === 'day' ? (
        <DayView
          agenda={agendaForDay(date, today, tasks, events)}
          today={today}
          onShift={(n) => setDate(addDays(date, n))}
          onToday={() => setDate(today)}
          onAdd={() => addTask(date)}
          mock={integration.isMock}
        />
      ) : (
        <WeekView
          weekStart={weekStart}
          today={today}
          days={weekOverview(weekStart, today, tasks, events)}
          onShift={(n) => setDate(addDays(date, n * 7))}
          onPickDay={(d) => {
            setDate(d);
            setMode('day');
          }}
          mock={integration.isMock}
        />
      )}

      <Section title="Not yet planned">
        {unplannedTasks(tasks).length === 0 ? (
          <EmptyState title="Nothing waiting" body="Captured thoughts without a day land here." />
        ) : (
          unplannedTasks(tasks).map((t) => <TaskRow key={t.id} task={t} today={today} />)
        )}
        <Button tone="quiet" compact label="Capture without a day" onPress={() => addTask(null)} style={styles.left} />
      </Section>
    </Screen>
  );
}

function DateNav({ label, onPrev, onNext, onReset, resetLabel }: { label: string; onPrev: () => void; onNext: () => void; onReset?: () => void; resetLabel: string }) {
  return (
    <View style={styles.nav}>
      <NavArrow label="‹" a11y="Previous" onPress={onPrev} />
      <View style={styles.navCenter}>
        <Text variant="heading" accessibilityRole="header">
          {label}
        </Text>
        {onReset ? <Button tone="quiet" compact label={resetLabel} onPress={onReset} /> : null}
      </View>
      <NavArrow label="›" a11y="Next" onPress={onNext} />
    </View>
  );
}

function NavArrow({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y} onPress={onPress} style={styles.arrow}>
      <Text variant="title" style={{ color: colors.accent }}>
        {label}
      </Text>
    </Pressable>
  );
}

function DayView({
  agenda,
  today,
  onShift,
  onToday,
  onAdd,
  mock,
}: {
  agenda: DayAgenda;
  today: LocalDate;
  onShift: (n: number) => void;
  onToday: () => void;
  onAdd: () => void;
  mock: boolean;
}) {
  const isToday = agenda.date === today;
  const tasks = [...agenda.overdueTasks, ...agenda.timedTasks, ...agenda.anytimeTasks];
  const label = dayHeading(agenda.date, today);
  return (
    <>
      <DateNav label={label} onPrev={() => onShift(-1)} onNext={() => onShift(1)} onReset={isToday ? undefined : onToday} resetLabel="Back to today" />

      <Section title="Calendar" trailing={mock ? <SampleBadge /> : null}>
        {agenda.events.length === 0 ? <EmptyState title="No events" /> : agenda.events.map((e) => <EventRow key={e.id} event={e} removable />)}
      </Section>

      <Section title="Tasks & reminders">
        {tasks.length === 0 ? (
          <EmptyState title="Nothing planned" body={isToday ? 'An open day. Keep it that way, or add one thing.' : undefined} />
        ) : (
          tasks.map((t) => <TaskRow key={t.id} task={t} today={today} />)
        )}
        <Button tone="secondary" label="Add to this day" onPress={onAdd} />
      </Section>
    </>
  );
}

function WeekView({
  weekStart,
  today,
  days,
  onShift,
  onPickDay,
  mock,
}: {
  weekStart: LocalDate;
  today: LocalDate;
  days: ReturnType<typeof weekOverview>;
  onShift: (n: number) => void;
  onPickDay: (d: LocalDate) => void;
  mock: boolean;
}) {
  const busy = busiestDay(days);
  const isThisWeek = weekStart === startOfWeek(today);
  return (
    <>
      <DateNav
        label={`Week of ${shortDate(weekStart)}`}
        onPrev={() => onShift(-1)}
        onNext={() => onShift(1)}
        onReset={isThisWeek ? undefined : () => onPickDay(today)}
        resetLabel="This week"
      />
      <View style={styles.weekSummary}>
        <Text muted>
          {days.eventCount} {days.eventCount === 1 ? 'event' : 'events'} · {days.openTaskCount} open {days.openTaskCount === 1 ? 'task' : 'tasks'}
        </Text>
        {mock ? <SampleBadge label="Sample calendar" /> : null}
      </View>
      {busy ? (
        <Text variant="small" muted>
          {relativeDayLabel(busy.date, today)} looks full. Consider moving something.
        </Text>
      ) : null}
      {days.days.map((d) => {
        const dayTasks = [...d.timedTasks, ...d.anytimeTasks];
        const open = dayTasks.filter(isOpen);
        const past = d.date < today;
        return (
          <Pressable
            key={d.date}
            accessibilityRole="button"
            accessibilityHint="Opens this day"
            onPress={() => onPickDay(d.date)}
            style={({ pressed }) => [pressed && { opacity: 0.8 }]}>
            <Card style={[d.date === today && styles.todayCard, past && styles.pastCard]}>
              <View style={styles.dayHeader}>
                <Text variant="heading">{dayHeading(d.date, today)}</Text>
                <Text variant="small" muted>
                  {d.events.length} {d.events.length === 1 ? 'event' : 'events'} · {open.length} open
                </Text>
              </View>
              {d.events.slice(0, 3).map((e) => (
                <Text key={e.id} variant="small" muted numberOfLines={1}>
                  {formatTimeOfDate(new Date(e.start))} {e.title}
                </Text>
              ))}
              {d.events.length > 3 ? (
                <Text variant="small" muted>
                  +{d.events.length - 3} more
                </Text>
              ) : null}
              {open.slice(0, 3).map((t) => (
                <Text key={t.id} variant="small" numberOfLines={1}>
                  ○ {t.title}
                </Text>
              ))}
              {open.length > 3 ? (
                <Text variant="small" muted>
                  +{open.length - 3} more tasks
                </Text>
              ) : null}
            </Card>
          </Pressable>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  left: { alignSelf: 'flex-start' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navCenter: { alignItems: 'center', flex: 1 },
  arrow: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  weekSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space.sm },
  todayCard: { borderColor: colors.accent, borderWidth: 1 },
  pastCard: { opacity: 0.6 },
});
