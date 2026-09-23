import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { LocationPicker, type LocationSelection } from '@/components/location-picker';
import { SegmentedControl } from '@/components/segmented-control';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type SharingLevel = 'off' | 'country' | 'city';
type HostingStatus = 'none' | 'can_host' | 'seeking_stay';

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

const HOSTING_OPTIONS: { label: string; value: HostingStatus }[] = [
  { label: 'Not now', value: 'none' },
  { label: 'Can host', value: 'can_host' },
  { label: 'Need a stay', value: 'seeking_stay' },
];

export default function SettingsScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [currentLabel, setCurrentLabel] = useState<string | null>(null);
  const [homePickerOpen, setHomePickerOpen] = useState(false);
  const [homeLabel, setHomeLabel] = useState<string | null>(null);
  const [draftWhatsapp, setDraftWhatsapp] = useState('');
  const [draftSocial, setDraftSocial] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [extendedOpen, setExtendedOpen] = useState(false);
  const [draftHostingNote, setDraftHostingNote] = useState('');

  useEffect(() => {
    // One-time sync from the async-loaded profile into locally-owned
    // editable draft text, not derived state.
    /* eslint-disable react-hooks/set-state-in-effect */
    setDraftWhatsapp(profile?.whatsapp_number ?? '');
    setDraftSocial(profile?.social_handle ?? '');
    setDraftMessage(profile?.contact_message ?? '');
    setDraftHostingNote(profile?.hosting_note ?? '');
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [profile]);

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

  useEffect(() => {
    let cancelled = false;

    async function loadHomeLabel() {
      if (!profile?.home_city_id) {
        setHomeLabel(null);
        return;
      }
      const { data } = await supabase
        .from('cities')
        .select('name, countries ( name )')
        .eq('id', profile.home_city_id)
        .single();
      if (cancelled) return;
      const row = data as unknown as { name: string; countries: { name: string } | null } | null;
      setHomeLabel(row ? `${row.name}, ${row.countries?.name ?? ''}` : null);
    }

    loadHomeLabel();
    return () => {
      cancelled = true;
    };
  }, [profile?.home_city_id]);

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

  async function handleHomeSelect(selection: LocationSelection) {
    if (selection.level !== 'city') return;
    await supabase
      .from('profiles')
      .update({ home_city_id: selection.cityId, home_country_code: selection.countryCode })
      .eq('id', session!.user.id);
    await refreshProfile();
    setHomePickerOpen(false);
  }

  async function handleHomeClear() {
    await supabase
      .from('profiles')
      .update({ home_city_id: null, home_country_code: null })
      .eq('id', session!.user.id);
    await refreshProfile();
  }

  async function handleHostingStatusChange(next: HostingStatus) {
    await supabase.from('profiles').update({ hosting_status: next }).eq('id', session!.user.id);
    await refreshProfile();
  }

  async function handleHostingNoteBlur() {
    if (draftHostingNote === (profile!.hosting_note ?? '')) return;
    await supabase
      .from('profiles')
      .update({ hosting_note: draftHostingNote || null })
      .eq('id', session!.user.id);
    await refreshProfile();
  }

  async function handleContactBlur() {
    if (
      draftWhatsapp === (profile!.whatsapp_number ?? '') &&
      draftSocial === (profile!.social_handle ?? '') &&
      draftMessage === (profile!.contact_message ?? '')
    ) {
      return;
    }
    await supabase
      .from('profiles')
      .update({
        whatsapp_number: draftWhatsapp || null,
        social_handle: draftSocial || null,
        contact_message: draftMessage || null,
      })
      .eq('id', session!.user.id);
    await refreshProfile();
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

          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>Home base</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.help}>
              Where you live, separate from where you currently are. Shown to friends you&apos;re
              connected with.
            </ThemedText>
            <View style={styles.locationRow}>
              <ThemedText themeColor="textSecondary">
                {homeLabel ? homeLabel : 'Not set yet'}
              </ThemedText>
              <View style={styles.homeButtons}>
                {homeLabel && (
                  <Button label="Clear" variant="ghost" onPress={handleHomeClear} />
                )}
                <Button
                  label={homeLabel ? 'Change' : 'Set home base'}
                  variant="outline"
                  onPress={() => setHomePickerOpen((open) => !open)}
                />
              </View>
            </View>
            {homePickerOpen && <LocationPicker mode="city" onSelect={handleHomeSelect} />}
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>Contact info</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.help}>
              Shown to friends you&apos;re connected with. Leave blank to keep something private.
            </ThemedText>
            <TextField
              label="WhatsApp"
              value={draftWhatsapp}
              onChangeText={setDraftWhatsapp}
              onBlur={handleContactBlur}
              placeholder="+1 555 123 4567"
              keyboardType="phone-pad"
            />
            <TextField
              label="Social media"
              value={draftSocial}
              onChangeText={setDraftSocial}
              onBlur={handleContactBlur}
              placeholder="@yourhandle or a profile link"
            />
            <TextField
              label="Message"
              value={draftMessage}
              onChangeText={setDraftMessage}
              onBlur={handleContactBlur}
              placeholder="Best reached in the evenings, CET"
              multiline
              style={styles.messageInput}
            />
          </View>

          <View style={styles.section}>
            <Button
              label={extendedOpen ? 'Hide extended options' : 'Extended options'}
              variant="ghost"
              onPress={() => setExtendedOpen((open) => !open)}
            />
            {extendedOpen && (
              <View style={styles.section}>
                <ThemedText style={styles.sectionLabel}>Hosting</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.help}>
                  Tied to wherever your current or home location says. Shown to friends
                  you&apos;re connected with.
                </ThemedText>
                <SegmentedControl
                  options={HOSTING_OPTIONS}
                  value={profile.hosting_status}
                  onChange={handleHostingStatusChange}
                />
                {profile.hosting_status !== 'none' && (
                  <TextField
                    label="Note"
                    value={draftHostingNote}
                    onChangeText={setDraftHostingNote}
                    onBlur={handleHostingNoteBlur}
                    placeholder={
                      profile.hosting_status === 'can_host'
                        ? 'Have a spare room, no pets please'
                        : 'Passing through for a week, any tips welcome'
                    }
                    multiline
                    style={styles.messageInput}
                  />
                )}
              </View>
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
  homeButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
});
