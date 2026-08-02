import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.mark, { borderColor: theme.brass }]} />
        <ThemedText type="title" style={styles.title}>
          Orbit
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.tagline}>
          Meet once. Know where they are for good.
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  mark: {
    width: 36,
    height: 18,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: Spacing.two,
    transform: [{ rotate: '-18deg' }, { scaleY: 1.3 }],
  },
  title: {
    textAlign: 'center',
  },
  tagline: {
    textAlign: 'center',
    fontSize: 15,
  },
});
