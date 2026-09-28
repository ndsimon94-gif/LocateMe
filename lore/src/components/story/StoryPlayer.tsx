"use client";

import { useEffect, useRef, useState } from "react";
import type { Language, StoryImage, StoryMedia } from "@/data/types";
import { formatDuration } from "@/lib/stories";
import { Still } from "../Still";
import { lineFor, usePlayback } from "./Playback";
import styles from "./StoryPlayer.module.css";

/**
 * The film. Large, quiet, and uncluttered: a single play control, subtitles
 * set generously for reading, and an optional read-along transcript beside
 * (or, on phones, beneath) the picture.
 */
export function StoryPlayer({
  media,
  poster,
  title,
  storyteller,
  language,
  subtitleLanguages,
  hasOriginalText,
}: {
  media: StoryMedia;
  poster: StoryImage;
  title: string;
  storyteller: string;
  language: Language;
  subtitleLanguages: Language[];
  hasOriginalText: boolean;
}) {
  const pb = usePlayback();
  const [started, setStarted] = useState(false);
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frame = useRef<HTMLDivElement>(null);

  const seg = pb.activeIndex >= 0 ? pb.segments[pb.activeIndex] : undefined;
  const caption = seg ? lineFor(seg, pb.captionLang) : undefined;

  // Controls fade away while watching, and return on any movement.
  const wake = () => {
    setIdle(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (pb.playing) idleTimer.current = setTimeout(() => setIdle(true), 2800);
  };
  useEffect(() => {
    if (!pb.playing) setIdle(false);
    else wake();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pb.playing]);

  const toggle = () => {
    setStarted(true);
    if (pb.playing) pb.pause();
    else pb.play();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) return;
    if (e.key === " " || e.key === "k") {
      e.preventDefault();
      toggle();
    } else if (e.key === "ArrowRight") pb.seek(pb.time + 5);
    else if (e.key === "ArrowLeft") pb.seek(pb.time - 5);
  };

  const fullscreen = () => {
    const el = frame.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  const captionOptions = [
    ...(hasOriginalText && language.code !== "en" ? [{ value: "original", label: `${language.endonym ?? language.name} (original)` }] : []),
    ...subtitleLanguages.map((l) => ({ value: l.code, label: l.name })),
    { value: "off", label: "Off" },
  ];

  const pct = (pb.time / pb.duration) * 100;

  return (
    <div className={`${styles.stage} ${pb.readAlong ? styles.withPanel : ""}`}>
      <div
        ref={frame}
        className={`${styles.frame} ${idle ? styles.idle : ""}`}
        onPointerMove={wake}
        onKeyDown={onKey}
        role="region"
        aria-label={`Film: ${title}, told by ${storyteller}`}
      >
        {media.src ? (
          <video
            ref={pb.registerVideo}
            className={styles.video}
            src={media.src}
            poster={media.poster}
            playsInline
            preload="metadata"
            onClick={toggle}
          >
            {/* Native tracks remain available to assistive tech and fullscreen on iOS. */}
            {Object.entries(media.subtitles ?? {}).map(([code, src]) => (
              <track key={code} kind="subtitles" srcLang={code} src={src} label={code} />
            ))}
          </video>
        ) : (
          <button type="button" className={styles.posterBtn} onClick={toggle} aria-label={pb.playing ? "Pause" : "Play the story"} tabIndex={-1}>
            <Still image={poster} className={`${styles.poster} ${pb.playing ? styles.posterPlaying : ""}`} priority />
          </button>
        )}

        {!started && (
          <button type="button" className={styles.bigPlay} onClick={toggle} aria-label={`Play ${title}`}>
            <span className={styles.bigPlayIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path d="M8 5.5v13l10-6.5z" fill="currentColor" />
              </svg>
            </span>
            <span className={styles.bigPlayText}>
              Listen
              <small>{formatDuration(pb.duration)}</small>
            </span>
          </button>
        )}

        {pb.simulated && started && (
          <p className={styles.demoNote}>
            Demo playback — no recording yet. Subtitles and transcript are simulated.
          </p>
        )}

        <div className={styles.captions} aria-live="off">
          {caption && (
            <p key={pb.activeIndex + pb.captionLang} className={styles.caption} lang={pb.captionLang === "original" ? language.code : pb.captionLang}>
              <span>{caption}</span>
            </p>
          )}
        </div>

        <div className={styles.controls}>
          <button type="button" className={styles.ctl} onClick={toggle} aria-label={pb.playing ? "Pause" : "Play"}>
            {pb.playing ? (
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M8 5.5v13l10-6.5z" fill="currentColor" />
              </svg>
            )}
          </button>
          <span className={styles.time}>{formatDuration(pb.time, "clock")}</span>
          <input
            type="range"
            className={styles.scrub}
            min={0}
            max={pb.duration}
            step={1}
            value={pb.time}
            onChange={(e) => pb.seek(Number(e.target.value))}
            aria-label="Position in the story"
            aria-valuetext={`${formatDuration(pb.time, "clock")} of ${formatDuration(pb.duration, "clock")}`}
            style={{ ["--pct" as string]: `${pct}%` }}
          />
          <span className={`${styles.time} ${styles.total}`}>{formatDuration(pb.duration, "clock")}</span>
          <label className={styles.cc}>
            <span className="sr-only">Subtitles</span>
            <span aria-hidden="true" className={styles.ccIcon}>
              CC
            </span>
            <select value={pb.captionLang} onChange={(e) => pb.setCaptionLang(e.target.value)} aria-label="Subtitles">
              {captionOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={`${styles.ctl} ${styles.readBtn}`}
            aria-pressed={pb.readAlong}
            onClick={() => pb.setReadAlong(!pb.readAlong)}
          >
            Read along
          </button>
          <button type="button" className={`${styles.ctl} ${styles.fs}`} onClick={fullscreen} aria-label="Full screen">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </button>
        </div>
      </div>

      {pb.readAlong && <ReadAlong languageCode={language.code} />}
    </div>
  );
}

function ReadAlong({ languageCode }: { languageCode: string }) {
  const pb = usePlayback();
  const list = useRef<HTMLOListElement>(null);
  const showOriginal = pb.segments.some((s) => s.original) && languageCode !== "en";
  const secondary = pb.captionLang === "original" || pb.captionLang === "off" ? "en" : pb.captionLang;

  useEffect(() => {
    const el = list.current?.querySelector<HTMLElement>("[data-active='true']");
    const box = list.current;
    if (el && box) box.scrollTo({ top: el.offsetTop - box.clientHeight / 3, behavior: "smooth" });
  }, [pb.activeIndex]);

  return (
    <aside className={styles.panel} aria-label="Read along">
      <p className={`label ${styles.panelHead}`}>Read along</p>
      <ol ref={list} className={styles.lines}>
        {pb.segments.map((s, i) => (
          <li key={i} data-active={i === pb.activeIndex}>
            <button type="button" onClick={() => pb.seek(s.start + 0.01)} className={styles.line}>
              <span className={styles.lineTime}>{formatDuration(s.start, "clock")}</span>
              {showOriginal && s.original && (
                <span className={styles.lineOrig} lang={languageCode}>
                  {s.original}
                </span>
              )}
              <span className={styles.lineTrans}>{lineFor(s, secondary) ?? s.english}</span>
            </button>
          </li>
        ))}
      </ol>
    </aside>
  );
}
