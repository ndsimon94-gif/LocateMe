import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FriendListItem } from '@/components/friend-list-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFriendsWithLocation } from '@/hooks/use-friends-with-location';
import { useTheme } from '@/hooks/use-theme';
import { groupFriendsByLocation, type LocationGroup } from '@/lib/geo';

export default function MapScreen() {
  const theme = useTheme();
  const { friends } = useFriendsWithLocation();
  const groups = groupFriendsByLocation(friends);
  const [selected, setSelected] = useState<LocationGroup | null>(null);

  return (
    <ThemedView style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: 20, longitude: 0, latitudeDelta: 90, longitudeDelta: 90 }}>
        {groups.map((group) => (
          <Marker
            key={group.key}
            coordinate={{ latitude: group.lat, longitude: group.lng }}
            onPress={() => setSelected(group)}>
            <View
              style={[
                styles.pin,
                { backgroundColor: theme.accentStrong, borderColor: theme.backgroundElement },
              ]}>
              <Text style={[styles.pinLabel, { color: theme.backgroundElement }]}>
                {group.friends.length}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {selected && (
        <SafeAreaView style={styles.sheetWrap} pointerEvents="box-none">
          <View style={[styles.sheet, { backgroundColor: theme.backgroundElement, borderColor: theme.line }]}>
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
  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
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
