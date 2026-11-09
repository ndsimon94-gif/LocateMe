import { StyleSheet, View } from 'react-native';

import type { CalendarEvent } from '@/domain/calendar';
import { formatTimeOfDate } from '@/domain/dates';
import { colors, space } from '@/theme/tokens';

import { Text } from './text';

export function EventRow({ event, past }: { event: CalendarEvent; past?: boolean }) {
  const start = new Date(event.start);
  const end = new Date(event.end);
  return (
    <View
      style={[styles.row, past && styles.past]}
      accessible
      accessibilityLabel={`${event.title}, ${formatTimeOfDate(start)} to ${formatTimeOfDate(end)}${event.location ? `, ${event.location}` : ''}${event.isMock ? ', sample event' : ''}`}>
      <View style={styles.time}>
        <Text variant="small" muted>
          {event.allDay ? 'All day' : formatTimeOfDate(start)}
        </Text>
      </View>
      <View style={styles.bar} />
      <View style={styles.body}>
        <Text>{event.title}</Text>
        {event.location ? (
          <Text variant="small" muted>
            {event.location}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, paddingVertical: space.xs, alignItems: 'flex-start' },
  past: { opacity: 0.5 },
  time: { width: 64, paddingTop: 2 },
  bar: { width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: colors.accentSoft },
  body: { flex: 1, gap: 2 },
});
