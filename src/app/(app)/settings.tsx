import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { LocationPicker, type LocationSelection } from '@/components/location-picker';
import { SegmentedControl } from '@/components/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type SharingLevel = 'off' | 'country' | 'city';

const LEVEL_OPTIONS: { label: string; value: SharingLevel }[] = [
  { label: 'Off', value: 'off' },
  { label: 'Country', value: 'country' },
  { label: 'City', value: 'city' },
];

const LEVEL_HELP: Record<SharingLevel, string> = {
  off: "Off — friends won't see any location for you.",
  country: 'Country — friends see something like France.',
  city: 'City — friends see something like Paris, France.',
};

export default function SettingsScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [currentLabel, setCurrentLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLabel() {
      if (!profile) return;
      if (profile.current_city_id) {
        const { data } = await supabase
          .from('cities')
          .select('name, countries ( name )')
          .eq('id', profile.current_city_id)
          .single();
        if (cancelled) return;
        const row = data as unknown as { name: string; countries: { name: string } | null } | null;
        setCurrentLabel(row ? `${row.name}, ${row.countries?.name ?? ''}` : null);
      } else if (profile.current_country_code) {
        const { data } = await supabase
          .from('countries')
          .select('name')
          .eq('code', profile.current_country_code)
          .single();
        if (cancelled) return;
        setCurrentLabel(data?.name ?? null);
      } else {
        setCurrentLabel(null);
      }
    }

    loadLabel();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  if (!session || !profile) return null;

  const level = profile.location_sharing_default;

  async function handleLevelChange(next: SharingLevel) {
    const patch: Partial<{
      location_sharing_default: SharingLevel;
      current_country_code: string | null;
      current_city_id: string | null;
    }> = { location_sharing_default: next };

    if (next === 'off') {
      patch.current_country_code = null;
      patch.current_city_id = null;
    }

    const shouldOpenPicker =
      next !== 'off' &&
      (next === 'city' ? !profile!.current_city_id : !profile!.current_country_code);

    await supabase
      .from('profiles')
      .update(patch)
      .eq('id', session!.user.id);
    await refreshProfile();
    setPickerOpen(shouldOpenPicker);
  }

  async function handleLocationSelect(selection: LocationSelection) {
    const patch =
      selection.level === 'city'
        ? {
            current_city_id: selection.cityId,
            current_country_code: selection.countryCode,
            location_updated_at: new Date().toISOString(),
          }
        : {
            current_country_code: selection.countryCode,
            current_city_id: null,
            location_updated_at: new Date().toISOString(),
          };

    await supabase.from('profiles').update(patch).eq('id', session!.user.id);
    await refreshProfile();
    setPickerOpen(false);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ThemedText type="title" style={styles.title}>
            Settings
          </ThemedText>

          <View style={styles.row}>
            <ThemedText style={styles.name}>{profile.display_name ?? profile.username}</ThemedText>
            <ThemedText themeColor="textSecondary">@{profile.username}</ThemedText>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>Share by default</ThemedText>
            <SegmentedControl options={LEVEL_OPTIONS} value={level} onChange={handleLevelChange} />
            <ThemedText themeColor="textSecondary" style={styles.help}>
              {LEVEL_HELP[level]}
            </ThemedText>

            {level !== 'off' && (
              <View style={styles.locationRow}>
                <ThemedText themeColor="textSecondary">
                  {currentLabel ? `Currently: ${currentLabel}` : 'Not set yet'}
                </ThemedText>
                <Button
                  label={currentLabel ? 'Change' : 'Set location'}
                  variant="outline"
                  onPress={() => setPickerOpen((open) => !open)}
                />
              </View>
            )}

            {pickerOpen && level !== 'off' && (
              <LocationPicker mode={level} onSelect={handleLocationSelect} />
            )}
          </View>

          <Button label="Log out" variant="ghost" onPress={() => supabase.auth.signOut()} />
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
    gap: Spacing.four,
  },
  title: {
    textAlign: 'left',
  },
  row: {
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    gap: Spacing.two,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  help: {
    fontSize: 13,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});
