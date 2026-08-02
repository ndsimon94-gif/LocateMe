import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type UpcomingTrip =
  Database['public']['Functions']['get_upcoming_trips_with_overlap']['Returns'][number];

export function useUpcomingTrips() {
  const [trips, setTrips] = useState<UpcomingTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase.rpc('get_upcoming_trips_with_overlap');
    setTrips(data ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    async function initialize() {
      await refresh();
    }
    initialize();
  }, [refresh]);

  return { trips, isLoading, refresh };
}
