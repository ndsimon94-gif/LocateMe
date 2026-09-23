import { router } from 'expo-router';
import { useState } from 'react';
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
  const [place, setPlace] = useState<LocationSelection | null>(null);
  const { results, isLoading, search } = usePlaceSearch();

  function handleSelect(selection: LocationSelection) {
    setPlace(selection);
    search(selection.countryCode);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ThemedText type="title" style={styles.title}>
            Your Orbit
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            Type a country and see who in your Orbit connects to it.
          </ThemedText>

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
