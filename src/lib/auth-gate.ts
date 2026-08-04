import type { Session } from '@supabase/supabase-js';
import type { Href } from 'expo-router';

import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

/** Where "/" should send someone, given their current auth state. */
export function resolveEntryRedirect(session: Session | null, profile: Profile | null): Href {
  if (!session) return '/(auth)/sign-up';
  if (!profile?.username) return '/(auth)/complete-profile';
  return '/(app)';
}

/** Guard for the (app) group: null means "let them stay". */
export function resolveAppGuardRedirect(
  session: Session | null,
  profile: Profile | null,
): Href | null {
  if (!session) return '/(auth)/sign-up';
  if (!profile?.username) return '/(auth)/complete-profile';
  return null;
}

/** Guard for the (auth) group: null means "let them stay". */
export function resolveAuthGroupRedirect(
  session: Session | null,
  profile: Profile | null,
): Href | null {
  if (session && profile?.username) return '/(app)';
  if (session && !profile?.username) return '/(auth)/complete-profile';
  return null;
}
