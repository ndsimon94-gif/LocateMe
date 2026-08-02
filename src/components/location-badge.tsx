import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type LocationBadgeProps = {
  sharingLevel: 'off' | 'country' | 'city';
  countryName: string | null;
  cityName: string | null;
};

export function LocationBadge({ sharingLevel, countryName, cityName }: LocationBadgeProps) {
  const theme = useTheme();

  if (sharingLevel === 'off' || (!countryName && !cityName)) {
    return (
      <View style={[styles.badge, styles.muted, { borderColor: theme.line }]}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Hidden</Text>
      </View>
    );
  }

  const label = sharingLevel === 'city' && cityName ? `${cityName}, ${countryName}` : countryName;

  return (
    <View style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
      <Text style={[styles.label, { color: theme.accent }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  muted: {
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
