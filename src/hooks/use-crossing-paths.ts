import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type CrossingPath =
  Database['public']['Functions']['get_crossing_paths']['Returns'][number];

export function useCrossingPaths() {
  const { session } = useAuth();
  const [paths, setPaths] = useState<CrossingPath[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase.rpc('get_crossing_paths');
    setPaths(data ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    async function initialize() {
      await refresh();
    }
    initialize();
  }, [refresh]);

  // "Maybe later" — same-session only, nothing written; it can resurface
  // next time this screen loads.
  const dismissForNow = useCallback((friendId: string, cityId: string) => {
    setPaths((prev) => prev.filter((p) => !(p.friend_id === friendId && p.city_id === cityId)));
  }, []);

  // "Hide" — permanent, the one persisted action available on this prompt.
  const hidePermanently = useCallback(
    async (friendId: string, cityId: string) => {
      if (!session) return;
      dismissForNow(friendId, cityId);
      await supabase
        .from('nearby_dismissals')
        .insert({ user_id: session.user.id, friend_id: friendId, city_id: cityId });
    },
    [session, dismissForNow],
  );

  return { paths, isLoading, refresh, dismissForNow, hidePermanently };
}
