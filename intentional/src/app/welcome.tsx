import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePreferences } from '@/state/preferences-store';
import { colors, radius, space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { Text } from '@/ui/text';

const POINTS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: 'sparkles-outline',
    title: 'Say what your week needs',
    body: 'Priorities, time for exercise, reminders. Intentional finds the time and shows you the plan before changing anything.',
  },
  {
    icon: 'mail-outline',
    title: 'Messages at set times',
    body: 'A couple of windows a day for replies, and quiet evenings, instead of checking all day.',
  },
  {
    icon: 'leaf-outline',
    title: 'Nothing to keep you here',
    body: 'No streaks, no feeds, no nudges to come back. A short visit, then back to your life.',
  },
];

/** Shown once, on first launch. */
export default function WelcomeScreen() {
  const router = useRouter();
  const { updatePreferences } = usePreferences();

  const finish = (next: '/' | '/settings') => {
    updatePreferences({ onboarded: true });
    router.replace('/');
    if (next === '/settings') router.push('/settings');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text variant="label" style={{ color: colors.accent }}>
            Intentional
          </Text>
          <Text variant="display" accessibilityRole="header">
            Less time on your phone, more on your life.
          </Text>
        </View>

        <View style={styles.points}>
          {POINTS.map((p) => (
            <View key={p.title} style={styles.point}>
              <View style={styles.iconWrap}>
                <Ionicons name={p.icon} size={20} color={colors.accent} />
              </View>
              <View style={styles.flex}>
                <Text variant="heading">{p.title}</Text>
                <Text muted>{p.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Button label="Connect Google Calendar" onPress={() => finish('/settings')} />
          <Button tone="quiet" label="Look around first" onPress={() => finish('/')} />
          <Text variant="small" muted style={styles.center}>
            Your tasks and plans stay on this phone. You can connect a calendar any time.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: space.xl, paddingTop: space.xxxl, gap: space.xxl, justifyContent: 'space-between' },
  header: { gap: space.sm },
  points: { gap: space.xl },
  point: { flexDirection: 'row', gap: space.lg, alignItems: 'flex-start' },
  iconWrap: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
  actions: { gap: space.sm },
  center: { textAlign: 'center' },
});
