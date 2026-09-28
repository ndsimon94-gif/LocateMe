"use client";

import { useEffect, useState } from "react";
import type { StoryImage } from "@/data/types";
import { Still } from "./Still";
import styles from "./HeroMontage.module.css";

export interface HeroScene {
  image: StoryImage;
  caption: string;
}

const HOLD = 7000;

/**
 * A slow, silent sequence of faces and places. Each frame drifts gently
 * and dissolves into the next. Replace `scenes` with real footage stills,
 * or swap the Still for a muted looping <video>, when recordings exist.
 */
export function HeroMontage({ scenes }: { scenes: HeroScene[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % scenes.length), HOLD);
    return () => clearInterval(t);
  }, [paused, scenes.length]);

  return (
    <section className={`dark ${styles.hero}`} aria-label="Introduction">
      <div className={styles.frames} aria-hidden="true">
        {scenes.map((s, n) => (
          <div key={n} className={styles.frame} data-on={n === i} data-prev={n === (i - 1 + scenes.length) % scenes.length}>
            <Still image={s.image} className={styles.still} priority={n === 0} />
          </div>
        ))}
        <div className={styles.shade} />
      </div>

      <div className={styles.center}>
        <h1 className={styles.word}>
          L<span className={styles.o}>O</span>RE
        </h1>
        <p className={styles.expanded}>Living Oral Record Exchange</p>
        <p className={styles.tagline}>A home for the stories that outlive us.</p>
      </div>

      <div className={styles.foot}>
        <p className={styles.caption} aria-live="off">
          <span key={i} className={styles.captionText}>
            {scenes[i].caption}
          </span>
        </p>
        <a href="#begin" className={styles.begin}>
          <span>Begin</span>
          <span className={styles.line} aria-hidden="true" />
        </a>
        <button type="button" className={styles.pause} onClick={() => setPaused((p) => !p)} aria-pressed={paused}>
          {paused ? "Play sequence" : "Pause sequence"}
        </button>
      </div>
    </section>
  );
}
