import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { LocationPicker, type LocationSelection } from '@/components/location-picker';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type DraftStop = {
  key: string;
  destination: LocationSelection & { level: 'city' };
  startDate: string;
  endDate: string;
};

export default function AddTripScreen() {
  const { session } = useAuth();
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [stops, setStops] = useState<DraftStop[]>([]);
  const [destination, setDestination] = useState<LocationSelection | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleAddStop() {
    setError(null);
    if (!destination || destination.level !== 'city') {
      setError('Pick a destination first.');
      return;
    }
    if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) {
      setError('Use YYYY-MM-DD for both dates.');
      return;
    }
    if (endDate < startDate) {
      setError("This stop can't end before it starts.");
      return;
    }

    setStops((prev) => [
      ...prev,
      { key: `${Date.now()}`, destination: { ...destination, level: 'city' }, startDate, endDate },
    ]);
    setDestination(null);
    setStartDate('');
    setEndDate('');
  }

  function handleRemoveStop(key: string) {
    setStops((prev) => prev.filter((stop) => stop.key !== key));
  }

  async function handleSave() {
    setError(null);
    if (!session || stops.length === 0) {
      setError('Add at least one stop first.');
      return;
    }

    setSaving(true);
    const { data: itinerary, error: itineraryError } = await supabase
      .from('trip_itineraries')
      .insert({ owner_id: session.user.id, title: title.trim() || null })
      .select('id')
      .single();

    if (itineraryError || !itinerary) {
      setSaving(false);
      setError(itineraryError?.message ?? 'Could not save this trip.');
      return;
    }

    const { error: stopsError } = await supabase.from('trip_stops').insert(
      stops.map((stop) => ({
        itinerary_id: itinerary.id,
        city_id: stop.destination.cityId,
        country_code: stop.destination.countryCode,
        start_date: stop.startDate,
        end_date: stop.endDate,
      })),
    );
    setSaving(false);

    if (stopsError) {
      setError(stopsError.message);
      return;
    }
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ThemedText type="title" style={styles.title}>
            Add a trip
          </ThemedText>

          <TextField
            label="Trip name (optional)"
            value={title}
            onChangeText={setTitle}
            placeholder="Backpacking Southeast Asia"
          />

          {stops.length > 0 && (
            <View style={styles.stopList}>
              {stops.map((stop) => (
                <View
                  key={stop.key}
                  style={[styles.stopRow, { backgroundColor: theme.backgroundElement, shadowColor: theme.text }]}>
                  <View style={styles.stopBody}>
                    <ThemedText style={styles.stopDest}>
                      {stop.destination.cityName}, {stop.destination.countryName}
                    </ThemedText>
                    <ThemedText themeColor="textSecondary" style={styles.stopDates}>
                      {stop.startDate} – {stop.endDate}
                    </ThemedText>
                  </View>
                  <Button label="Remove" variant="ghost" onPress={() => handleRemoveStop(stop.key)} />
                </View>
              ))}
            </View>
          )}

          <View style={[styles.newStop, { borderColor: theme.line }]}>
            <ThemedText style={styles.sectionLabel}>
              {stops.length > 0 ? 'Add another stop' : 'Where to?'}
            </ThemedText>

            {destination ? (
              <View style={styles.destinationRow}>
                <TextField
                  label="Destination"
                  value={
                    destination.level === 'city'
                      ? `${destination.cityName}, ${destination.countryName}`
                      : destination.countryName
                  }
                  editable={false}
                  style={styles.destinationField}
                />
                <Button label="Change" variant="ghost" onPress={() => setDestination(null)} />
              </View>
            ) : (
              <LocationPicker mode="city" onSelect={setDestination} />
            )}

            <TextField
              label="Start date"
              value={startDate}
              onChangeText={setStartDate}
              placeholder="2027-03-03"
            />
            <TextField
              label="End date"
              value={endDate}
              onChangeText={setEndDate}
              placeholder="2027-03-10"
            />

            <Button label="+ Add this stop" variant="outline" onPress={handleAddStop} />
          </View>

          <ThemedText themeColor="textSecondary" style={styles.helper}>
            We&rsquo;ll check who else will be around — quietly. No one&rsquo;s notified but you.
          </ThemedText>

          {error ? (
            <ThemedText themeColor="danger" style={styles.error}>
              {error}
            </ThemedText>
          ) : null}

          <Button label="Save trip" onPress={handleSave} loading={saving} />
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  stopList: {
    gap: Spacing.two,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: Spacing.three,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  stopBody: {
    flex: 1,
    gap: 2,
  },
  stopDest: {
    fontSize: 15,
    fontWeight: '700',
  },
  stopDates: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  newStop: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  destinationField: {
    flex: 1,
  },
  helper: {
    fontSize: 13,
  },
  error: {
    fontSize: 13,
  },
});
