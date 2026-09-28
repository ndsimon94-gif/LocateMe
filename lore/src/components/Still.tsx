import { useId } from "react";
import type { StoryImage } from "@/data/types";
import styles from "./Still.module.css";

/**
 * A film still. Shows the real photograph when `image.src` exists; until
 * then, draws a quiet, generated placeholder — a softly lit figure or a
 * landscape — so the design can be felt without inventing real people.
 */
export function Still({
  image,
  className,
  sizes,
  priority,
  focus = "center",
  label,
}: {
  image: StoryImage;
  className?: string;
  sizes?: string;
  priority?: boolean;
  focus?: "center" | "left" | "right";
  label?: string;
}) {
  if (image.src) {
    return (
      <div className={`${styles.still} ${className ?? ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.src}
          alt={image.alt}
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          className={styles.img}
        />
      </div>
    );
  }
  const p = image.placeholder ?? { kind: "portrait" as const, tones: ["#1d1914", "#6b5a48", "#d9c3a0"] as [string, string, string], seed: 1 };
  return (
    <div className={`${styles.still} ${className ?? ""}`} role="img" aria-label={image.alt}>
      {p.kind === "portrait" ? <Portrait tones={p.tones} seed={p.seed} focus={focus} /> : <Landscape tones={p.tones} seed={p.seed} />}
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
}

function rand(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function Portrait({ tones, seed, focus }: { tones: [string, string, string]; seed: number; focus: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const r = rand(seed);
  const [dark, mid, light] = tones;
  const lightLeft = r() > 0.5;
  const cx = focus === "left" ? 560 : focus === "right" ? 1040 : 800 + (r() - 0.5) * 80;
  const headY = 430 + r() * 30;
  const headRx = 118 + r() * 14;
  const headRy = headRx * 1.24;
  const shoulder = 390 + r() * 70;
  const drape = r() > 0.45;
  const neckY = headY + headRy * 0.9;
  const lx = lightLeft ? 0.12 : 0.88;
  const rim = lightLeft ? -1 : 1;
  const drapePath = `M ${cx - headRx - 22} ${headY + 30} C ${cx - headRx - 16} ${headY - headRy - 36}, ${cx + headRx + 16} ${headY - headRy - 36}, ${cx + headRx + 22} ${headY + 30} L ${cx + headRx + 70} ${headY + headRy + 160} L ${cx - headRx - 70} ${headY + headRy + 160} Z`;

  return (
    <svg className={styles.svg} viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id={`bg${id}`} cx={lx} cy="0.3" r="1.1">
          <stop offset="0" stopColor={light} stopOpacity="0.9" />
          <stop offset="0.35" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
        <linearGradient id={`fig${id}`} x1={lightLeft ? 0 : 1} x2={lightLeft ? 1 : 0} y1="0" y2="0.3">
          <stop offset="0" stopColor={mid} />
          <stop offset="0.45" stopColor={dark} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <radialGradient id={`vig${id}`} cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
        <filter id={`soft${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id={`bokeh${id}`}>
          <feGaussianBlur stdDeviation="40" />
        </filter>
        <filter id={`grain${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} />
          <feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 0.35 0" />
        </filter>
      </defs>

      <rect width="1600" height="1000" fill={`url(#bg${id})`} />

      {/* the room: a window or doorway, out of focus */}
      <g filter={`url(#bokeh${id})`} opacity="0.55">
        <rect x={lightLeft ? 90 : 1190} y="120" width="300" height="520" fill={light} opacity="0.55" />
        <circle cx={lightLeft ? 1300 : 300} cy={260 + r() * 120} r={40 + r() * 30} fill={light} opacity="0.35" />
        <rect x="0" y="780" width="1600" height="220" fill={dark} opacity="0.6" />
      </g>

      {/* the storyteller, softly */}
      <g filter={`url(#soft${id})`}>
        <path
          d={`M ${cx - shoulder} 1010
              C ${cx - shoulder} 880, ${cx - shoulder + 30} ${neckY + 110}, ${cx - 170} ${neckY + 80}
              C ${cx - 95} ${neckY + 66}, ${cx - 62} ${neckY + 30}, ${cx - 52} ${neckY - 10}
              L ${cx + 52} ${neckY - 10}
              C ${cx + 62} ${neckY + 30}, ${cx + 95} ${neckY + 66}, ${cx + 170} ${neckY + 80}
              C ${cx + shoulder - 30} ${neckY + 110}, ${cx + shoulder} 880, ${cx + shoulder} 1010 Z`}
          fill={`url(#fig${id})`}
        />
        <rect x={cx - 52} y={headY + headRy * 0.4} width="104" height={headRy * 0.7} fill={dark} />
        {/* rim of light: the silhouette drawn once in light, nudged toward the lamp, then again in shadow */}
        <g transform={`translate(${rim * 8} -3)`} opacity="0.6">
          <ellipse cx={cx} cy={headY} rx={headRx} ry={headRy} fill={light} />
          {drape && <path d={drapePath} fill={light} />}
        </g>
        <ellipse cx={cx} cy={headY} rx={headRx} ry={headRy} fill={`url(#fig${id})`} />
        {drape && <path d={drapePath} fill={dark} />}
      </g>

      <rect width="1600" height="1000" fill={`url(#vig${id})`} />
      <rect width="1600" height="1000" filter={`url(#grain${id})`} opacity="0.45" style={{ mixBlendMode: "overlay" }} />
    </svg>
  );
}

function Landscape({ tones, seed }: { tones: [string, string, string]; seed: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const r = rand(seed);
  const [dark, mid, light] = tones;
  const sunX = 300 + r() * 1000;
  const horizon = 560 + r() * 120;
  const ridge = (base: number, amp: number, freq: number, phase: number) => {
    let d = `M 0 ${base}`;
    for (let x = 0; x <= 1600; x += 40) {
      const y = base - Math.abs(Math.sin(x * freq + phase)) * amp - Math.sin(x * freq * 2.7 + phase) * amp * 0.25;
      d += ` L ${x} ${y.toFixed(1)}`;
    }
    return `${d} L 1600 1000 L 0 1000 Z`;
  };
  return (
    <svg className={styles.svg} viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`sky${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={dark} />
          <stop offset="0.55" stopColor={mid} />
          <stop offset="0.8" stopColor={light} />
        </linearGradient>
        <radialGradient id={`sun${id}`}>
          <stop offset="0" stopColor={light} stopOpacity="0.95" />
          <stop offset="1" stopColor={light} stopOpacity="0" />
        </radialGradient>
        <filter id={`haze${id}`}>
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id={`grain${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} />
          <feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 0.35 0" />
        </filter>
        <radialGradient id={`vig${id}`} cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.5" />
        </radialGradient>
      </defs>
      <rect width="1600" height="1000" fill={`url(#sky${id})`} />
      <circle cx={sunX} cy={horizon - 60} r="320" fill={`url(#sun${id})`} />
      <g filter={`url(#haze${id})`}>
        <path d={ridge(horizon, 90 + r() * 80, 0.004 + r() * 0.002, r() * 6)} fill={mid} opacity="0.55" />
        <path d={ridge(horizon + 90, 120 + r() * 80, 0.003 + r() * 0.002, r() * 6)} fill={dark} opacity="0.55" />
        <path d={ridge(horizon + 220, 70 + r() * 60, 0.005, r() * 6)} fill={dark} opacity="0.9" />
      </g>
      <rect width="1600" height="1000" fill={`url(#vig${id})`} />
      <rect width="1600" height="1000" filter={`url(#grain${id})`} opacity="0.45" style={{ mixBlendMode: "overlay" }} />
    </svg>
  );
}
