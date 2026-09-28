"use client";

import { geoEqualEarth, geoGraticule10, geoPath } from "d3-geo";
import { select } from "d3-selection";
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import "d3-transition";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import landTopo from "world-atlas/land-110m.json";
import { formatDuration, type StorySummary } from "@/lib/stories";
import { Still } from "./Still";
import styles from "./WorldMap.module.css";

const topo = landTopo as unknown as Topology<{ land: GeometryCollection }>;
const LAND = feature(topo, topo.objects.land);
const SPHERE = { type: "Sphere" } as const;
const GRATICULE = geoGraticule10();

const REGION_VIEWS: { name: string; center: [number, number]; k: number }[] = [
  { name: "Africa", center: [18, 3], k: 2.3 },
  { name: "Asia", center: [95, 32], k: 2 },
  { name: "Europe", center: [12, 50], k: 3.2 },
  { name: "North America", center: [-95, 38], k: 2.1 },
  { name: "South America", center: [-60, -18], k: 2.3 },
  { name: "Oceania", center: [155, -18], k: 2.3 },
];

interface Cluster {
  key: string;
  x: number;
  y: number;
  stories: StorySummary[];
}

/** Markers closer than this many screen pixels gather into one. */
const CLUSTER_PX = 26;

export function WorldMap({
  stories,
  variant = "section",
  className = "",
}: {
  stories: StorySummary[];
  variant?: "section" | "full";
  className?: string;
}) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [t, setT] = useState<ZoomTransform>(zoomIdentity);
  const [active, setActive] = useState<{ cluster: Cluster; pinned: boolean } | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Measure.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /**
   * The drawable world. On a tall phone screen the full map is drawn wider
   * than the viewport, filling its height, and can be panned side to side.
   */
  const extent = useMemo(() => {
    const worldW = variant === "full" ? Math.max(size.w, size.h * 1.7) : size.w;
    const x0 = (size.w - worldW) / 2;
    return { x0, x1: x0 + worldW };
  }, [size, variant]);

  const projection = useMemo(() => {
    if (!size.w) return null;
    const pad = variant === "full" ? 24 : 8;
    return geoEqualEarth().fitExtent(
      [
        [extent.x0 + pad, pad],
        [extent.x1 - pad, size.h - pad],
      ],
      SPHERE,
    );
  }, [size, variant, extent]);

  const paths = useMemo(() => {
    if (!projection) return null;
    const p = geoPath(projection);
    return { land: p(LAND) ?? "", sphere: p(SPHERE) ?? "", grat: p(GRATICULE) ?? "" };
  }, [projection]);

  const projected = useMemo(() => {
    if (!projection) return [];
    return stories
      .map((s) => ({ s, p: projection(s.coordinates) }))
      .filter((d): d is { s: StorySummary; p: [number, number] } => !!d.p);
  }, [stories, projection]);

  // Zoom & pan.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !size.w) return;
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 14])
      .translateExtent([
        [extent.x0, 0],
        [extent.x1, size.h],
      ])
      .filter((event: Event & { button?: number; ctrlKey?: boolean; metaKey?: boolean; touches?: TouchList }) => {
        if (event.type === "wheel") return variant === "full" || !!event.ctrlKey || !!event.metaKey;
        if (event.type.startsWith("touch")) return variant === "full" || (event.touches?.length ?? 0) > 1;
        return !event.button;
      })
      .on("zoom", (e) => setT(e.transform));
    zoomRef.current = z;
    select(svg).call(z).on("dblclick.zoom", null);
    // Re-apply constraints for the new extent.
    z.translateBy(select(svg), 0, 0);
    return () => {
      select(svg).on(".zoom", null);
    };
  }, [size, variant, extent]);

  const zoomTo = useCallback(
    (next: ZoomTransform) => {
      const svg = svgRef.current;
      if (!svg || !zoomRef.current) return;
      select(svg).transition().duration(1200).call(zoomRef.current.transform, next);
    },
    [],
  );

  const zoomBy = (k: number) => {
    const svg = svgRef.current;
    if (!svg || !zoomRef.current) return;
    select(svg).transition().duration(700).call(zoomRef.current.scaleBy, k);
  };

  const focusOn = (center: [number, number], k: number) => {
    if (!projection) return;
    const p = projection(center);
    if (!p) return;
    setActive(null);
    zoomTo(zoomIdentity.translate(size.w / 2, size.h / 2).scale(k).translate(-p[0], -p[1]));
  };

  // Cluster in screen space at the current zoom.
  const clusters = useMemo(() => {
    const out: Cluster[] = [];
    for (const { s, p } of projected) {
      const [x, y] = t.apply(p);
      const near = out.find((c) => Math.hypot(c.x - x, c.y - y) < CLUSTER_PX);
      if (near) {
        const n = near.stories.length;
        near.x = (near.x * n + x) / (n + 1);
        near.y = (near.y * n + y) / (n + 1);
        near.stories.push(s);
      } else out.push({ key: s.id, x, y, stories: [s] });
    }
    return out;
  }, [projected, t]);

  // Keep the preview attached to its marker as the map moves.
  const activeLive = active && clusters.find((c) => c.stories.some((s) => s.id === active.cluster.stories[0].id));

  const open = (c: Cluster, pointerType?: string) => {
    if (c.stories.length > 1) {
      if (!projection) return;
      const pts = c.stories.map((s) => projection(s.coordinates)!).filter(Boolean);
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1);
      const k = Math.min(14, Math.max(t.k * 2, (Math.min(size.w, size.h) * 0.5) / span));
      zoomTo(zoomIdentity.translate(size.w / 2, size.h / 2).scale(k).translate(-cx, -cy));
      setActive(null);
      return;
    }
    // On touch, the first tap previews and the second opens.
    if (pointerType === "touch" && !(active?.pinned && active.cluster.key === c.key)) {
      setActive({ cluster: c, pinned: true });
      return;
    }
    router.push(`/stories/${c.stories[0].slug}`);
  };

  const hover = (c: Cluster | null) => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    if (c) {
      if (c.stories.length === 1) setActive({ cluster: c, pinned: false });
    } else {
      leaveTimer.current = setTimeout(() => setActive((a) => (a?.pinned ? a : null)), 260);
    }
  };

  const compact = size.w < 640;
  const preview = activeLive && activeLive.stories.length === 1 ? { c: activeLive, s: activeLive.stories[0] } : null;
  const places = new Set(stories.map((s) => `${s.place}|${s.country}`)).size;

  return (
    <div className={`${styles.map} ${styles[variant]} ${className}`} ref={box}>
      <svg
        ref={svgRef}
        className={styles.svg}
        width={size.w}
        height={size.h}
        role="group"
        aria-label={`Map of stories in the archive: ${stories.length} stories from ${places} places`}
        onClick={(e) => {
          if (e.target === svgRef.current) setActive(null);
        }}
      >
        <defs>
          <pattern id="lore-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="5" className={styles.hatch} />
          </pattern>
          <radialGradient id="lore-glow">
            <stop offset="0" stopColor="var(--clay)" stopOpacity="0.35" />
            <stop offset="1" stopColor="var(--clay)" stopOpacity="0" />
          </radialGradient>
        </defs>
        {paths && (
          <g transform={t.toString()}>
            <path d={paths.sphere} className={styles.sphere} />
            <path d={paths.grat} className={styles.graticule} />
            <path d={paths.land} className={styles.land} />
            <path d={paths.land} fill="url(#lore-hatch)" className={styles.landHatch} />
          </g>
        )}
        <g>
          {clusters.map((c) => {
            const single = c.stories.length === 1;
            const s = c.stories[0];
            const isActive = activeLive?.key === c.key;
            const label = single
              ? `${s.title}, told by ${s.storyteller}. ${s.place}, ${s.country}.`
              : `${c.stories.length} stories in this area. Zoom in.`;
            return (
              <a
                key={c.key}
                href={single ? `/stories/${s.slug}` : "#"}
                aria-label={label}
                className={`${styles.marker} ${isActive ? styles.markerActive : ""}`}
                onPointerEnter={(e) => e.pointerType === "mouse" && hover(c)}
                onPointerLeave={(e) => e.pointerType === "mouse" && hover(null)}
                onFocus={() => single && setActive({ cluster: c, pinned: false })}
                onBlur={() => setActive((a) => (a?.pinned ? a : null))}
                onClick={(e) => {
                  e.preventDefault();
                  const pt = (e.nativeEvent as PointerEvent).pointerType;
                  open(c, pt);
                }}
              >
                <g transform={`translate(${c.x.toFixed(1)} ${c.y.toFixed(1)})`}>
                <circle r="26" className={styles.hit} />
                {single ? (
                  <>
                    <circle r="16" fill="url(#lore-glow)" className={styles.glow} />
                    <circle r="9" className={styles.ring} />
                    <circle r="3.6" className={styles.dot} />
                  </>
                ) : (
                  <>
                    <circle r={13 + Math.min(10, c.stories.length)} className={styles.cluster} />
                    <text className={styles.count} dy="0.35em">
                      {c.stories.length}
                    </text>
                  </>
                )}
                </g>
              </a>
            );
          })}
        </g>
      </svg>

      {preview && (
        <div
          className={`${styles.preview} ${compact ? styles.previewDocked : ""}`}
          style={
            compact
              ? undefined
              : {
                  left: Math.min(Math.max(preview.c.x, 150), size.w - 150),
                  top: preview.c.y,
                  transform: preview.c.y > 300 ? "translate(-50%, calc(-100% - 22px))" : "translate(-50%, 22px)",
                }
          }
          onPointerEnter={() => leaveTimer.current && clearTimeout(leaveTimer.current)}
          onPointerLeave={() => hover(null)}
        >
          <Link href={`/stories/${preview.s.slug}`} className={styles.previewLink}>
            <Still image={preview.s.thumbnail} className={styles.previewImg} focus="center" />
            <span className={styles.previewBody}>
              <span className="label">
                {preview.s.place}, {preview.s.country}
              </span>
              <span className={styles.previewTitle}>{preview.s.title}</span>
              <span className={styles.previewMeta}>
                {preview.s.storyteller}
                <br />
                {preview.s.community}
              </span>
              <span className={styles.previewCta}>
                Listen · {formatDuration(preview.s.duration)} <span aria-hidden="true">→</span>
              </span>
            </span>
          </Link>
          {compact && (
            <button type="button" className={styles.previewClose} onClick={() => setActive(null)} aria-label="Close preview">
              ×
            </button>
          )}
        </div>
      )}

      {variant === "full" && (
        <nav className={styles.regions} aria-label="Travel to a region">
          <button type="button" onClick={() => zoomTo(zoomIdentity)} className={styles.region}>
            The whole world
          </button>
          {REGION_VIEWS.filter((r) => stories.some((s) => s.region === r.name)).map((r) => (
            <button type="button" key={r.name} className={styles.region} onClick={() => focusOn(r.center, r.k)}>
              {r.name}
            </button>
          ))}
        </nav>
      )}

      <div className={styles.controls}>
        <button type="button" onClick={() => zoomBy(1.8)} aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={() => zoomBy(1 / 1.8)} aria-label="Zoom out">
          −
        </button>
        {t.k > 1.01 && (
          <button type="button" onClick={() => zoomTo(zoomIdentity)} aria-label="Show the whole world" className={styles.reset}>
            ◯
          </button>
        )}
      </div>

      <p className={styles.legend}>
        {stories.length} {stories.length === 1 ? "story" : "stories"} · {places} {places === 1 ? "place" : "places"}
      </p>

      <ul className="sr-only">
        {stories.map((s) => (
          <li key={s.id}>
            <Link href={`/stories/${s.slug}`}>
              {s.title} — {s.storyteller}, {s.place}, {s.country}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
