import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/theme/tokens';

import { Text } from './text';

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={styles.wrap}>
      <Text variant="heading">{title}</Text>
      {body ? <Text muted>{body}</Text> : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { gap: space.xs, paddingVertical: space.sm } });
