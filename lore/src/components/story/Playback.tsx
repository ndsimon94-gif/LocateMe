"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { TranscriptSegment } from "@/data/types";

/**
 * Shared playback state for a story page, so the player, its subtitles,
 * the read-along panel and the full transcript all move together.
 *
 * When a story has a real video, the <video> element drives `time`.
 * Until then (demo records) a gentle simulated clock does, so subtitles
 * and transcript sync can be experienced.
 */
interface PlaybackState {
  time: number;
  duration: number;
  playing: boolean;
  simulated: boolean;
  segments: TranscriptSegment[];
  activeIndex: number;
  captionLang: string; // "off" | "original" | "en" | other code
  setCaptionLang: (l: string) => void;
  play: () => void;
  pause: () => void;
  seek: (t: number) => void;
  registerVideo: (v: HTMLVideoElement | null) => void;
  readAlong: boolean;
  setReadAlong: (v: boolean) => void;
}

const Ctx = createContext<PlaybackState | null>(null);

export function usePlayback() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePlayback must be used inside <PlaybackProvider>");
  return c;
}

export function lineFor(seg: TranscriptSegment, lang: string): string | undefined {
  if (lang === "off") return undefined;
  if (lang === "original") return seg.original;
  if (lang === "en") return seg.english;
  return seg.translations?.[lang];
}

export function PlaybackProvider({
  segments,
  duration,
  hasVideo,
  children,
}: {
  segments: TranscriptSegment[];
  duration: number;
  hasVideo: boolean;
  children: ReactNode;
}) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [captionLang, setCaptionLang] = useState("en");
  const [readAlong, setReadAlong] = useState(false);
  const [dur, setDur] = useState(duration);
  const video = useRef<HTMLVideoElement | null>(null);

  // Simulated clock for records without a recording.
  useEffect(() => {
    if (hasVideo || !playing) return;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTime((t) => {
        const n = t + dt;
        if (n >= dur) {
          setPlaying(false);
          return dur;
        }
        return n;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hasVideo, playing, dur]);

  const registerVideo = useCallback((v: HTMLVideoElement | null) => {
    video.current = v;
    if (!v) return;
    v.addEventListener("timeupdate", () => setTime(v.currentTime));
    v.addEventListener("play", () => setPlaying(true));
    v.addEventListener("pause", () => setPlaying(false));
    v.addEventListener("loadedmetadata", () => Number.isFinite(v.duration) && setDur(v.duration));
  }, []);

  const play = useCallback(() => {
    if (video.current) void video.current.play();
    else setPlaying(true);
    setTime((t) => (t >= dur ? 0 : t));
  }, [dur]);
  const pause = useCallback(() => {
    if (video.current) video.current.pause();
    else setPlaying(false);
  }, []);
  const seek = useCallback(
    (t: number) => {
      const c = Math.max(0, Math.min(dur, t));
      if (video.current) video.current.currentTime = c;
      setTime(c);
    },
    [dur],
  );

  const activeIndex = useMemo(() => segments.findIndex((s) => time >= s.start && time < s.end), [segments, time]);

  const value = useMemo<PlaybackState>(
    () => ({
      time,
      duration: dur,
      playing,
      simulated: !hasVideo,
      segments,
      activeIndex,
      captionLang,
      setCaptionLang,
      play,
      pause,
      seek,
      registerVideo,
      readAlong,
      setReadAlong,
    }),
    [time, dur, playing, hasVideo, segments, activeIndex, captionLang, play, pause, seek, registerVideo, readAlong],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
