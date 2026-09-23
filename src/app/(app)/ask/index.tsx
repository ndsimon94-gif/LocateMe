import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useOrbitTextSearch } from '@/hooks/use-orbit-text-search';
import { useTheme } from '@/hooks/use-theme';
import type { OrbitTextMatch } from '@/types/database';

const FIELD_LABEL: Record<OrbitTextMatch['field'], string> = {
  name: 'Name',
  met: 'How you met',
  met_location: 'Where you met',
  note: 'Your note',
  tag: 'Tagged',
  recommendation: 'Recommended',
  home: 'Home base',
  hosting: 'Hosting note',
};

export default function AskOrbitScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const { results, isLoading } = useOrbitTextSearch(query);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ThemedText type="title" style={styles.title}>
            Ask your Orbit
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            Search your notes, tags, stories, and recommendations — private to you.
          </ThemedText>
          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder="Nepal, hiking, a place to stay…"
            autoFocus
          />

          {query.trim().length >= 2 && !isLoading && results && results.length === 0 && (
            <View style={styles.empty}>
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                Nothing matches yet.
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
                  {result.matches
                    .filter((m) => m.field !== 'name')
                    .map((match, index) => (
                      <View key={`${match.field}-${index}`} style={styles.matchRow}>
                        <Text style={[styles.matchField, { color: theme.accent }]}>
                          {FIELD_LABEL[match.field]}
                        </Text>
                        <Text style={[styles.matchSnippet, { color: theme.textSecondary }]} numberOfLines={2}>
                          {match.snippet}
                        </Text>
                      </View>
                    ))}
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
    gap: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '700',
  },
  matchRow: {
    gap: 1,
  },
  matchField: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  matchSnippet: {
    fontSize: 13,
  },
});
