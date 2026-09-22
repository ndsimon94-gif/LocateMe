import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { FriendshipHistoryEntry } from '@/hooks/use-friendship-history';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/lib/format-date';
import { groupHistoryByLocation, type MeetingGroup } from '@/lib/history-geo';

type HistoryMapProps = {
  entries: FriendshipHistoryEntry[];
};

export function HistoryMap({ entries }: HistoryMapProps) {
  const theme = useTheme();
  const groups = groupHistoryByLocation(entries);
  const [selected, setSelected] = useState<MeetingGroup | null>(null);

  if (groups.length === 0) {
    return (
      <View style={styles.empty}>
        <ThemedText themeColor="textSecondary" style={styles.emptyText}>
          No meeting places captured yet.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: 20, longitude: 0, latitudeDelta: 90, longitudeDelta: 90 }}>
        {groups.map((group) => (
          <Marker
            key={group.key}
            coordinate={{ latitude: group.lat, longitude: group.lng }}
            onPress={() => setSelected(group)}>
            <View style={[styles.pin, { backgroundColor: theme.brass, borderColor: theme.backgroundElement }]}>
              <Text style={[styles.pinLabel, { color: theme.backgroundElement }]}>
                {group.entries.length}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {selected && (
        <View style={styles.sheetWrap} pointerEvents="box-none">
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
              {selected.entries.map((entry) => (
                <Pressable
                  key={entry.friendship_id}
                  style={[styles.entryRow, { borderColor: theme.line }]}
                  onPress={() => {
                    setSelected(null);
                    router.push(`/(app)/friend/${entry.friendship_id}`);
                  }}>
                  <ThemedText style={styles.entryName}>
                    {entry.display_name ?? entry.username ?? 'Unknown'}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.entryDate}>
                    {formatDate(entry.created_at)}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const PIN_SIZE = 28;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  pin: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
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
    maxHeight: 280,
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
    maxHeight: 220,
  },
  entryRow: {
    paddingVertical: Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  entryName: {
    fontSize: 14,
    fontWeight: '600',
  },
  entryDate: {
    fontSize: 12,
  },
  close: {
    fontSize: 13,
  },
});
