import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LocationBadge } from '@/components/location-badge';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Database } from '@/types/database';

export type FriendWithLocation =
  Database['public']['Functions']['get_friends_with_location']['Returns'][number];

type FriendListItemProps = {
  friend: FriendWithLocation;
  onPress: () => void;
};

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function FriendListItem({ friend, onPress }: FriendListItemProps) {
  const theme = useTheme();
  const name = friend.display_name ?? friend.username ?? 'Unknown';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.backgroundElement,
          shadowColor: theme.text,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: pressed ? 0.9 : 1,
        },
      ]}>
      <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected, borderColor: theme.line }]}>
        <Text style={[styles.avatarLabel, { color: theme.accent }]}>{initials(name)}</Text>
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, { color: theme.text }]}>{name}</Text>
        <LocationBadge
          sharingLevel={friend.sharing_level}
          countryName={friend.country_name}
          cityName={friend.city_name}
        />
      </View>
      <Text style={[styles.chevron, { color: theme.textSecondary }]}>{'›'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 20,
  },
});
