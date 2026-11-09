import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { toLocalDate } from '@/domain/dates';
import { useTasks } from '@/state/tasks-store';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { confirmDestructive } from '@/ui/confirm';
import { EmptyState } from '@/ui/empty-state';
import { ModalScreen } from '@/ui/modal-screen';
import { TaskForm } from '@/ui/task-form';
import { Text } from '@/ui/text';

export default function EditTaskScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getTask, updateTask, setCompleted, deleteTask } = useTasks();
  const task = getTask(id);
  const today = toLocalDate(new Date());

  if (!task) {
    return (
      <ModalScreen title="Task">
        <EmptyState title="This task no longer exists" action={<Button label="Close" onPress={() => router.back()} />} />
      </ModalScreen>
    );
  }

  const done = task.completedAt !== null;

  const confirmDelete = () =>
    confirmDestructive('Delete this task?', `"${task.title}" will be removed.`, 'Delete', () => {
      router.back();
      deleteTask(task.id);
    });

  return (
    <ModalScreen title={done ? 'Completed task' : 'Edit task'}>
      <TaskForm
        key={task.id}
        today={today}
        submitLabel="Save"
        initial={{
          title: task.title,
          notes: task.notes,
          kind: task.kind,
          dueDate: task.dueDate,
          dueTime: task.dueTime ?? '',
          isPriority: task.isPriority,
        }}
        onSubmit={(draft) => {
          const r = updateTask(task.id, draft);
          if (!r.ok) return r.error;
          router.back();
          return null;
        }}
      />
      <View style={styles.actions}>
        <Button
          tone="secondary"
          label={done ? 'Mark not done' : 'Mark complete'}
          onPress={() => {
            setCompleted(task.id, !done);
            router.back();
          }}
        />
        <Button tone="danger" label="Delete" onPress={confirmDelete} />
      </View>
      {task.source !== 'manual' ? (
        <Text variant="small" muted>
          Created {task.source === 'assistant' ? 'by the assistant' : 'from a message'}.
        </Text>
      ) : null}
    </ModalScreen>
  );
}

const styles = StyleSheet.create({ actions: { gap: space.sm } });
