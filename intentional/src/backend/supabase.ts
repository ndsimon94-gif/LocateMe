import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { isBackendConfigured, publicEnv } from '@/config/public-env';

/**
 * The one Supabase client, or null when the backend isn't configured (the app
 * then runs fully offline with mocks). Only the public publishable key is used.
 */
export const supabase: SupabaseClient | null = isBackendConfigured()
  ? createClient(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        // Email links come back as ?code=…, exchanged on the same device.
        flowType: 'pkce',
      },
    })
  : null;

// Refresh the session only while the app is in the foreground.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });
}

export class BackendError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number | null,
  ) {
    super(code);
    this.name = 'BackendError';
  }
}

/** Calls an Edge Function as the signed-in user and returns its JSON, or throws BackendError. */
export async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new BackendError('not_configured', null);
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let code = 'network_error';
    let status: number | null = null;
    const response = (error as { context?: unknown }).context;
    if (response instanceof Response) {
      status = response.status;
      try {
        code = (await response.json())?.error ?? `http_${status}`;
      } catch {
        code = `http_${status}`;
      }
    }
    throw new BackendError(code, status);
  }
  return data as T;
}
