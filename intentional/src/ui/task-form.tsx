import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { addDays, dayHeading, normalizeClockTime, type LocalDate } from '@/domain/dates';
import type { TaskDraft, TaskKind } from '@/domain/tasks/task';
import { colors, space } from '@/theme/tokens';

import { Button } from './button';
import { Segmented } from './segmented';
import { Text } from './text';
import { TextField } from './text-field';

export interface TaskFormValues {
  title: string;
  notes: string;
  kind: TaskKind;
  dueDate: LocalDate | null;
  dueTime: string;
  isPriority: boolean;
}

interface Props {
  initial: TaskFormValues;
  today: LocalDate;
  submitLabel: string;
  /** Returns an error message, or null on success. */
  onSubmit: (draft: TaskDraft) => string | null;
}

/** Shared create/edit form. Validation lives in the domain layer; this only collects input. */
export function TaskForm({ initial, today, submitLabel, onSubmit }: Props) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof TaskFormValues>(key: K, v: TaskFormValues[K]) => setValues((s) => ({ ...s, [key]: v }));

  const submit = () => {
    const time = values.dueTime.trim();
    const normalized = time ? normalizeClockTime(time) : null;
    if (time && !normalized) {
      setError('Use a time like 09:30 or 14:00.');
      return;
    }
    setError(
      onSubmit({
        title: values.title,
        notes: values.notes,
        kind: values.kind,
        dueDate: values.dueDate,
        dueTime: normalized,
        isPriority: values.isPriority,
      }),
    );
  };

  return (
    <View style={styles.form}>
      <TextField label="Title" value={values.title} onChangeText={(t) => set('title', t)} placeholder="What needs doing?" autoFocus={!initial.title} returnKeyType="done" onSubmitEditing={submit} maxLength={200} />

      <Segmented
        label="Type"
        value={values.kind}
        onChange={(k) => set('kind', k)}
        options={[
          { value: 'task', label: 'Task' },
          { value: 'reminder', label: 'Reminder' },
        ]}
      />

      <View style={styles.group}>
        <Text variant="label" muted>
          Day
        </Text>
        {values.dueDate ? (
          <View style={styles.dayRow}>
            <Button compact tone="quiet" label="‹" accessibilityHint="Previous day" onPress={() => set('dueDate', addDays(values.dueDate!, -1))} />
            <Text style={styles.dayLabel} accessibilityLiveRegion="polite">
              {dayHeading(values.dueDate, today)}
            </Text>
            <Button compact tone="quiet" label="›" accessibilityHint="Next day" onPress={() => set('dueDate', addDays(values.dueDate!, 1))} />
          </View>
        ) : (
          <Text muted>No day — it will wait in “Not yet planned”.</Text>
        )}
        <View style={styles.chips}>
          <Button compact tone={values.dueDate === today ? 'primary' : 'secondary'} label="Today" onPress={() => set('dueDate', today)} />
          <Button compact tone={values.dueDate === addDays(today, 1) ? 'primary' : 'secondary'} label="Tomorrow" onPress={() => set('dueDate', addDays(today, 1))} />
          <Button compact tone={values.dueDate === null ? 'primary' : 'secondary'} label="No day" onPress={() => setValues((s) => ({ ...s, dueDate: null, dueTime: '' }))} />
        </View>
      </View>

      {values.dueDate ? (
        <TextField label="Time (optional)" value={values.dueTime} onChangeText={(t) => set('dueTime', t)} placeholder="e.g. 14:30" keyboardType="numbers-and-punctuation" maxLength={5} />
      ) : null}

      {values.kind === 'reminder' ? (
        <Text variant="small" muted>
          Reminders show in your plan. Phone notifications aren&apos;t enabled in this prototype.
        </Text>
      ) : null}

      <View style={styles.switchRow}>
        <View style={styles.flex}>
          <Text>One of the day&apos;s three priorities</Text>
          <Text variant="small" muted>
            Shown first on Today.
          </Text>
        </View>
        <Switch accessibilityLabel="Priority" value={values.isPriority} onValueChange={(v) => set('isPriority', v)} trackColor={{ true: colors.accent, false: colors.line }} thumbColor={colors.surface} />
      </View>

      <TextField label="Notes" value={values.notes} onChangeText={(t) => set('notes', t)} multiline placeholder="Optional" maxLength={2000} />

      {error ? (
        <Text style={{ color: colors.danger }} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <Button label={submitLabel} onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
  group: { gap: space.sm },
  dayRow: { flexDirection: 'row', alignItems: 'center' },
  dayLabel: { flex: 1, textAlign: 'center' },
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1 },
});
