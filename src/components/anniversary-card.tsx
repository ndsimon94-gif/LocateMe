import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useFriendshipPhotos } from '@/hooks/use-friendship-photos';
import { useTheme } from '@/hooks/use-theme';
import type { Anniversary } from '@/lib/anniversaries';

const THUMB_SIZE = 64;

export function AnniversaryCard({ entry, years }: Anniversary) {
  const theme = useTheme();
  const { photos } = useFriendshipPhotos(entry.friendship_id);
  const name = entry.display_name ?? entry.username ?? 'Unknown';

  return (
    <Pressable
      onPress={() => router.push(`/(app)/friend/${entry.friendship_id}`)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundSelected, borderColor: theme.accent, opacity: pressed ? 0.9 : 1 },
      ]}>
      <Text style={[styles.headline, { color: theme.accent }]}>
        {years} year{years === 1 ? '' : 's'} ago today
      </Text>
      <Text style={[styles.body, { color: theme.text }]}>
        You met {name}
        {entry.connected_city_name ? ` in ${entry.connected_city_name}` : ''}.
      </Text>
      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
          {photos.map((photo) =>
            photo.url ? (
              <Image key={photo.id} source={{ uri: photo.url }} style={styles.thumb} contentFit="cover" />
            ) : null,
          )}
        </ScrollView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  headline: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  body: {
    fontSize: 15,
    fontWeight: '600',
  },
  photoRow: {
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
  },
});
