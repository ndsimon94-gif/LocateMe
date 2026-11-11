import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProviders } from '@/state/app-providers';
import { useNotificationRouting } from '@/state/notification-routing';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  useNotificationRouting();
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="task/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="task/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="command" options={{ presentation: 'modal' }} />
        <Stack.Screen name="plan-review" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="auth-callback" />
        <Stack.Screen name="google-connected" />
      </Stack>
    </AppProviders>
  );
}
