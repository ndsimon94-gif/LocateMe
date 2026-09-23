import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateRange } from '@/lib/format-date';
import type { CrossingPath } from '@/hooks/use-crossing-paths';

export function CrossingPathCard({ path }: { path: CrossingPath }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => router.push(`/(app)/friend/${path.friend_id}`)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, shadowColor: theme.text, opacity: pressed ? 0.9 : 1 },
      ]}>
      <Text style={[styles.headline, { color: theme.brass }]}>You might cross paths</Text>
      <Text style={[styles.city, { color: theme.text }]}>
        {path.city_name}, {path.country_name}
      </Text>
      <View style={styles.rangeRow}>
        <Text style={[styles.rangeLabel, { color: theme.textSecondary }]}>
          You: {formatDateRange(path.my_start_date, path.my_end_date)}
        </Text>
        <Text style={[styles.rangeLabel, { color: theme.textSecondary }]}>
          {path.friend_name}: {formatDateRange(path.friend_start_date, path.friend_end_date)}
        </Text>
      </View>
      <View style={[styles.overlapBadge, { backgroundColor: theme.backgroundSelected }]}>
        <Text style={[styles.overlapLabel, { color: theme.accent }]}>
          {path.overlap_days} day{path.overlap_days === 1 ? '' : 's'} together
        </Text>
      </View>
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
  headline: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  city: {
    fontSize: 16,
    fontWeight: '700',
  },
  rangeRow: {
    gap: 2,
  },
  rangeLabel: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  overlapBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: Spacing.one,
  },
  overlapLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
