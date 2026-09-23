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
          <View style={styles.headerButtons}>
            <Pressable
              onPress={() => router.push('/(app)/ask')}
              style={({ pressed }) => [
                styles.askButton,
                { borderColor: theme.line, opacity: pressed ? 0.7 : 1 },
              ]}
              accessibilityLabel="Ask your Orbit">
              <Text style={[styles.askButtonLabel, { color: theme.textSecondary }]}>Ask</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(app)/connect')}
              style={({ pressed }) => [
                styles.addButton,
                {
                  backgroundColor: theme.accent,
                  shadowColor: theme.accent,
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                },
              ]}
              accessibilityLabel="Add a friend">
              <Text style={[styles.addButtonLabel, { color: theme.backgroundElement }]}>+</Text>
            </Pressable>
          </View>
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  askButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two - 2,
  },
  askButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  addButtonLabel: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
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
