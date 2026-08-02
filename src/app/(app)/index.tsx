import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';

export default function AppHomeScreen() {
  const { profile } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.body}>
          <ThemedText type="title" style={styles.title}>
            You&rsquo;re in
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            {profile?.display_name ?? profile?.username}
          </ThemedText>
        </View>
        <View style={styles.actions}>
          <Link href="/(app)/connect" asChild>
            <Button label="My code" />
          </Link>
          <Link href="/(app)/connect/scan" asChild>
            <Button label="Scan a friend's code" variant="outline" />
          </Link>
          <Link href="/(app)/settings" asChild>
            <Button label="Settings" variant="ghost" />
          </Link>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    padding: Spacing.four,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  title: {
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.two,
  },
});
