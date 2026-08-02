import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TripCardProps = {
  destination: string;
  dateRange: string;
  overlapNames: string[];
};

export function TripCard({ destination, dateRange, overlapNames }: TripCardProps) {
  const theme = useTheme();
  const hasOverlap = overlapNames.length > 0;

  const badgeText = hasOverlap
    ? overlapNames.length === 1
      ? `${overlapNames[0]} will be there`
      : `${overlapNames[0]} & ${overlapNames.length - 1} other${overlapNames.length > 2 ? 's' : ''} will be there`
    : "You'll be the only one there, for now.";

  return (
    <View style={[styles.card, { borderColor: theme.line }]}>
      <Text style={[styles.dest, { color: theme.text }]}>{destination}</Text>
      <Text style={[styles.dates, { color: theme.textSecondary }]}>{dateRange}</Text>
      <View
        style={[
          styles.badge,
          hasOverlap
            ? { backgroundColor: theme.backgroundSelected }
            : { borderWidth: 1, borderStyle: 'dashed', borderColor: theme.line },
        ]}>
        <Text style={[styles.badgeLabel, { color: hasOverlap ? theme.accent : theme.textSecondary }]}>
          {badgeText}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  dest: {
    fontSize: 15,
    fontWeight: '600',
  },
  dates: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: Spacing.one,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
