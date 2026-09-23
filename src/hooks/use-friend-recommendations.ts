import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type Recommendation = Database['public']['Tables']['friend_recommendations']['Row'];

export function useFriendRecommendations(friendshipId: string | undefined) {
  const { session } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!friendshipId) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('friend_recommendations')
      .select('*')
      .eq('friendship_id', friendshipId)
      .order('created_at', { ascending: false });
    setRecommendations(data ?? []);
    setIsLoading(false);
  }, [friendshipId]);

  useEffect(() => {
    async function initialize() {
      await refresh();
    }
    initialize();
  }, [refresh]);

  const addRecommendation = useCallback(
    async (place: string, note: string) => {
      if (!friendshipId || !session) return;
      const trimmedPlace = place.trim();
      if (!trimmedPlace) return;
      const { data, error } = await supabase
        .from('friend_recommendations')
        .insert({
          friendship_id: friendshipId,
          author_id: session.user.id,
          place: trimmedPlace,
          note: note.trim() || null,
        })
        .select('*')
        .single();
      if (!error && data) setRecommendations((prev) => [data, ...prev]);
    },
    [friendshipId, session],
  );

  const removeRecommendation = useCallback(async (id: string) => {
    setRecommendations((prev) => prev.filter((item) => item.id !== id));
    await supabase.from('friend_recommendations').delete().eq('id', id);
  }, []);

  return {
    recommendations,
    isLoading,
    addRecommendation,
    removeRecommendation,
    myUserId: session?.user.id,
  };
}
