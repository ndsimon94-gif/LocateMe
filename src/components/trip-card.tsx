import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ItineraryStop } from '@/lib/itineraries';

type Connection = ItineraryStop['connections'][number];

type TripCardProps = {
  destination: string;
  dateRange: string;
  connections: Connection[];
  onPress?: () => void;
};

const REASON_LABEL: Record<Connection['reason'], string> = {
  'currently there': 'is there now',
  'lives there': 'is based there',
  'visiting then': 'will be visiting too',
};

export function TripCard({ destination, dateRange, connections, onPress }: TripCardProps) {
  const theme = useTheme();
  const hasConnections = connections.length > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, shadowColor: theme.text, opacity: pressed ? 0.9 : 1 },
      ]}>
      <Text style={[styles.dest, { color: theme.text }]}>{destination}</Text>
      <Text style={[styles.dates, { color: theme.textSecondary }]}>{dateRange}</Text>

      {hasConnections ? (
        <View style={styles.connections}>
          {connections.map((c) => (
            <View
              key={`${c.name}-${c.reason}`}
              style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
              <Text style={[styles.badgeLabel, { color: theme.accent }]}>
                {c.name} {REASON_LABEL[c.reason]}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.badge, styles.emptyBadge, { borderColor: theme.line }]}>
          <Text style={[styles.badgeLabel, { color: theme.textSecondary }]}>
            No connections there yet.
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.one,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  dest: {
    fontSize: 16,
    fontWeight: '700',
  },
  dates: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  connections: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  emptyBadge: {
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: Spacing.one,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
