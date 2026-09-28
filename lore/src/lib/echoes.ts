import type { StorySummary } from "./stories";

export interface Echo {
  theme: string;
  countries: string[];
  count: number;
}

/**
 * Themes that surface in places far apart — the "unexpected connections"
 * the archive should make visible. Picks themes that appear in at least
 * three countries, spread across more than one region.
 */
export function findEchoes(stories: StorySummary[], limit = 4): Echo[] {
  const byTheme = new Map<string, StorySummary[]>();
  for (const s of stories) for (const t of s.themes) byTheme.set(t, [...(byTheme.get(t) ?? []), s]);
  return [...byTheme]
    .map(([theme, list]) => ({
      theme,
      countries: [...new Set(list.map((s) => s.country))],
      regions: new Set(list.map((s) => s.region)).size,
      count: list.length,
    }))
    .filter((e) => e.countries.length >= 3 && e.regions > 1)
    .sort((a, b) => b.regions - a.regions || b.countries.length - a.countries.length || a.theme.localeCompare(b.theme))
    .slice(0, limit)
    .map(({ theme, countries, count }) => ({ theme, countries, count }));
}
