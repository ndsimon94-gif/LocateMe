import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { TextField } from '@/components/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

export type LocationSelection =
  | { level: 'city'; cityId: string; cityName: string; countryCode: string; countryName: string }
  | { level: 'country'; countryCode: string; countryName: string };

type CityItem = {
  kind: 'city';
  key: string;
  id: string;
  name: string;
  countryCode: string;
  countryName: string;
};
type CountryItem = { kind: 'country'; key: string; code: string; name: string };
type ResultItem = CityItem | CountryItem;

type LocationPickerProps = {
  mode: 'city' | 'country';
  onSelect: (selection: LocationSelection) => void;
};

// The seed dataset is a curated few hundred rows, so it's fetched once and
// filtered on-device rather than round-tripping a search query per
// keystroke. A `cities.name` trigram index already exists in the schema for
// when this needs to move server-side as the dataset grows.
export function LocationPicker({ mode, onSelect }: LocationPickerProps) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ResultItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadItems() {
      if (mode === 'city') {
        const { data } = await supabase
          .from('cities')
          .select('id, name, countries ( code, name )')
          .order('name');
        if (cancelled) return;
        type Row = { id: string; name: string; countries: { code: string; name: string } | null };
        const rows = (data as unknown as Row[]) ?? [];
        setItems(
          rows
            .filter((row) => row.countries !== null)
            .map((row) => ({
              kind: 'city',
              key: row.id,
              id: row.id,
              name: row.name,
              countryCode: row.countries!.code,
              countryName: row.countries!.name,
            })),
        );
      } else {
        const { data } = await supabase.from('countries').select('code, name').order('name');
        if (cancelled) return;
        setItems((data ?? []).map((row) => ({ kind: 'country', key: row.code, ...row })));
      }
    }

    loadItems();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 30);
    return items
      .filter((item) =>
        item.kind === 'city'
          ? item.name.toLowerCase().includes(q) || item.countryName.toLowerCase().includes(q)
          : item.name.toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [items, query]);

  function handlePress(item: ResultItem) {
    if (item.kind === 'city') {
      onSelect({
        level: 'city',
        cityId: item.id,
        cityName: item.name,
        countryCode: item.countryCode,
        countryName: item.countryName,
      });
    } else {
      onSelect({ level: 'country', countryCode: item.code, countryName: item.name });
    }
  }

  return (
    <View style={styles.container}>
      <TextField
        label={mode === 'city' ? 'Search a city' : 'Search a country'}
        value={query}
        onChangeText={setQuery}
      />
      <FlatList<ResultItem>
        data={results}
        keyExtractor={(item) => item.key}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable style={[styles.row, { borderColor: theme.line }]} onPress={() => handlePress(item)}>
            <Text style={{ color: theme.text }}>
              {item.kind === 'city' ? `${item.name}, ${item.countryName}` : item.name}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  list: {
    maxHeight: 240,
  },
  row: {
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
