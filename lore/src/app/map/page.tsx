import type { Metadata } from "next";
import { WorldMap } from "@/components/WorldMap";
import { getStorySummaries } from "@/lib/stories";
import styles from "./map.module.css";

export const metadata: Metadata = {
  title: "Map",
  description: "Every story in the LORE archive, placed where it comes from.",
};

export default function MapPage() {
  const stories = getStorySummaries();
  return (
    <div className={styles.page}>
      <h1 className="sr-only">Map of the archive</h1>
      <WorldMap stories={stories} variant="full" />
      <p className={styles.hint}>Drag to wander · pinch or scroll to come closer</p>
    </div>
  );
}
