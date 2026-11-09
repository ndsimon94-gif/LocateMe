import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';

import { Text } from './text';

/** Marks mock data so it can never be mistaken for a connected service. */
export function SampleBadge({ label = 'Sample data' }: { label?: string }) {
  return (
    <View style={styles.badge} accessibilityLabel={`${label}. Not connected to a real account.`}>
      <Text variant="small" style={styles.text}>
        {label}
      </Text>
    </View>
  );
}

export function NotConnectedNote({ service }: { service: string }) {
  return (
    <Text variant="small" muted>
      {service} is not connected. Showing sample data for this prototype.
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warningSoft,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  text: { color: colors.warning, fontSize: 12, lineHeight: 16, fontWeight: '600' },
});
