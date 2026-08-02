import { Link } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { SegmentedControl } from '@/components/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TripCard } from '@/components/trip-card';
import { Spacing } from '@/constants/theme';
import { useUpcomingTrips } from '@/hooks/use-upcoming-trips';
import { formatDateRange } from '@/lib/format-date';

type Segment = 'upcoming' | 'history';

const SEGMENT_OPTIONS: { label: string; value: Segment }[] = [
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'History', value: 'history' },
];

export default function TripsScreen() {
  const [segment, setSegment] = useState<Segment>('upcoming');
  const { trips, isLoading, refresh } = useUpcomingTrips();

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
            {!isLoading && trips.length === 0 ? (
              <View style={styles.empty}>
                <ThemedText type="subtitle" style={styles.emptyTitle}>
                  No trips yet
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.emptyBody}>
                  Add one, and we&rsquo;ll quietly check who else will be around.
                </ThemedText>
              </View>
            ) : (
              <FlatList
                style={styles.listFlex}
                data={trips}
                keyExtractor={(item) => item.trip_id}
                contentContainerStyle={styles.list}
                onRefresh={refresh}
                refreshing={isLoading}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                renderItem={({ item }) => (
                  <TripCard
                    destination={`${item.city_name}, ${item.country_name}`}
                    dateRange={formatDateRange(item.start_date, item.end_date)}
                    overlapNames={item.overlap_friend_names}
                  />
                )}
              />
            )}
            <Link href="/(app)/trips/add" asChild>
              <Button label="+ Add a trip" variant="outline" />
            </Link>
          </View>
        ) : (
          <View style={styles.empty}>
            <ThemedText themeColor="textSecondary">History coming soon.</ThemedText>
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
  separator: {
    height: Spacing.two,
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
