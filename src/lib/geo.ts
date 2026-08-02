import type { FriendWithLocation } from '@/components/friend-list-item';

export type LocationGroup = {
  key: string;
  label: string;
  lat: number;
  lng: number;
  friends: FriendWithLocation[];
};

// Groups friends onto the coarse centroid they've each resolved to (a city
// or, absent that, a country) — never a live coordinate, and never one pin
// per person, so the map can't imply more precision than what's actually
// being shared.
export function groupFriendsByLocation(friends: FriendWithLocation[]): LocationGroup[] {
  const groups = new Map<string, LocationGroup>();

  for (const friend of friends) {
    let key: string | null = null;
    let label = '';
    let lat: number | null = null;
    let lng: number | null = null;

    if (
      friend.sharing_level === 'city' &&
      friend.city_id &&
      friend.city_lat !== null &&
      friend.city_lng !== null
    ) {
      key = `city:${friend.city_id}`;
      label = friend.country_name ? `${friend.city_name}, ${friend.country_name}` : (friend.city_name ?? '');
      lat = friend.city_lat;
      lng = friend.city_lng;
    } else if (
      friend.sharing_level !== 'off' &&
      friend.country_code &&
      friend.country_lat !== null &&
      friend.country_lng !== null
    ) {
      key = `country:${friend.country_code}`;
      label = friend.country_name ?? '';
      lat = friend.country_lat;
      lng = friend.country_lng;
    }

    if (!key || lat === null || lng === null) continue;

    const existing = groups.get(key);
    if (existing) {
      existing.friends.push(friend);
    } else {
      groups.set(key, { key, label, lat, lng, friends: [friend] });
    }
  }

  return Array.from(groups.values());
}
