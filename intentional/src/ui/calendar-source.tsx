import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { IntegrationInfo } from '@/integrations/types';
import { colors, space } from '@/theme/tokens';

import { Button } from './button';
import { SampleBadge } from './sample-badge';
import { Text } from './text';

/** Says where calendar events come from, and offers to connect when they're samples. */
export function CalendarSource({ integration, error }: { integration: IntegrationInfo; error: string | null }) {
  const router = useRouter();
  if (error) {
    return (
      <Text variant="small" style={{ color: colors.warning }}>
        {error}
      </Text>
    );
  }
  if (!integration.isMock) return null;
  return (
    <View style={styles.row}>
      <SampleBadge label="Sample calendar" />
      <Button compact tone="quiet" label="Connect Google Calendar" onPress={() => router.push('/settings')} />
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' } });
