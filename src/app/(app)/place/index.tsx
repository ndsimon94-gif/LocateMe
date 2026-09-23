import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { LocationPicker, type LocationSelection } from '@/components/location-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePlaceSearch } from '@/hooks/use-place-search';
import { formatDate } from '@/lib/format-date';
import type { PlaceReason } from '@/types/database';

function reasonLabel(reason: PlaceReason): string {
  switch (reason.type) {
    case 'lives_there':
      return 'Lives here';
    case 'currently_there':
      return 'Currently here';
    case 'upcoming_trip':
      return `Arriving ${formatDate(reason.date)}`;
    case 'met_there':
      return 'You met here';
    case 'past_trip':
      return `Was here until ${formatDate(reason.date)}`;
  }
}

export default function PlaceSearchScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ countryCode?: string; countryName?: string; cityName?: string }>();
  const [place, setPlace] = useState<LocationSelection | null>(null);
  const { results, isLoading, search } = usePlaceSearch();

  useEffect(() => {
    if (params.countryCode && params.countryName) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlace({ level: 'country', countryCode: params.countryCode, countryName: params.countryName });
      search(params.countryCode);
    }
    // Only meant to run once, from whatever params this screen was opened
    // with — not a live subscription to further param changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    if (!results) return null;
    const livesCount = results.filter((r) => r.reasons.some((x) => x.type === 'lives_there')).length;
    const currentlyCount = results.filter((r) =>
      r.reasons.some((x) => x.type === 'currently_there'),
    ).length;
    const arriving = results.filter((r) => r.reasons.some((x) => x.type === 'upcoming_trip'));
    const pastCount = results.filter((r) => r.reasons.some((x) => x.type === 'past_trip')).length;
    if (livesCount === 0 && currentlyCount === 0 && arriving.length === 0 && pastCount === 0) return null;
    return { livesCount, currentlyCount, arrivingCount: arriving.length, pastCount };
  }, [results]);

  function handleSelect(selection: LocationSelection) {
    setPlace(selection);
    search(selection.countryCode);
  }

  const displayName = params.cityName ?? place?.countryName;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ThemedText type="title" style={styles.title}>
            {displayName ? `Your Orbit in ${displayName}` : 'Your Orbit'}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            Type a country and see who in your Orbit connects to it.
          </ThemedText>

          {summary && (
            <View style={[styles.summary, { backgroundColor: theme.backgroundSelected }]}>
              {summary.livesCount > 0 && (
                <Text style={[styles.summaryLine, { color: theme.text }]}>
                  {summary.livesCount} friend{summary.livesCount === 1 ? '' : 's'} live{summary.livesCount === 1 ? 's' : ''} here
                </Text>
              )}
              {summary.currentlyCount > 0 && (
                <Text style={[styles.summaryLine, { color: theme.text }]}>
                  {summary.currentlyCount} friend{summary.currentlyCount === 1 ? '' : 's'} {summary.currentlyCount === 1 ? 'is' : 'are'} currently here
                </Text>
              )}
              {summary.arrivingCount > 0 && (
                <Text style={[styles.summaryLine, { color: theme.text }]}>
                  {summary.arrivingCount} friend{summary.arrivingCount === 1 ? '' : 's'} arriving soon
                </Text>
              )}
              {summary.pastCount > 0 && (
                <Text style={[styles.summaryLine, { color: theme.text }]}>
                  {summary.pastCount} friend{summary.pastCount === 1 ? '' : 's'} spent time here before
                </Text>
              )}
            </View>
          )}

          {place ? (
            <View style={styles.placeRow}>
              <ThemedText type="subtitle">{place.countryName}</ThemedText>
              <Button label="Change" variant="ghost" onPress={() => setPlace(null)} />
            </View>
          ) : (
            <LocationPicker mode="country" onSelect={handleSelect} />
          )}

          {place && !isLoading && results && results.length === 0 && (
            <View style={styles.empty}>
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                Nobody in your Orbit connects to {place.countryName} yet.
              </ThemedText>
            </View>
          )}

          {results && results.length > 0 && (
            <View style={styles.resultList}>
              {results.map((result) => (
                <Pressable
                  key={result.friend_id}
                  onPress={() => router.push(`/(app)/friend/${result.friendship_id}`)}
                  style={({ pressed }) => [
                    styles.resultCard,
                    { backgroundColor: theme.backgroundElement, shadowColor: theme.text, opacity: pressed ? 0.9 : 1 },
                  ]}>
                  <Text style={[styles.resultName, { color: theme.text }]}>{result.name}</Text>
                  <View style={styles.reasonRow}>
                    {result.reasons.map((reason) => (
                      <View
                        key={reason.type}
                        style={[styles.reasonBadge, { backgroundColor: theme.backgroundSelected }]}>
                        <Text style={[styles.reasonLabel, { color: theme.accent }]}>
                          {reasonLabel(reason)}
                        </Text>
                      </View>
                    ))}
                  </View>
                  {result.met_place && (
                    <Text style={[styles.metLine, { color: theme.textSecondary }]}>
                      Met in {result.met_place}
                      {result.met_at ? ` · ${formatDate(result.met_at)}` : ''}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 13,
    marginTop: -Spacing.two,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summary: {
    borderRadius: 16,
    padding: Spacing.three,
    gap: 4,
  },
  summaryLine: {
    fontSize: 14,
    fontWeight: '600',
  },
  empty: {
    paddingVertical: Spacing.five,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  resultList: {
    gap: Spacing.two,
  },
  resultCard: {
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.one,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '700',
  },
  reasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  reasonBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  metLine: {
    fontSize: 13,
    marginTop: 2,
  },
});
