import { StyleSheet, View } from 'react-native';

import type { CalendarEvent } from '@/domain/calendar';
import { formatTimeOfDate } from '@/domain/dates';
import { usePlans } from '@/state/plans-store';
import { colors, space } from '@/theme/tokens';

import { Button } from './button';
import { Text } from './text';

/** A calendar event, or time set aside in Intentional (origin 'intentional'). */
export function EventRow({ event, past, removable }: { event: CalendarEvent; past?: boolean; removable?: boolean }) {
  const { removeBlock } = usePlans();
  const start = new Date(event.start);
  const end = new Date(event.end);
  const isBlock = event.origin === 'intentional';
  return (
    <View
      style={[styles.row, past && styles.past]}
      accessible={!(isBlock && removable)}
      accessibilityLabel={`${event.title}, ${formatTimeOfDate(start)} to ${formatTimeOfDate(end)}${event.location ? `, ${event.location}` : ''}${event.isMock ? ', sample event' : ''}${isBlock ? ', set aside in Intentional' : ''}`}>
      <View style={styles.time}>
        <Text variant="small" muted>
          {event.allDay ? 'All day' : formatTimeOfDate(start)}
        </Text>
      </View>
      <View style={[styles.bar, isBlock && styles.blockBar]} />
      <View style={styles.body}>
        <Text>{event.title}</Text>
        {event.location ? (
          <Text variant="small" muted>
            {event.location}
          </Text>
        ) : null}
        {isBlock ? (
          <Text variant="small" style={{ color: colors.accent }}>
            Set aside · until {formatTimeOfDate(end)}
          </Text>
        ) : null}
      </View>
      {isBlock && removable ? (
        <Button compact tone="quiet" label="Remove" accessibilityHint={`Removes ${event.title} from your plan`} onPress={() => removeBlock(event.id.replace(/^block:/, ''))} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, paddingVertical: space.xs, alignItems: 'flex-start' },
  past: { opacity: 0.5 },
  time: { width: 64, paddingTop: 2 },
  bar: { width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: colors.accentSoft },
  blockBar: { backgroundColor: colors.accent },
  body: { flex: 1, gap: 2 },
});
