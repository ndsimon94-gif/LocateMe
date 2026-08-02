import { useCallback, useEffect, useState } from 'react';

import type { FriendWithLocation } from '@/components/friend-list-item';
import { supabase } from '@/lib/supabase';

export function useFriendsWithLocation() {
  const [friends, setFriends] = useState<FriendWithLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase.rpc('get_friends_with_location');
    setFriends(data ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    async function initialize() {
      await refresh();
    }
    initialize();
  }, [refresh]);

  return { friends, isLoading, refresh };
}
