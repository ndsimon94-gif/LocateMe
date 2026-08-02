import { Redirect, Stack } from 'expo-router';

import { LoadingScreen } from '@/components/loading-screen';
import { useAuth } from '@/lib/auth-context';
import { resolveAppGuardRedirect } from '@/lib/auth-gate';

export default function AppLayout() {
  const { session, profile, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  const redirect = resolveAppGuardRedirect(session, profile);
  if (redirect) return <Redirect href={redirect} />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
