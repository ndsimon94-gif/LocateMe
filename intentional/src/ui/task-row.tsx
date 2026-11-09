import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatClock, relativeDayLabel, type LocalDate } from '@/domain/dates';
import type { Task } from '@/domain/tasks/task';
import { useTasks } from '@/state/tasks-store';
import { colors, MIN_TOUCH, radius, space } from '@/theme/tokens';

import { Text } from './text';

interface Props {
  task: Task;
  today: LocalDate;
  /** Show the date (for lists spanning several days). */
  showDate?: boolean;
}

export function TaskRow({ task, today, showDate }: Props) {
  const router = useRouter();
  const { setCompleted } = useTasks();
  const done = task.completedAt !== null;
  const overdue = !done && task.dueDate !== null && task.dueDate < today;

  const meta: string[] = [];
  if (task.kind === 'reminder') meta.push('Reminder');
  if (showDate && task.dueDate) meta.push(relativeDayLabel(task.dueDate, today));
  if (task.dueTime) meta.push(formatClock(task.dueTime));
  if (overdue && !showDate && task.dueDate) meta.push(`from ${relativeDayLabel(task.dueDate, today)}`);
  if (task.isPriority) meta.push('Priority');

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={done ? `Mark "${task.title}" not done` : `Complete "${task.title}"`}
        onPress={() => setCompleted(task.id, !done)}
        hitSlop={8}
        style={styles.checkHit}>
        <View style={[styles.check, done && styles.checkDone]}>{done ? <Text style={styles.tick}>✓</Text> : null}</View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens the task to edit it"
        onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
        style={styles.body}>
        <Text style={done ? styles.doneText : undefined} numberOfLines={2}>
          {task.title}
        </Text>
        {meta.length > 0 ? (
          <Text variant="small" muted style={overdue ? { color: colors.warning } : undefined}>
            {meta.join(' · ')}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', minHeight: MIN_TOUCH },
  checkHit: { width: MIN_TOUCH, minHeight: MIN_TOUCH, justifyContent: 'center' },
  check: {
    width: 22,
    height: 22,
    borderRadius: radius.sm - 2,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: colors.accent },
  tick: { color: colors.onAccent, fontSize: 14, lineHeight: 16, fontWeight: '700' },
  body: { flex: 1, minHeight: MIN_TOUCH, justifyContent: 'center', paddingVertical: space.xs },
  doneText: { color: colors.textMuted, textDecorationLine: 'line-through' },
});
