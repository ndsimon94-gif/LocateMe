import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase } from '@/backend/supabase';

interface AuthApi {
  /** False when no backend is configured: the app runs offline only. */
  available: boolean;
  loading: boolean;
  session: Session | null;
  email: string | null;
  /** Sends a sign-in link. Returns an error message or null. */
  sendSignInLink(email: string): Promise<string | null>;
  /** Completes sign-in from the link's ?code=. Returns an error message or null. */
  completeSignIn(code: string): Promise<string | null>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const sendSignInLink = useCallback(async (email: string) => {
    if (!supabase) return 'Sign-in is not available in this build.';
    const trimmed = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) return 'That email address doesn’t look right.';
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: Linking.createURL('auth-callback') },
    });
    return error ? error.message : null;
  }, []);

  const completeSignIn = useCallback(async (code: string) => {
    if (!supabase) return 'Sign-in is not available in this build.';
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? 'This sign-in link didn’t work. Links only work on the device that requested them, once, within an hour.' : null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  const value = useMemo<AuthApi>(
    () => ({
      available: Boolean(supabase),
      loading,
      session,
      email: session?.user.email ?? null,
      sendSignInLink,
      completeSignIn,
      signOut,
    }),
    [loading, session, sendSignInLink, completeSignIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
