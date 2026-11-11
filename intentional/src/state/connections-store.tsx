import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { BackendError, callFunction } from '@/backend/supabase';

import { useAuth } from './auth-store';

/**
 * Google Calendar connection state. "connected" is only ever set from the
 * server's record of a completed OAuth exchange, never assumed by the app.
 */
export type GoogleStatus = 'signed_out' | 'checking' | 'not_connected' | 'connected' | 'needs_reconnect' | 'unavailable';

interface ConnectionsApi {
  google: GoogleStatus;
  connecting: boolean;
  /** Last connect/disconnect problem, in plain words. */
  error: string | null;
  connectGoogle(): Promise<void>;
  disconnectGoogle(): Promise<void>;
  refresh(): Promise<void>;
  /** Called by the calendar provider when Google rejects our token. */
  markNeedsReconnect(): void;
}

const ConnectionsContext = createContext<ConnectionsApi | null>(null);

const REASONS: Record<string, string> = {
  declined: 'Access wasn’t granted, so nothing was connected.',
  scope_not_granted: 'Calendar access wasn’t ticked on Google’s screen. Try again and allow “See your calendars”.',
  exchange_failed: 'Google didn’t complete the connection. Please try again.',
};

async function fetchGoogleStatus(): Promise<GoogleStatus> {
  try {
    const r = await callFunction<{ status: string }>('google', { action: 'status' });
    return r.status === 'connected' ? 'connected' : r.status === 'error' ? 'needs_reconnect' : 'not_connected';
  } catch {
    // Offline or server problem: don't claim a connection we can't confirm.
    return 'not_connected';
  }
}

export function ConnectionsProvider({ children }: { children: ReactNode }) {
  const { session, available } = useAuth();
  const userId = session?.user.id ?? null;
  // The server's answer, tagged with the user it belongs to.
  const [server, setServer] = useState<{ uid: string; status: GoogleStatus } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const google: GoogleStatus = !available ? 'unavailable' : !userId ? 'signed_out' : server?.uid === userId ? server.status : 'checking';

  const refresh = useCallback(async () => {
    if (!userId) return;
    const status = await fetchGoogleStatus();
    setServer({ uid: userId, status });
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void fetchGoogleStatus().then((status) => {
      if (!cancelled) setServer({ uid: userId, status });
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const connectGoogle = useCallback(async () => {
    setError(null);
    setConnecting(true);
    try {
      const returnUrl = Linking.createURL('google-connected');
      const { url } = await callFunction<{ url: string }>('google', { action: 'start', returnUrl });
      const result = await WebBrowser.openAuthSessionAsync(url, returnUrl);
      if (result.type === 'success') {
        const params = Linking.parse(result.url).queryParams ?? {};
        if (params.google !== 'connected') {
          const reason = typeof params.reason === 'string' ? params.reason : '';
          setError(REASONS[reason] ?? 'The connection didn’t complete. Please try again.');
        }
      }
      await refresh();
    } catch (e) {
      setError(e instanceof BackendError && e.code === 'unauthorized' ? 'Please sign in again.' : 'Couldn’t reach the server. Check your connection and try again.');
    } finally {
      setConnecting(false);
    }
  }, [refresh]);

  const disconnectGoogle = useCallback(async () => {
    setError(null);
    try {
      await callFunction('google', { action: 'disconnect' });
      if (userId) setServer({ uid: userId, status: 'not_connected' });
    } catch {
      setError('Couldn’t disconnect right now. Please try again.');
    }
  }, [userId]);

  const markNeedsReconnect = useCallback(() => {
    if (userId) setServer({ uid: userId, status: 'needs_reconnect' });
  }, [userId]);

  const value = useMemo(
    () => ({ google, connecting, error, connectGoogle, disconnectGoogle, refresh, markNeedsReconnect }),
    [google, connecting, error, connectGoogle, disconnectGoogle, refresh, markNeedsReconnect],
  );
  return <ConnectionsContext.Provider value={value}>{children}</ConnectionsContext.Provider>;
}

export function useConnections(): ConnectionsApi {
  const ctx = useContext(ConnectionsContext);
  if (!ctx) throw new Error('useConnections must be used inside ConnectionsProvider');
  return ctx;
}
