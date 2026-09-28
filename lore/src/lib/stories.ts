/**
 * The single access layer for story data. Pages never import the raw records
 * directly, so swapping the demo array for a CMS or database later only
 * touches this file.
 */
import { STORIES } from "@/data/stories";
import { REGION_ORDER, STORY_TYPES } from "@/data/taxonomy";
import type { Story, StoryImage } from "@/data/types";

/** The lightweight shape sent to browsing, map and search UIs. */
export interface StorySummary {
  id: string;
  slug: string;
  title: string;
  storyteller: string;
  storytellerRole?: string;
  community: string;
  place: string;
  country: string;
  region: string;
  coordinates: [number, number];
  language: string;
  languageEndonym?: string;
  duration: number;
  description: string;
  themes: string[];
  storyType: string[];
  thumbnail: StoryImage;
  demo?: boolean;
}

export function toSummary(s: Story): StorySummary {
  return {
    id: s.id,
    slug: s.slug,
    title: s.title,
    storyteller: s.storyteller,
    storytellerRole: s.storytellerRole,
    community: s.community,
    place: s.place,
    country: s.country,
    region: s.region,
    coordinates: s.coordinates,
    language: s.language.name,
    languageEndonym: s.language.endonym,
    duration: s.duration,
    description: s.description,
    themes: s.themes,
    storyType: s.storyType,
    thumbnail: s.thumbnail,
    demo: s.demo,
  };
}

const bySlug = new Map(STORIES.map((s) => [s.slug, s]));

export function getAllStories(): Story[] {
  return STORIES;
}

export function getStorySummaries(): StorySummary[] {
  return STORIES.map(toSummary);
}

export function getStoryBySlug(slug: string): Story | undefined {
  return bySlug.get(slug);
}

export function getFeaturedStory(): Story {
  return STORIES.find((s) => s.featured) ?? STORIES[0];
}

/* ───────────────────────── Facets ───────────────────────── */

export type FacetKey = "region" | "country" | "community" | "language" | "theme" | "type";

export interface FacetOption {
  value: string;
  count: number;
}

export type Facets = Record<FacetKey, FacetOption[]>;

export function facetValues(s: StorySummary, key: FacetKey): string[] {
  switch (key) {
    case "region":
      return [s.region];
    case "country":
      return [s.country];
    case "community":
      return [s.community];
    case "language":
      return [s.language];
    case "theme":
      return s.themes;
    case "type":
      return s.storyType;
  }
}

const FACET_KEYS: FacetKey[] = ["region", "country", "community", "language", "theme", "type"];

/** Counts every facet value present in the archive. */
export function buildFacets(stories: StorySummary[]): Facets {
  const out = {} as Facets;
  for (const key of FACET_KEYS) {
    const counts = new Map<string, number>();
    for (const s of stories) for (const v of facetValues(s, key)) counts.set(v, (counts.get(v) ?? 0) + 1);
    let options = [...counts].map(([value, count]) => ({ value, count }));
    if (key === "region") {
      const order: readonly string[] = REGION_ORDER;
      options.sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value));
    } else if (key === "type") {
      const order = STORY_TYPES.map((t) => t.name);
      const rank = (v: string) => (order.includes(v) ? order.indexOf(v) : order.length);
      options.sort((a, b) => rank(a.value) - rank(b.value) || a.value.localeCompare(b.value));
    } else {
      // Alphabetical — never by popularity. No culture ranks above another.
      options = options.sort((a, b) => a.value.localeCompare(b.value));
    }
    out[key] = options;
  }
  return out;
}

/* ───────────────────────── Filtering & search ───────────────────────── */

export type Filters = Partial<Record<FacetKey, string[]>> & { q?: string };

function normalise(t: string) {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function searchText(s: StorySummary) {
  return normalise(
    [s.title, s.storyteller, s.community, s.place, s.country, s.region, s.language, s.languageEndonym ?? "", ...s.themes, ...s.storyType, s.description].join(" "),
  );
}

/**
 * OR within a facet, AND across facets. Search matches every word anywhere
 * in the record. This is linear and fine for thousands of records; beyond
 * that, swap in a prebuilt index (e.g. MiniSearch / Pagefind) here.
 */
export function filterStories(stories: StorySummary[], f: Filters): StorySummary[] {
  const words = f.q ? normalise(f.q).split(/\s+/).filter(Boolean) : [];
  return stories.filter((s) => {
    for (const key of FACET_KEYS) {
      const wanted = f[key];
      if (wanted?.length && !facetValues(s, key).some((v) => wanted.includes(v))) return false;
    }
    if (words.length) {
      const hay = searchText(s);
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
}

/* ───────────────────────── Connections ───────────────────────── */

export interface RelatedGroup {
  heading: string;
  stories: StorySummary[];
}

function distanceKm([lon1, lat1]: [number, number], [lon2, lat2]: [number, number]) {
  const r = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

/**
 * Connections by shared meaning, never by popularity: nearby places, shared
 * themes, shared kinds of story. A story can appear in only one group.
 */
export function getRelated(story: Story, limit = 3): RelatedGroup[] {
  const all = getStorySummaries().filter((s) => s.id !== story.id);
  const used = new Set<string>();
  const take = (list: StorySummary[]) => {
    const picked = list.filter((s) => !used.has(s.id)).slice(0, limit);
    picked.forEach((s) => used.add(s.id));
    return picked;
  };

  const sharedThemes = (s: StorySummary) => s.themes.filter((t) => story.themes.includes(t)).length;
  const themed = take(all.filter((s) => sharedThemes(s) > 0).sort((a, b) => sharedThemes(b) - sharedThemes(a)));

  const nearby = take(
    [...all]
      .filter((s) => s.region === story.region)
      .sort((a, b) => distanceKm(a.coordinates, story.coordinates) - distanceKm(b.coordinates, story.coordinates)),
  );

  const typed = take(all.filter((s) => s.storyType.some((t) => story.storyType.includes(t))));

  const groups: RelatedGroup[] = [
    { heading: `Stories from ${story.region}`, stories: nearby },
    { heading: "Stories of a similar theme", stories: themed },
    { heading: `Other ${story.storyType[0].toLowerCase()} stories`, stories: typed },
  ];
  return groups.filter((g) => g.stories.length);
}

/* ───────────────────────── Formatting ───────────────────────── */

export function formatDuration(seconds: number, style: "clock" | "words" = "words") {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (style === "clock") {
    const h = Math.floor(m / 60);
    return h ? `${h}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
  }
  if (m < 1) return "under a minute";
  return `${m} min`;
}
