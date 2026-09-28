# LORE — Living Oral Record Exchange

*A home for the stories that outlive us.*

The website for LORE: a nonprofit home for stories passed between generations, told by the people who carry them.

This is a standalone Next.js site (App Router, TypeScript, CSS Modules). It lives in its own folder and shares nothing with the Expo app at the repo root.

```bash
cd lore
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Everything comes from the story records

Pages, filters, the map, search, "Echoes" and related stories are all **derived** from story records. No story page is written by hand.

| File | What it is |
| --- | --- |
| `src/data/types.ts` | The `Story` data model (with comments on every field) |
| `src/data/stories.ts` | **12 fictional DEMO records.** Every one is `demo: true` and labelled on the site |
| `src/data/taxonomy.ts` | Story-type descriptions and region order. It only describes; it never limits what appears |
| `src/data/site.ts` | Donate URL, contact email, social links (placeholders) |
| `src/lib/stories.ts` | The only access layer: queries, facets, filtering, search, related stories |

### Adding real stories

1. Delete the demo records in `src/data/stories.ts`, or change `getAllStories()` in `src/lib/stories.ts` to load from a CMS or database.
2. Give each record `video.src` (MP4/HLS) and `video.subtitles` (WebVTT files by language code). The player switches from simulated demo playback to the real video.
3. Give `thumbnail.src` / `still.src` real photographs. The generated placeholder art is only drawn when `src` is missing.
4. `transcript` is a list of timed segments (`start`, `end`, `original`, `english`, `translations`). It drives the subtitles, the read-along panel and the full transcript. If `original` is left empty, the page says transcription is in progress.
5. `culturalProtocol.level` is one of `open`, `attribution` or `guided`, and its `notes` should be written or approved by the storyteller or community.

### Scale

- Browsing, the map and the search overlay receive a light `StorySummary` (no transcripts).
- The site-wide search fetches `/search-index.json` lazily, the first time it opens.
- Map markers cluster in screen space as you zoom, so thousands of points stay readable.
- The archive shows 24 stories at a time with a "Show more" button. There is no infinite scroll.
- Facets are sorted alphabetically or by the taxonomy, never by popularity.
- Beyond a few thousand records, replace `filterStories` with a prebuilt index (MiniSearch, Pagefind) and paginate `getStorySummaries`.

## Forms

The Share a Story, Contact, Newsletter and Support forms post to `/api/*`. `src/lib/intake.ts` validates each submission and logs it. **Connect a real destination there** (email, a CRM, Airtable, the archive database). The donate button points to `SITE.donateUrl` until a payment provider is connected.

## Design notes

- Type: Cormorant Garamond (display), Newsreader (reading), Instrument Sans (labels).
- Palette: paper, ink, clay, ochre, moss and firelight, defined as tokens in `src/app/globals.css`.
- Motion is slow and respects `prefers-reduced-motion`.
- There are no view counts, likes, trending lists or "recommended for you". Related stories are linked by place, theme and kind of story.
