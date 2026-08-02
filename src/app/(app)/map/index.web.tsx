import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FriendListItem } from '@/components/friend-list-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFriendsWithLocation } from '@/hooks/use-friends-with-location';

export default function MapScreen() {
  const { friends } = useFriendsWithLocation();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Map
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.helper}>
          The map needs the mobile app. Here&rsquo;s the same list, for now.
        </ThemedText>
        <View style={styles.list}>
          {friends.map((friend) => (
            <FriendListItem
              key={friend.friendship_id}
              friend={friend}
              onPress={() => router.push(`/(app)/friend/${friend.friendship_id}`)}
            />
          ))}
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
    gap: Spacing.two,
  },
  title: {
    textAlign: 'left',
  },
  helper: {
    fontSize: 13,
  },
  list: {
    marginTop: Spacing.two,
  },
});
