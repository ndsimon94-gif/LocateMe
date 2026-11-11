import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { clockTimeToMinutes, formatClock, toLocalDate, weekdayName, dayOfWeek, type ClockTime } from '@/domain/dates';
import { formatMinutes, weeklyFocusSummary } from '@/domain/focus/focus-history';
import { clampMinutes, formatCountdown, remainingMs } from '@/domain/focus/focus-timer';
import { useAuth } from '@/state/auth-store';
import { useClock } from '@/state/clock';
import { useConnections } from '@/state/connections-store';
import { useFocus } from '@/state/focus-store';
import { useNotifications } from '@/state/notifications-store';
import { usePreferences } from '@/state/preferences-store';
import { useTasks } from '@/state/tasks-store';
import { colors, radius, space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { Screen } from '@/ui/screen';
import { Section } from '@/ui/section';
import { TextField } from '@/ui/text-field';
import { Text } from '@/ui/text';

const PRESETS = [15, 25, 45, 60];

export default function FocusScreen() {
  const focus = useFocus();
  const active = focus.timer.status === 'running' || focus.timer.status === 'paused';
  const now = useClock(focus.timer.status === 'running' ? 1000 : 60_000);

  return (
    <Screen title="Focus" subtitle={active ? undefined : 'One thing at a time.'}>
      {focus.timer.status === 'idle' ? <StartSession /> : <ActiveSession now={now} />}
      <Insights now={now} />
      <AttentionSettings />
    </Screen>
  );
}

function StartSession() {
  const params = useLocalSearchParams<{ taskId?: string }>();
  const { getTask } = useTasks();
  const { start } = useFocus();
  const notifications = useNotifications();
  const { preferences } = usePreferences();
  const [intention, setIntention] = useState('');
  const [minutes, setMinutes] = useState(preferences.defaultFocusMinutes);

  // Pre-fill from "Start focusing" on the Today screen (adjusting state during render when the param changes).
  const [seenTaskId, setSeenTaskId] = useState<string | undefined>(undefined);
  if (params.taskId !== seenTaskId) {
    setSeenTaskId(params.taskId);
    const task = params.taskId ? getTask(params.taskId) : undefined;
    if (task) setIntention(task.title);
  }

  return (
    <Card style={styles.startCard}>
      <TextField label="What will you focus on?" placeholder="Optional" value={intention} onChangeText={setIntention} returnKeyType="done" />
      <Text variant="label" muted>
        Length
      </Text>
      <View style={styles.presets}>
        {PRESETS.map((m) => (
          <Button key={m} compact tone={m === minutes ? 'primary' : 'secondary'} label={`${m} min`} onPress={() => setMinutes(m)} />
        ))}
      </View>
      <View style={styles.stepper}>
        <Button compact tone="quiet" label="− 5" accessibilityHint="Five minutes shorter" onPress={() => setMinutes((m) => clampMinutes(m - 5))} />
        <Text variant="title" accessibilityLiveRegion="polite">
          {minutes} min
        </Text>
        <Button compact tone="quiet" label="+ 5" accessibilityHint="Five minutes longer" onPress={() => setMinutes((m) => clampMinutes(m + 5))} />
      </View>
      <Button
        label="Start focus session"
        onPress={() => {
          start(intention, minutes);
          // Asked here, when it's obviously useful: to tell you when the session ends.
          void notifications.requestIfNeeded();
        }}
      />
      <Text variant="small" muted>
        Intentional can&apos;t silence other apps yet. For fewer interruptions, turn on your phone&apos;s Focus or Do Not
        Disturb mode for this session.
      </Text>
    </Card>
  );
}

function ActiveSession({ now }: { now: Date }) {
  const { timer, pause, resume, stop, dismiss } = useFocus();
  if (timer.status === 'idle') return null;

  if (timer.status === 'finished') {
    return (
      <Card style={styles.timerCard}>
        <Text variant="title">Session complete</Text>
        <Text muted>
          {formatMinutes(Math.round(timer.durationMs / 60_000))}
          {timer.intention ? ` on "${timer.intention}"` : ''}. Stand up, look out a window, have some water.
        </Text>
        <Button label="Done" onPress={dismiss} />
      </Card>
    );
  }

  const left = remainingMs(timer, now.getTime());
  return (
    <Card style={styles.timerCard}>
      {timer.intention ? <Text muted>{timer.intention}</Text> : null}
      <Text style={styles.countdown} accessibilityRole="timer" accessibilityLabel={`${Math.ceil(left / 60_000)} minutes remaining`}>
        {formatCountdown(left)}
      </Text>
      <Text variant="small" muted>
        {timer.status === 'paused' ? 'Paused' : 'If you leave the app, the timer keeps counting.'}
      </Text>
      <View style={styles.row}>
        {timer.status === 'running' ? (
          <Button tone="secondary" label="Pause" onPress={pause} style={styles.flex} />
        ) : (
          <Button label="Resume" onPress={resume} style={styles.flex} />
        )}
        <Button tone="quiet" label="End early" onPress={stop} style={styles.flex} />
      </View>
    </Card>
  );
}

function Insights({ now }: { now: Date }) {
  const { history } = useFocus();
  const today = toLocalDate(now);
  const summary = weeklyFocusSummary(history, today);
  const max = Math.max(30, ...summary.minutesByDay.map((d) => d.minutes));

  return (
    <Section title="This week">
      <Card>
        {summary.sessionCount === 0 ? (
          <Text muted>No focus sessions yet this week.</Text>
        ) : (
          <>
            <Text variant="title">{formatMinutes(summary.totalMinutes)} focused</Text>
            <Text variant="small" muted>
              {summary.sessionCount} {summary.sessionCount === 1 ? 'session' : 'sessions'}, {summary.completedCount} completed in full
              {summary.changeFromLastWeek !== null && summary.changeFromLastWeek !== 0
                ? ` · ${formatMinutes(Math.abs(summary.changeFromLastWeek))} ${summary.changeFromLastWeek > 0 ? 'more' : 'less'} than last week`
                : ''}
            </Text>
          </>
        )}
        {summary.sessionCount === 0 ? null : (
        <View style={styles.bars} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {summary.minutesByDay.map((d) => (
            <View key={d.date} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: `${(d.minutes / max) * 100}%` }, d.date === today && styles.barToday]} />
              </View>
              <Text variant="small" muted style={styles.barLabel}>
                {weekdayName(dayOfWeek(d.date)).slice(0, 1)}
              </Text>
            </View>
          ))}
        </View>
        )}
        <Text variant="small" muted>
          Insights stay on this device. There are no streaks or scores here — rest days count too.
        </Text>
      </Card>
    </Section>
  );
}

