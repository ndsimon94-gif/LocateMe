import { Link, router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { FriendListItem } from '@/components/friend-list-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useFriendsWithLocation } from '@/hooks/use-friends-with-location';

export default function FriendsScreen() {
  const theme = useTheme();
  const { friends, isLoading, refresh } = useFriendsWithLocation();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Friends
          </ThemedText>
          <Pressable
            onPress={() => router.push('/(app)/connect')}
            style={[styles.addButton, { backgroundColor: theme.backgroundSelected }]}
            accessibilityLabel="Add a friend">
            <Text style={[styles.addButtonLabel, { color: theme.accent }]}>+</Text>
          </Pressable>
        </View>

        {!isLoading && friends.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              Your orbit is empty
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.emptyBody}>
              Scan a friend&rsquo;s code to add your first connection.
            </ThemedText>
            <Link href="/(app)/connect" asChild>
              <Button label="Show my code" />
            </Link>
          </View>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.friendship_id}
            contentContainerStyle={styles.list}
            onRefresh={refresh}
            refreshing={isLoading}
            renderItem={({ item }) => (
              <FriendListItem
                friend={item}
                onPress={() => router.push(`/(app)/friend/${item.friendship_id}`)}
              />
            )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  title: {
    textAlign: 'left',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonLabel: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  list: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.five,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyBody: {
    textAlign: 'center',
  },
});
