import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CrossingPath } from '@/hooks/use-crossing-paths';
import { formatDateRange } from '@/lib/format-date';

type CrossingPathCardProps = {
  path: CrossingPath;
  onDismiss: () => void;
  onHide: () => void;
};

export function CrossingPathCard({ path, onDismiss, onHide }: CrossingPathCardProps) {
  const theme = useTheme();

  function handleMessage() {
    const draft = `Hey ${path.friend_name}! Looks like I'll be in ${path.city_name} ${formatDateRange(path.my_start_date, path.my_end_date)}. Would be great to see you if you're around.`;
    onDismiss();
    router.push({ pathname: `/(app)/chat/${path.friendship_id}`, params: { draft } });
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, shadowColor: theme.text }]}>
      <Pressable onPress={() => router.push(`/(app)/friend/${path.friendship_id}`)}>
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

      <View style={styles.actions}>
        <Pressable onPress={handleMessage}>
          <Text style={[styles.actionLabel, { color: theme.accent }]}>
            Let {path.friend_name} know
          </Text>
        </Pressable>
        <Pressable onPress={onDismiss}>
          <Text style={[styles.actionLabel, { color: theme.textSecondary }]}>Maybe later</Text>
        </Pressable>
        <Pressable onPress={onHide}>
          <Text style={[styles.actionLabel, { color: theme.textSecondary }]}>Hide</Text>
        </Pressable>
      </View>
    </View>
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
  actions: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
