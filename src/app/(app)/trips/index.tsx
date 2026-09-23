import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { HistoryMap } from '@/components/history-map';
import { SegmentedControl } from '@/components/segmented-control';
import { StampRow } from '@/components/stamp-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TripCard } from '@/components/trip-card';
import { Spacing } from '@/constants/theme';
import { useFriendshipHistory } from '@/hooks/use-friendship-history';
import { useItineraries } from '@/hooks/use-itineraries';
import { formatDate, formatDateRange } from '@/lib/format-date';
import { groupStopsByItinerary } from '@/lib/itineraries';

type Segment = 'upcoming' | 'history';
type HistoryView = 'list' | 'map';

const SEGMENT_OPTIONS: { label: string; value: Segment }[] = [
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'History', value: 'history' },
];

const HISTORY_VIEW_OPTIONS: { label: string; value: HistoryView }[] = [
  { label: 'List', value: 'list' },
  { label: 'Map', value: 'map' },
];

export default function TripsScreen() {
  const [segment, setSegment] = useState<Segment>('upcoming');
  const [historyView, setHistoryView] = useState<HistoryView>('list');
  const { stops, isLoading, refresh } = useItineraries();
  const itineraries = useMemo(() => groupStopsByItinerary(stops), [stops]);
  const {
    entries: historyEntries,
    isLoading: historyLoading,
    refresh: refreshHistory,
  } = useFriendshipHistory();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Trips
        </ThemedText>

        <View style={styles.segmentWrap}>
          <SegmentedControl options={SEGMENT_OPTIONS} value={segment} onChange={setSegment} />
        </View>

        {segment === 'upcoming' ? (
          <View style={styles.body}>
            {!isLoading && itineraries.length === 0 ? (
              <View style={styles.empty}>
                <ThemedText type="subtitle" style={styles.emptyTitle}>
                  No trips yet
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.emptyBody}>
                  Add one, and we&rsquo;ll quietly check who else will be around.
                </ThemedText>
              </View>
            ) : (
              <ScrollView
                style={styles.listFlex}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} />}>
                {itineraries.map((itinerary) => (
                  <View key={itinerary.itineraryId} style={styles.itineraryGroup}>
                    {itinerary.title && (
                      <ThemedText style={styles.itineraryTitle}>{itinerary.title}</ThemedText>
                    )}
                    <View style={styles.stopList}>
                      {itinerary.stops.map((stop) => (
                        <TripCard
                          key={stop.stop_id}
                          destination={`${stop.city_name}, ${stop.country_name}`}
                          dateRange={formatDateRange(stop.start_date, stop.end_date)}
                          connections={stop.connections}
                        />
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
            <Link href="/(app)/trips/add" asChild>
              <Button label="+ Add a trip" variant="outline" />
            </Link>
          </View>
        ) : !historyLoading && historyEntries.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              Nothing here yet
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.emptyBody}>
              Every friend you connect with gets a stamp, in order.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.body}>
            <SegmentedControl
              options={HISTORY_VIEW_OPTIONS}
              value={historyView}
              onChange={setHistoryView}
            />
            {historyView === 'list' ? (
              <FlatList
                style={styles.listFlex}
                data={historyEntries}
                keyExtractor={(item) => item.friendship_id}
                contentContainerStyle={styles.list}
                onRefresh={refreshHistory}
                refreshing={historyLoading}
                renderItem={({ item }) => (
                  <StampRow
                    name={item.display_name ?? item.username ?? 'Unknown'}
                    whereAndWhen={
                      item.connected_city_name
                        ? `${item.connected_city_name} · ${formatDate(item.created_at)}`
                        : formatDate(item.created_at)
                    }
                  />
                )}
              />
            ) : (
              <HistoryMap entries={historyEntries} />
            )}
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  title: {
    textAlign: 'left',
  },
  segmentWrap: {
    marginTop: Spacing.three,
    marginBottom: Spacing.three,
  },
  body: {
    flex: 1,
    gap: Spacing.three,
  },
  listFlex: {
    flex: 1,
  },
  list: {
    paddingBottom: Spacing.two,
  },
  itineraryGroup: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  itineraryTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  stopList: {
    gap: Spacing.two,
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
