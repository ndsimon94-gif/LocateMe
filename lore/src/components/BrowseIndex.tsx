"use client";

import Link from "next/link";
import { useState } from "react";
import type { Facets, FacetKey } from "@/lib/stories";
import styles from "./BrowseIndex.module.css";

const DRAWERS: { key: FacetKey; label: string }[] = [
  { key: "region", label: "Place" },
  { key: "community", label: "Community" },
  { key: "language", label: "Language" },
  { key: "theme", label: "Theme" },
  { key: "type", label: "Kind of story" },
];

/**
 * Like the drawers of a card catalogue: pick one, and the ways in appear.
 * Every entry is generated from the archive itself.
 */
export function BrowseIndex({ facets, typeNotes }: { facets: Facets; typeNotes: Record<string, string> }) {
  const [open, setOpen] = useState<FacetKey>("region");
  const options = open === "region" ? [...facets.region, ...facets.country.map((c) => ({ ...c, sub: true }))] : facets[open];

  return (
    <div className={styles.index}>
      <div className={styles.tabs} role="tablist" aria-label="Browse by">
        {DRAWERS.map((d) => (
          <button
            key={d.key}
            role="tab"
            type="button"
            id={`tab-${d.key}`}
            aria-selected={open === d.key}
            aria-controls="browse-panel"
            className={styles.tab}
            onClick={() => setOpen(d.key)}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div id="browse-panel" role="tabpanel" aria-labelledby={`tab-${open}`} className={styles.panel} key={open}>
        {open === "region" ? (
          <div className={styles.regions}>
            {facets.region.map((r) => (
              <Link key={r.value} href={`/explore?region=${encodeURIComponent(r.value)}`} className={styles.entry}>
                <span className={styles.word}>{r.value}</span>
                <sup className={styles.count}>{r.count}</sup>
              </Link>
            ))}
            <p className={styles.countries}>
              {facets.country.map((c, i) => (
                <span key={c.value}>
                  <Link href={`/explore?country=${encodeURIComponent(c.value)}`}>{c.value}</Link>
                  {i < facets.country.length - 1 && <span aria-hidden="true"> · </span>}
                </span>
              ))}
            </p>
          </div>
        ) : (
          <div className={`${styles.flow} ${open === "type" ? styles.types : ""}`}>
            {options.map((o) => (
              <Link
                key={o.value}
                href={`/explore?${open}=${encodeURIComponent(o.value)}`}
                className={styles.entry}
              >
                <span className={styles.word}>{o.value}</span>
                <sup className={styles.count}>{o.count}</sup>
                {open === "type" && typeNotes[o.value] && <span className={styles.note}>{typeNotes[o.value]}</span>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
