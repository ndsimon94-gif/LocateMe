import { Redirect, Stack } from 'expo-router';

import { LoadingScreen } from '@/components/loading-screen';
import { useAuth } from '@/lib/auth-context';
import { resolveAuthGroupRedirect } from '@/lib/auth-gate';

export default function AuthLayout() {
  const { session, profile, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  const redirect = resolveAuthGroupRedirect(session, profile);
  if (redirect) return <Redirect href={redirect} />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
