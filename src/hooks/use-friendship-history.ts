import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type FriendshipHistoryEntry =
  Database['public']['Functions']['get_friendship_history']['Returns'][number];

export function useFriendshipHistory() {
  const [entries, setEntries] = useState<FriendshipHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase.rpc('get_friendship_history');
    setEntries(data ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    async function initialize() {
      await refresh();
    }
    initialize();
  }, [refresh]);

  return { entries, isLoading, refresh };
}
