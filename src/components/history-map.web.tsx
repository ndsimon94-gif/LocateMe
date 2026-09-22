import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { FriendshipHistoryEntry } from '@/hooks/use-friendship-history';

type HistoryMapProps = {
  entries: FriendshipHistoryEntry[];
};

export function HistoryMap(_props: HistoryMapProps) {
  return (
    <View style={styles.container}>
      <ThemedText themeColor="textSecondary" style={styles.helper}>
        The meeting-place map needs the mobile app. Switch to List for now.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
  },
  helper: {
    fontSize: 13,
    textAlign: 'center',
  },
});
