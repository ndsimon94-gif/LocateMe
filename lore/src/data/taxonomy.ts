/**
 * Story types and themes are intentionally loose. Different communities
 * categorise stories differently, so a story can carry several types, and
 * new types can be added here without touching any page.
 *
 * Only descriptions/ordering live here — which types and themes actually
 * appear on the site is derived from the story records themselves.
 */

export const STORY_TYPES: { name: string; note: string }[] = [
  { name: "Creation", note: "How things came to be" },
  { name: "Folktale", note: "Told and retold, shaped by many voices" },
  { name: "Legend", note: "Rooted in a person, event or place" },
  { name: "Teaching Story", note: "Carried because of what it teaches" },
  { name: "Ancestral Story", note: "Of those who came before" },
  { name: "Sacred Story", note: "Shared with particular care" },
  { name: "Story of Place", note: "Belonging to a river, hill or road" },
  { name: "Family Story", note: "Held within a family" },
  { name: "Historical Memory", note: "What a community remembers" },
];

export const REGION_ORDER = [
  "Africa",
  "Asia",
  "Europe",
  "North America",
  "South America",
  "Oceania",
] as const;
