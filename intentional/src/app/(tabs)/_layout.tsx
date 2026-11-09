import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/tokens';

/** A quiet dot instead of icons: enough to show where you are, nothing to look at. */
function TabDot({ focused }: { focused: boolean }) {
  return <View style={[styles.dot, focused && styles.dotFocused]} />;
}

/** Room for a 12pt label under the dot; the default bar is sized for 10pt labels. */
const TAB_BAR_HEIGHT = 56;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line, height: TAB_BAR_HEIGHT + insets.bottom },
        tabBarLabelStyle: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
        tabBarIcon: ({ focused }) => <TabDot focused={focused} />,
      }}>
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="communications" options={{ title: 'Messages', tabBarAccessibilityLabel: 'Communications' }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan' }} />
      <Tabs.Screen name="focus" options={{ title: 'Focus' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'transparent' },
  dotFocused: { backgroundColor: colors.accent },
});
