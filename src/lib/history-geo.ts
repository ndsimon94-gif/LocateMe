import type { FriendshipHistoryEntry } from '@/hooks/use-friendship-history';

export type MeetingGroup = {
  key: string;
  label: string;
  lat: number;
  lng: number;
  entries: FriendshipHistoryEntry[];
};

// Groups connections by the coarse place captured at handshake time — city
// centroid when available, country centroid otherwise, skipped entirely if
// neither was captured (e.g. connected while location wasn't set at all).
export function groupHistoryByLocation(entries: FriendshipHistoryEntry[]): MeetingGroup[] {
  const groups = new Map<string, MeetingGroup>();

  for (const entry of entries) {
    let key: string | null = null;
    let label = '';
    let lat: number | null = null;
    let lng: number | null = null;

    if (
      entry.connected_city_name &&
      entry.connected_city_lat !== null &&
      entry.connected_city_lng !== null
    ) {
      key = `city:${entry.connected_city_name}:${entry.connected_country_name ?? ''}`;
      label = entry.connected_country_name
        ? `${entry.connected_city_name}, ${entry.connected_country_name}`
        : entry.connected_city_name;
      lat = entry.connected_city_lat;
      lng = entry.connected_city_lng;
    } else if (
      entry.connected_country_name &&
      entry.connected_country_lat !== null &&
      entry.connected_country_lng !== null
    ) {
      key = `country:${entry.connected_country_name}`;
      label = entry.connected_country_name;
      lat = entry.connected_country_lat;
      lng = entry.connected_country_lng;
    }

    if (!key || lat === null || lng === null) continue;

    const existing = groups.get(key);
    if (existing) {
      existing.entries.push(entry);
    } else {
      groups.set(key, { key, label, lat, lng, entries: [entry] });
    }
  }

  return Array.from(groups.values());
}
