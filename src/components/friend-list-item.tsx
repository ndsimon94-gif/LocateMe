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
        { borderColor: theme.line, opacity: pressed ? 0.7 : 1 },
      ]}>
      <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
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
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 18,
  },
});
