import { geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import landTopo from "world-atlas/land-110m.json";
import styles from "./PlaceGlobe.module.css";

const topo = landTopo as unknown as Topology<{ land: GeometryCollection }>;
const LAND = feature(topo, topo.objects.land);

/** A small engraved globe, turned to face the place a story comes from. Rendered on the server. */
export function PlaceGlobe({ coordinates, label }: { coordinates: [number, number]; label: string }) {
  const size = 320;
  const [lon, lat] = coordinates;
  const proj = geoOrthographic()
    .rotate([-lon, -lat * 0.7])
    .fitExtent(
      [
        [6, 6],
        [size - 6, size - 6],
      ],
      { type: "Sphere" },
    );
  const path = geoPath(proj);
  const p = proj(coordinates) ?? [size / 2, size / 2];
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={styles.globe} role="img" aria-label={`Globe showing ${label}`}>
      <defs>
        <radialGradient id="globe-shade" cx="0.38" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#000" stopOpacity="0.12" />
        </radialGradient>
        <pattern id="globe-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="4" stroke="var(--ink-2)" strokeWidth="0.5" strokeOpacity="0.35" />
        </pattern>
      </defs>
      <path d={path({ type: "Sphere" }) ?? ""} className={styles.sphere} />
      <path d={path(geoGraticule10()) ?? ""} className={styles.grat} />
      <path d={path(LAND) ?? ""} className={styles.land} />
      <path d={path(LAND) ?? ""} fill="url(#globe-hatch)" />
      <path d={path({ type: "Sphere" }) ?? ""} fill="url(#globe-shade)" />
      <circle cx={p[0]} cy={p[1]} r="14" className={styles.ring} />
      <circle cx={p[0]} cy={p[1]} r="4" className={styles.dot} />
    </svg>
  );
}
