import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FriendListItem } from '@/components/friend-list-item';
import { LeafletPinMap } from '@/components/leaflet-pin-map';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFriendsWithLocation } from '@/hooks/use-friends-with-location';
import { useTheme } from '@/hooks/use-theme';
import { groupFriendsByLocation, type LocationGroup } from '@/lib/geo';

type PinnedGroup = LocationGroup & { count: number };

export default function MapScreen() {
  const theme = useTheme();
  const { friends } = useFriendsWithLocation();
  const groups = useMemo(
    () =>
      groupFriendsByLocation(friends).map((group) => ({ ...group, count: group.friends.length })),
    [friends],
  );
  const [selected, setSelected] = useState<PinnedGroup | null>(null);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.mapWrap}>
        <LeafletPinMap
          groups={groups}
          onSelect={setSelected}
          pinColor={theme.accentStrong}
          pinTextColor={theme.backgroundElement}
        />
      </View>

      {selected && (
        <SafeAreaView style={styles.sheetWrap} pointerEvents="box-none">
          <View
            style={[styles.sheet, { backgroundColor: theme.backgroundElement, borderColor: theme.line }]}>
            <View style={styles.sheetHeader}>
              <ThemedText style={styles.sheetTitle}>{selected.label}</ThemedText>
              <Text
                onPress={() => setSelected(null)}
                style={[styles.close, { color: theme.textSecondary }]}>
                Close
              </Text>
            </View>
            <ScrollView style={styles.sheetList}>
              {selected.friends.map((friend) => (
                <FriendListItem
                  key={friend.friendship_id}
                  friend={friend}
                  onPress={() => {
                    setSelected(null);
                    router.push(`/(app)/friend/${friend.friendship_id}`);
                  }}
                />
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapWrap: { flex: 1 },
  sheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    margin: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    maxHeight: 320,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sheetList: {
    maxHeight: 260,
  },
  close: {
    fontSize: 13,
  },
});
