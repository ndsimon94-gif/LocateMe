/**
 * Public, client-safe configuration (inlined by Expo from EXPO_PUBLIC_* vars).
 * Not used until the backend milestone; kept here so there is one place to read it.
 */
export const publicEnv = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
} as const;

export const isBackendConfigured = () => publicEnv.supabaseUrl.startsWith('https://') && publicEnv.supabasePublishableKey.length > 0;
