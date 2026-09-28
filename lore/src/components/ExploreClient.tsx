"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { buildFacets, filterStories, type FacetKey, type Filters, type StorySummary } from "@/lib/stories";
import { StoryCard } from "./StoryCard";
import { WorldMap } from "./WorldMap";
import styles from "./ExploreClient.module.css";

const KEYS: FacetKey[] = ["region", "country", "community", "language", "theme", "type"];
const PAGE = 24;

const GROUPS: { key: FacetKey; label: string }[] = [
  { key: "country", label: "Country or place" },
  { key: "community", label: "Community" },
  { key: "language", label: "Told in" },
  { key: "theme", label: "Themes" },
  { key: "type", label: "Kind of story" },
];

/** How each filter reads when spoken as part of a sentence. */
const PHRASE: Record<FacetKey, string> = {
  region: "from",
  country: "from",
  community: "shared by",
  language: "told in",
  theme: "about",
  type: "—",
};

function readFilters(sp: URLSearchParams): Filters {
  const f: Filters = {};
  for (const k of KEYS) {
    const v = sp.getAll(k);
    if (v.length) f[k] = v;
  }
  const q = sp.get("q");
  if (q) f.q = q;
  return f;
}

export function ExploreClient({ stories }: { stories: StorySummary[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = useMemo(() => readFilters(new URLSearchParams(sp.toString())), [sp]);
  const view = sp.get("view") === "map" ? "map" : "grid";
  const [q, setQ] = useState(filters.q ?? "");
  const [refine, setRefine] = useState(false);
  const [shown, setShown] = useState(PAGE);

  const facets = useMemo(() => buildFacets(stories), [stories]);
  const results = useMemo(() => filterStories(stories, filters), [stories, filters]);

  const write = (next: Filters, nextView = view) => {
    const p = new URLSearchParams();
    for (const k of KEYS) next[k]?.forEach((v) => p.append(k, v));
    if (next.q) p.set("q", next.q);
    if (nextView === "map") p.set("view", "map");
    const s = p.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    setShown(PAGE);
  };

  // Debounced search-as-you-type.
  useEffect(() => {
    if ((filters.q ?? "") === q.trim()) return;
    const t = setTimeout(() => write({ ...filters, q: q.trim() || undefined }), 280);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const toggle = (k: FacetKey, v: string) => {
    const cur = filters[k] ?? [];
    const nextVals = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
    write({ ...filters, [k]: nextVals.length ? nextVals : undefined });
  };

  const active = KEYS.flatMap((k) => (filters[k] ?? []).map((v) => ({ k, v })));
  const clearAll = () => {
    setQ("");
    write({});
  };

  const langs = new Set(stories.map((s) => s.language)).size;
  const countries = new Set(stories.map((s) => s.country)).size;

  return (
    <div className={styles.explore}>
      <header className={`wrap ${styles.head}`}>
        <p className="label label-rule">The archive</p>
        <h1 className="display h1">Explore the stories</h1>
        <p className={styles.sub}>
          {stories.length} stories, told in {langs} languages, from {countries} countries. There is no right place to begin.
        </p>

        <div className={styles.searchRow}>
          <label htmlFor="explore-q" className="sr-only">
            Search stories
          </label>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true" className={styles.searchIcon}>
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M15.5 15.5 21 21" strokeLinecap="round" />
          </svg>
          <input
            id="explore-q"
            type="search"
            className={styles.search}
            placeholder="Search by place, language, storyteller or theme"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            enterKeyHint="search"
          />
        </div>

        <div className={styles.regions} role="group" aria-label="Regions">
          <button type="button" className={styles.chip} aria-pressed={!filters.region?.length} onClick={() => write({ ...filters, region: undefined })}>
            Everywhere
          </button>
          {facets.region.map((r) => (
            <button key={r.value} type="button" className={styles.chip} aria-pressed={!!filters.region?.includes(r.value)} onClick={() => toggle("region", r.value)}>
              {r.value}
            </button>
          ))}
        </div>

        <div className={styles.bar}>
          <button type="button" className={styles.refineBtn} aria-expanded={refine} aria-controls="refine" onClick={() => setRefine((r) => !r)}>
            <span>{refine ? "Fewer ways to wander" : "More ways to wander"}</span>
            <span className={styles.plus} data-open={refine} aria-hidden="true" />
          </button>
          <div className={styles.views} role="group" aria-label="View">
            <button type="button" aria-pressed={view === "grid"} onClick={() => write(filters, "grid")}>
              Faces
            </button>
            <button type="button" aria-pressed={view === "map"} onClick={() => write(filters, "map")}>
              Map
            </button>
          </div>
        </div>

        <div id="refine" className={styles.refine} data-open={refine} hidden={!refine}>
          {GROUPS.map((g) => (
            <fieldset key={g.key} className={styles.group}>
              <legend className="label">{g.label}</legend>
              <div className={styles.groupChips}>
                {facets[g.key].map((o) => (
                  <button key={o.value} type="button" className={styles.chipSm} aria-pressed={!!filters[g.key]?.includes(o.value)} onClick={() => toggle(g.key, o.value)}>
                    {o.value}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        {(active.length > 0 || filters.q) && (
          <p className={styles.sentence} aria-live="polite">
            <span>
              {results.length} {results.length === 1 ? "story" : "stories"}
            </span>
            {active.map(({ k, v }) => (
              <span key={k + v}>
                {" "}
                {PHRASE[k] !== "—" && <span className={styles.phrase}>{PHRASE[k]} </span>}
                <button type="button" className={styles.token} onClick={() => toggle(k, v)} aria-label={`Remove ${v}`}>
                  {k === "type" ? v.toLowerCase() : v}
                  <span aria-hidden="true">×</span>
                </button>
              </span>
            ))}
            {filters.q && (
              <span>
                {" "}
                <span className={styles.phrase}>mentioning </span>
                <button
                  type="button"
                  className={styles.token}
                  onClick={() => {
                    setQ("");
                    write({ ...filters, q: undefined });
                  }}
                  aria-label={`Remove search ${filters.q}`}
                >
                  “{filters.q}”<span aria-hidden="true">×</span>
                </button>
              </span>
            )}
            <button type="button" className={styles.clear} onClick={clearAll}>
              Start again
            </button>
          </p>
        )}
      </header>

      {results.length === 0 ? (
        <div className={`wrap ${styles.empty}`}>
          <p className="display h3">No stories here yet.</p>
          <p>
            Perhaps you know one. <Link href="/share">Tell us about a story you carry →</Link>
          </p>
        </div>
      ) : view === "map" ? (
        <div className={`wrap ${styles.mapWrap}`}>
          <WorldMap stories={results} />
        </div>
      ) : (
        <div className="wrap">
          <ul className={styles.grid}>
            {results.slice(0, shown).map((s, i) => (
              <li key={s.id} className={styles.item} style={{ animationDelay: `${Math.min(i, 12) * 70}ms` }}>
                <StoryCard story={s} priority={i < 4} />
              </li>
            ))}
          </ul>
          {shown < results.length && (
            <div className={styles.more}>
              <button type="button" className="btn" onClick={() => setShown((n) => n + PAGE)}>
                Show more stories
              </button>
              <p className="meta">
                {Math.min(shown, results.length)} of {results.length}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
