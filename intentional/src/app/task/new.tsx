import { useLocalSearchParams, useRouter } from 'expo-router';

import { isLocalDate, toLocalDate } from '@/domain/dates';
import { useTasks } from '@/state/tasks-store';
import { ModalScreen } from '@/ui/modal-screen';
import { TaskForm } from '@/ui/task-form';

export default function NewTaskScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const { addTask } = useTasks();
  const today = toLocalDate(new Date());

  return (
    <ModalScreen title="New task">
      <TaskForm
        today={today}
        submitLabel="Add task"
        initial={{ title: '', notes: '', kind: 'task', dueDate: date && isLocalDate(date) ? date : null, dueTime: '', isPriority: false }}
        onSubmit={(draft) => {
          const r = addTask(draft);
          if (!r.ok) return r.error;
          router.back();
          return null;
        }}
      />
    </ModalScreen>
  );
}
