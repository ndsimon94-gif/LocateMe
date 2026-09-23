import type { Database } from '@/types/database';

export type ItineraryStop =
  Database['public']['Functions']['get_my_itineraries_with_connections']['Returns'][number];

export type GroupedItinerary = {
  itineraryId: string;
  title: string | null;
  stops: ItineraryStop[];
};

export function groupStopsByItinerary(stops: ItineraryStop[]): GroupedItinerary[] {
  const order: string[] = [];
  const byId = new Map<string, GroupedItinerary>();

  for (const stop of stops) {
    let group = byId.get(stop.itinerary_id);
    if (!group) {
      group = { itineraryId: stop.itinerary_id, title: stop.title, stops: [] };
      byId.set(stop.itinerary_id, group);
      order.push(stop.itinerary_id);
    }
    group.stops.push(stop);
  }

  return order.map((id) => byId.get(id)!);
}
