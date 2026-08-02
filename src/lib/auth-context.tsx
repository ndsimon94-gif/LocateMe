import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  // Tracks the session bootstrap *and* the profile fetch for whichever
  // session is current, so consumers never see a frame where the session
  // is known but a stale/empty profile hasn't caught up yet.
  const [isLoading, setIsLoading] = useState(true);
  const requestId = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap(nextSession: Session | null) {
      const thisRequest = ++requestId.current;
      if (!nextSession) {
        if (cancelled || thisRequest !== requestId.current) return;
        setProfile(null);
        setIsLoading(false);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', nextSession.user.id)
        .single();
      if (cancelled || thisRequest !== requestId.current) return;
      setProfile(data ?? null);
      setIsLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      bootstrap(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (cancelled) return;
      setSession(nextSession);
      setIsLoading(true);
      bootstrap(nextSession);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    setProfile(data ?? null);
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({ session, profile, isLoading, refreshProfile }),
    [session, profile, isLoading, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
