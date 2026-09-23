import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type CrossingPath =
  Database['public']['Functions']['get_crossing_paths']['Returns'][number];

export function useCrossingPaths() {
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

  return { paths, isLoading, refresh };
}
