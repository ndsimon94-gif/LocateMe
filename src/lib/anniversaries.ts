import type { FriendshipHistoryEntry } from '@/hooks/use-friendship-history';

export type Anniversary = { entry: FriendshipHistoryEntry; years: number };

// Purely client-side — no gamification, no push, just something to notice
// if you happen to open History today. Only counts once at least a full
// year has passed (a connection made today isn't its own anniversary).
export function findAnniversaries(
  entries: FriendshipHistoryEntry[],
  today: Date = new Date(),
): Anniversary[] {
  const results: Anniversary[] = [];
  for (const entry of entries) {
    const met = new Date(entry.created_at);
    if (met.getMonth() === today.getMonth() && met.getDate() === today.getDate()) {
      const years = today.getFullYear() - met.getFullYear();
      if (years > 0) results.push({ entry, years });
    }
  }
  return results;
}
