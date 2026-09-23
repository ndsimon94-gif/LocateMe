import { useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { OrbitTextMatch } from '@/types/database';

export type OrbitTextResult = {
  friend_id: string;
  friendship_id: string;
  name: string | null;
  matches: OrbitTextMatch[];
};

export function useOrbitTextSearch(query: string) {
  const [results, setResults] = useState<OrbitTextResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      // Resetting to match the new (too-short) query, not seeding from an
      // async load.
      /* eslint-disable react-hooks/set-state-in-effect */
      setResults(null);
      setIsLoading(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    setIsLoading(true);
    const thisRequest = ++requestId.current;
    const timeout = setTimeout(async () => {
      const { data } = await supabase.rpc('search_orbit_text', { p_query: trimmed });
      if (thisRequest !== requestId.current) return;
      setResults(data ?? []);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  return { results, isLoading };
}
