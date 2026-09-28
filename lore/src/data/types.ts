/**
 * LORE story data model.
 *
 * Every page, filter, map marker and search result on the site is derived
 * from records of this shape. To publish a real story, add a record that
 * satisfies `Story` — no page needs to be written by hand.
 */

export type Region =
  | "Africa"
  | "Asia"
  | "Europe"
  | "North America"
  | "South America"
  | "Oceania";

/** A language, identified by BCP 47 code so subtitles and transcripts can line up. */
export interface Language {
  code: string; // e.g. "sw", "qu", "ja"
  name: string; // English name, e.g. "Kiswahili"
  endonym?: string; // name in the language itself, e.g. "Kiswahili", "日本語"
}

/** One line of a transcript, timed against the recording. */
export interface TranscriptSegment {
  /** Seconds from the start of the recording. */
  start: number;
  end: number;
  /** Text in the language the story was told in. Omit if not yet transcribed. */
  original?: string;
  /** English translation. */
  english: string;
  /** Further translations, keyed by language code. */
  translations?: Record<string, string>;
}

export type ProtocolLevel =
  /** Shared openly for listening, with attribution. */
  | "open"
  /** Shared for listening; some uses (reuse, adaptation, commercial) need permission. */
  | "attribution"
  /** The storyteller/community has asked for particular care — see notes. */
  | "guided";

export interface CulturalProtocol {
  level: ProtocolLevel;
  /** Written or approved by the storyteller or community. */
  notes: string[];
  /** Who to contact about this story (a community representative, or LORE). */
  steward?: string;
}

export interface StoryMedia {
  /** Video source (mp4/HLS). Undefined until a recording is published. */
  src?: string;
  /** Poster frame for the player. */
  poster?: string;
  /** WebVTT subtitle tracks, keyed by language code. */
  subtitles?: Record<string, string>;
}

export interface StoryImage {
  /** Real photograph / film still. When absent, a generated placeholder is drawn. */
  src?: string;
  alt: string;
  /** Placeholder rendering hints (used only when `src` is absent). */
  placeholder?: {
    kind: "portrait" | "landscape";
    /** Three colours: shadow, mid, light. */
    tones: [string, string, string];
    /** Varies the generated composition. */
    seed: number;
  };
}

export interface Story {
  id: string;
  slug: string;
  title: string;
  /** A title in the original language, if the storyteller gives one. */
  originalTitle?: string;

  storyteller: string;
  storytellerBio: string;
  /** How the storyteller relates to the story, in a phrase: "grandmother", "fisherman", … */
  storytellerRole?: string;

  community: string;
  place: string; // human-readable locality, as the storyteller describes it
  country: string;
  region: Region;
  /** [longitude, latitude]. Use the general area the storyteller is comfortable sharing. */
  coordinates: [number, number];

  language: Language;
  subtitleLanguages: Language[];
  /** Seconds. */
  duration: number;

  /** One or two sentences — enough for curiosity, not a summary. */
  description: string;
  storyContext: string[];
  lineage?: string[];
  culturalContext?: string[];

  themes: string[];
  storyType: string[];

  transcript: TranscriptSegment[];
  culturalProtocol: CulturalProtocol;

  video: StoryMedia;
  thumbnail: StoryImage;
  /** A wider still used on story pages and the featured slot. */
  still?: StoryImage;

  /** A short line spoken in the story, if the storyteller is happy for it to be quoted. */
  pullQuote?: string;

  featured?: boolean;
  publicationDate: string; // ISO date

  /** Marks placeholder records. Real stories must never set this. */
  demo?: boolean;
}
