import { Redirect, Tabs } from 'expo-router';

import { LoadingScreen } from '@/components/loading-screen';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { resolveAppGuardRedirect } from '@/lib/auth-gate';

export default function AppLayout() {
  const { session, profile, isLoading } = useAuth();
  const theme = useTheme();

  if (isLoading) return <LoadingScreen />;

  const redirect = resolveAppGuardRedirect(session, profile);
  if (redirect) return <Redirect href={redirect} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.backgroundElement, borderTopColor: theme.line },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Friends' }} />
      <Tabs.Screen name="trips/index" options={{ title: 'Trips' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      <Tabs.Screen name="connect/index" options={{ href: null }} />
      <Tabs.Screen name="connect/scan" options={{ href: null }} />
      <Tabs.Screen name="friend/[friendshipId]" options={{ href: null }} />
      <Tabs.Screen name="chat/[friendshipId]" options={{ href: null }} />
      <Tabs.Screen name="trips/add" options={{ href: null }} />
    </Tabs>
  );
}
