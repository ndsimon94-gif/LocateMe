import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, MIN_TOUCH, radius, space } from '@/theme/tokens';

import { Text } from './text';

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Hide the capture bar (e.g. inside modals). */
  hideCapture?: boolean;
}

/** Shared screen frame: title, the global capture/ask bar, and scrollable content. */
export function Screen({ title, subtitle, children, hideCapture }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text variant="display" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text muted>{subtitle}</Text> : null}
        </View>
        {hideCapture ? null : <CaptureBar />}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function CaptureBar() {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Capture a thought or ask the assistant"
      onPress={() => router.push('/command')}
      style={({ pressed }) => [styles.capture, pressed && { opacity: 0.8 }]}>
      <Text muted>Capture or ask…</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.xl, paddingTop: space.lg, gap: space.xl, paddingBottom: space.xxxl },
  header: { gap: space.xs },
  capture: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunken,
  },
});
