"use client";

import { useState } from "react";
import type { Language } from "@/data/types";
import { formatDuration } from "@/lib/stories";
import { lineFor, usePlayback } from "./Playback";
import styles from "./Transcript.module.css";

/**
 * The full transcript: the storyteller's own words beside a translation.
 * Any line can be tapped to hear it in the film.
 */
export function Transcript({ language, translations }: { language: Language; translations: Language[] }) {
  const pb = usePlayback();
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState(translations.find((l) => l.code !== language.code)?.code ?? "en");
  const hasOriginal = pb.segments.some((s) => s.original);
  const englishOriginal = language.code === "en";
  const available = translations.filter((t) => t.code !== language.code && pb.segments.some((s) => lineFor(s, t.code)));

  const jump = (t: number) => {
    pb.seek(t + 0.01);
    pb.play();
    document.getElementById("film")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className={styles.transcript}>
      <div className={styles.bar}>
        {!englishOriginal && available.length > 1 && (
          <label className={styles.pick}>
            <span className="label">Translation</span>
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="input">
              {available.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {!hasOriginal && (
          <p className={styles.pending}>
            A transcript in {language.name} is being prepared with the storyteller. The translation is shown for now.
          </p>
        )}
      </div>

      <div className={`${styles.body} ${open ? styles.open : ""}`} id="transcript-body">
        <div className={`${styles.cols} ${hasOriginal && !englishOriginal ? styles.two : ""}`} role="table" aria-label="Transcript">
          <div role="row" className={styles.headRow}>
            <span role="columnheader" className="sr-only">
              Time
            </span>
            {hasOriginal && !englishOriginal && (
              <span role="columnheader" className="label">
                {language.endonym ?? language.name}
              </span>
            )}
            <span role="columnheader" className="label">
              {englishOriginal ? "English (original)" : (translations.find((t) => t.code === lang)?.name ?? "English")}
            </span>
          </div>
          {pb.segments.map((s, i) => (
            <div role="row" key={i} className={`${styles.row} ${i === pb.activeIndex ? styles.active : ""}`}>
              <span role="cell">
                <button type="button" className={styles.time} onClick={() => jump(s.start)} aria-label={`Play from ${formatDuration(s.start, "clock")}`}>
                  {formatDuration(s.start, "clock")}
                </button>
              </span>
              {hasOriginal && !englishOriginal && (
                <span role="cell" className={styles.orig} lang={language.code}>
                  {s.original ?? "…"}
                </span>
              )}
              <span role="cell" className={styles.trans} lang={englishOriginal ? "en" : lang}>
                {englishOriginal ? s.english : (lineFor(s, lang) ?? s.english)}
              </span>
            </div>
          ))}
        </div>
        {!open && <div className={styles.fade} aria-hidden="true" />}
      </div>

      <button type="button" className={styles.toggle} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="transcript-body">
        {open ? "Fold the transcript away" : "Read the whole transcript"}
      </button>
    </div>
  );
}
