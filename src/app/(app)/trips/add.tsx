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
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default function AddTripScreen() {
  const { session } = useAuth();
  const [destination, setDestination] = useState<LocationSelection | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setError(null);
    if (!session || !destination || destination.level !== 'city') {
      setError('Pick a destination first.');
      return;
    }
    if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) {
      setError('Use YYYY-MM-DD for both dates.');
      return;
    }
    if (endDate < startDate) {
      setError("This trip can't end before it starts.");
      return;
    }

    setSaving(true);
    const { error: insertError } = await supabase.from('trips').insert({
      owner_id: session.user.id,
      city_id: destination.cityId,
      country_code: destination.countryCode,
      start_date: startDate,
      end_date: endDate,
    });
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
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
