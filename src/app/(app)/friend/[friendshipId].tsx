import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocationBadge } from '@/components/location-badge';
import { LoadingScreen } from '@/components/loading-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFriendsWithLocation } from '@/hooks/use-friends-with-location';
import { useTheme } from '@/hooks/use-theme';

export default function FriendDetailScreen() {
  const { friendshipId } = useLocalSearchParams<{ friendshipId: string }>();
  const theme = useTheme();
  const { friends, isLoading } = useFriendsWithLocation();
  const friend = friends.find((item) => item.friendship_id === friendshipId);

  if (isLoading) return <LoadingScreen />;
  if (!friend) return null;

  const name = friend.display_name ?? friend.username ?? 'Unknown';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.profile}>
          <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText style={[styles.avatarLabel, { color: theme.accent }]}>
              {name.slice(0, 2).toUpperCase()}
            </ThemedText>
          </View>
          <ThemedText type="subtitle">{name}</ThemedText>
          <LocationBadge
            sharingLevel={friend.sharing_level}
            countryName={friend.country_name}
            cityName={friend.city_name}
          />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    padding: Spacing.four,
  },
  profile: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.five,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontSize: 20,
    fontWeight: '700',
  },
});