function shiftTime(time: ClockTime, deltaMinutes: number): ClockTime {
  const total = (clockTimeToMinutes(time) + deltaMinutes + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function AttentionSettings() {
  const { preferences, updatePreferences } = usePreferences();
  const windows = preferences.communicationWindows;

  const setWindow = (i: number, start: ClockTime) =>
    updatePreferences({ communicationWindows: windows.map((w, j) => (j === i ? { ...w, start } : w)) });

  return (
    <Section title="Attention settings">
      <AccountLink />
      <NotificationSettings />
      <Card>
        <Text variant="heading">Communication windows</Text>
        <Text variant="small" muted>
          Set times to deal with messages. Outside them, only time-sensitive messages are shown.
        </Text>
        {windows.map((w, i) => (
          <View key={i} style={styles.windowRow}>
            <Button compact tone="quiet" label="Earlier" accessibilityHint="Moves this window 30 minutes earlier" onPress={() => setWindow(i, shiftTime(w.start, -30))} />
            <Text style={styles.flexCenter}>
              {formatClock(w.start)} · {w.durationMinutes} min
            </Text>
            <Button compact tone="quiet" label="Later" accessibilityHint="Moves this window 30 minutes later" onPress={() => setWindow(i, shiftTime(w.start, 30))} />
            <Button
              compact
              tone="danger"
              label="Remove"
              onPress={() => updatePreferences({ communicationWindows: windows.filter((_, j) => j !== i) })}
            />
          </View>
        ))}
        {windows.length < 4 ? (
          <Button
            compact
            tone="secondary"
            label="Add a window"
            style={styles.left}
            onPress={() =>
              updatePreferences({
                communicationWindows: [...windows, { start: windows.length ? shiftTime(windows[windows.length - 1]!.start, 180) : '09:00', durationMinutes: 30 }],
              })
            }
          />
        ) : null}
        <SettingSwitch
          label="Hold messages outside windows"
          value={preferences.holdMessagesOutsideWindows}
          onChange={(v) => updatePreferences({ holdMessagesOutsideWindows: v })}
        />
      </Card>

      <Card>
        <SettingSwitch
          label="Wind down in the evening"
          hint={preferences.windDownTime ? `After ${formatClock(preferences.windDownTime)}, Today stops suggesting work.` : 'Today will suggest work at any hour.'}
          value={preferences.windDownTime !== null}
          onChange={(v) => updatePreferences({ windDownTime: v ? '21:30' : null })}
        />
        {preferences.windDownTime ? (
          <View style={styles.windowRow}>
            <Button compact tone="quiet" label="Earlier" onPress={() => updatePreferences({ windDownTime: shiftTime(preferences.windDownTime!, -30) })} />
            <Text style={styles.flexCenter}>{formatClock(preferences.windDownTime)}</Text>
            <Button compact tone="quiet" label="Later" onPress={() => updatePreferences({ windDownTime: shiftTime(preferences.windDownTime!, 30) })} />
          </View>
        ) : null}
      </Card>

      <Card>
        <Text variant="heading">Default session length</Text>
        <View style={styles.presets}>
          {PRESETS.map((m) => (
            <Button key={m} compact tone={m === preferences.defaultFocusMinutes ? 'primary' : 'secondary'} label={`${m} min`} onPress={() => updatePreferences({ defaultFocusMinutes: m })} />
          ))}
        </View>
      </Card>

      <Card style={styles.platformCard}>
        <Text variant="heading">Blocking other apps</Text>
        <Text variant="small" muted>
          App limits and notification filtering need Apple Screen Time or Android Digital Wellbeing permissions. That
          will come in a later version, only with your consent. For now, your phone&apos;s Focus or Do Not Disturb
          settings work well alongside Intentional.
        </Text>
      </Card>
    </Section>
  );
}

function AccountLink() {
  const router = useRouter();
  const { session } = useAuth();
  const { google } = useConnections();
  return (
    <Card>
      <Text variant="heading">Account &amp; connections</Text>
      <Text variant="small" muted>
        {!session ? 'Not signed in. Using sample calendar and the on-device assistant.' : google === 'connected' ? 'Signed in · Google Calendar connected · Claude assistant' : 'Signed in · Claude assistant · Calendar not connected'}
      </Text>
      <Button compact tone="secondary" label="Manage" style={styles.left} onPress={() => router.push('/settings')} />
    </Card>
  );
}

function NotificationSettings() {
  const { permission, requestIfNeeded, scheduledCount } = useNotifications();
  const { preferences, updatePreferences } = usePreferences();
  const status =
    permission === 'granted'
      ? `On. ${scheduledCount} scheduled for the next week.`
      : permission === 'denied'
        ? "Off in your phone's settings. Reminders will only appear in the app."
        : permission === 'unavailable'
          ? 'Not available in this preview. Use the app on a phone.'
          : 'Not turned on yet.';
  return (
    <Card>
      <Text variant="heading">Notifications</Text>
      <Text variant="small" muted>
        {status} Intentional only notifies you about things you asked for — never to bring you back into the app.
      </Text>
      {permission === 'undetermined' ? <Button compact tone="secondary" label="Turn on notifications" style={styles.left} onPress={() => void requestIfNeeded()} /> : null}
      <Text variant="small" muted>
        Always: reminders and the end of a focus session.
      </Text>
      <SettingSwitch
        label="When time you set aside begins"
        value={preferences.notifyTimeBlocks}
        onChange={(v) => updatePreferences({ notifyTimeBlocks: v })}
      />
      <SettingSwitch
        label="When a message window opens"
        value={preferences.notifyCommunicationWindows}
        onChange={(v) => updatePreferences({ notifyCommunicationWindows: v })}
      />
      <Text variant="small" muted>
        Nothing for windows or set-aside time after your wind-down time.
      </Text>
    </Card>
  );
}

function SettingSwitch({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.flex}>
        <Text>{label}</Text>
        {hint ? (
          <Text variant="small" muted>
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.accent, false: colors.line }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  startCard: { gap: space.md },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timerCard: { alignItems: 'center', gap: space.md, paddingVertical: space.xxl },
  countdown: { fontSize: 64, lineHeight: 72, fontWeight: '300', fontVariant: ['tabular-nums'], color: colors.text },
  row: { flexDirection: 'row', gap: space.sm, alignSelf: 'stretch' },
  flex: { flex: 1 },
  flexCenter: { flex: 1, textAlign: 'center' },
  left: { alignSelf: 'flex-start' },
  bars: { flexDirection: 'row', gap: space.sm, height: 80, marginVertical: space.sm },
  barCol: { flex: 1, alignItems: 'center', gap: space.xs },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', backgroundColor: colors.surfaceSunken, borderRadius: radius.sm, overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: colors.accentSoft },
  barToday: { backgroundColor: colors.accent },
  barLabel: { fontSize: 12 },
  windowRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
  platformCard: { backgroundColor: colors.surfaceSunken },
});
