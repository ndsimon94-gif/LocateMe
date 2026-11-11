import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePreferences } from '@/state/preferences-store';
import { colors } from '@/theme/tokens';

/** Room for 22pt icons and a 12pt label; the default bar is sized for 10pt labels. */
const TAB_BAR_HEIGHT = 60;

type IconName = keyof typeof Ionicons.glyphMap;
const icon = (filled: IconName, outline: IconName) =>
  function TabIcon({ focused, color }: { focused: boolean; color: ColorValue }) {
    return <Ionicons name={focused ? filled : outline} size={22} color={color} />;
  };

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { hydrated, preferences } = usePreferences();
  if (hydrated && !preferences.onboarded) return <Redirect href="/welcome" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('sunny', 'sunny-outline') }} />
      <Tabs.Screen name="communications" options={{ title: 'Messages', tabBarIcon: icon('mail', 'mail-outline') }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarIcon: icon('calendar', 'calendar-outline') }} />
      <Tabs.Screen name="focus" options={{ title: 'Focus', tabBarIcon: icon('timer', 'timer-outline') }} />
    </Tabs>
  );
}
