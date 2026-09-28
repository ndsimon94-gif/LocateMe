"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { filterStories, type StorySummary } from "@/lib/stories";
import styles from "./SearchOverlay.module.css";

let indexPromise: Promise<StorySummary[]> | null = null;
/** The search index is fetched once, lazily, the first time search opens. */
function loadIndex() {
  indexPromise ??= fetch("/search-index.json").then((r) => r.json());
  return indexPromise;
}

const PROMPTS = ["the sea", "grandmothers", "night", "Kiswahili", "journeys", "Peru", "teaching story"];

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [index, setIndex] = useState<StorySummary[] | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    loadIndex().then(setIndex).catch(() => setIndex([]));
    const t = setTimeout(() => input.current?.focus(), 80);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open, onClose]);

  const results = useMemo(() => (index && q.trim() ? filterStories(index, { q }).slice(0, 6) : []), [index, q]);

  return (
    <div className={styles.overlay} data-open={open} role="dialog" aria-modal="true" aria-label="Search the archive" aria-hidden={!open} inert={!open}>
      <button type="button" className={styles.close} onClick={onClose} aria-label="Close search">
        Close
      </button>
      <div className={styles.inner}>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/explore?q=${encodeURIComponent(q.trim())}`);
            onClose();
          }}
        >
          <label htmlFor="site-search" className="label">
            Search the archive
          </label>
          <input
            ref={input}
            id="site-search"
            className={styles.input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="A place, a language, a storyteller, a theme…"
            autoComplete="off"
            enterKeyHint="search"
          />
        </form>

        {q.trim() ? (
          <ul className={styles.results} aria-live="polite">
            {results.map((s) => (
              <li key={s.id}>
                <Link href={`/stories/${s.slug}`} onClick={onClose} className={styles.result}>
                  <span className={styles.rTitle}>{s.title}</span>
                  <span className="meta">
                    {s.storyteller} · {s.place}, {s.country} · {s.language}
                  </span>
                </Link>
              </li>
            ))}
            {index && results.length === 0 && <li className={styles.none}>Nothing yet by that name. Try a place, a language or a theme.</li>}
            {results.length > 0 && (
              <li>
                <Link href={`/explore?q=${encodeURIComponent(q.trim())}`} onClick={onClose} className="text-link">
                  See everything for “{q.trim()}” <span aria-hidden="true">→</span>
                </Link>
              </li>
            )}
          </ul>
        ) : (
          <div className={styles.prompts}>
            <p className="label">Or wander toward</p>
            <div className={styles.promptList}>
              {PROMPTS.map((p) => (
                <button key={p} type="button" className={styles.prompt} onClick={() => setQ(p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
