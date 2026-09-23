import { useCallback, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { PlaceReason } from '@/types/database';

export type PlaceSearchResult = {
  friend_id: string;
  friendship_id: string;
  name: string | null;
  reasons: PlaceReason[];
  met_place: string | null;
  met_at: string | null;
};

export function usePlaceSearch() {
  const [results, setResults] = useState<PlaceSearchResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const search = useCallback(async (countryCode: string) => {
    setIsLoading(true);
    const { data } = await supabase.rpc('search_orbit_by_place', { p_country_code: countryCode });
    setResults(data ?? []);
    setIsLoading(false);
  }, []);

  const clear = useCallback(() => setResults(null), []);

  return { results, isLoading, search, clear };
}
