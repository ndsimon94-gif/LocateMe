import { Redirect } from 'expo-router';

import { LoadingScreen } from '@/components/loading-screen';
import { resolveEntryRedirect } from '@/lib/auth-gate';
import { useAuth } from '@/lib/auth-context';

export default function Index() {
  const { session, profile, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  return <Redirect href={resolveEntryRedirect(session, profile)} />;
}
