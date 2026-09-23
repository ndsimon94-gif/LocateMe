import { useCallback, useEffect, useState } from 'react';

import type { ItineraryStop } from '@/lib/itineraries';
import { supabase } from '@/lib/supabase';

export function useItineraries() {
  const [stops, setStops] = useState<ItineraryStop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase.rpc('get_my_itineraries_with_connections');
    setStops(data ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    async function initialize() {
      await refresh();
    }
    initialize();
  }, [refresh]);

  return { stops, isLoading, refresh };
}
