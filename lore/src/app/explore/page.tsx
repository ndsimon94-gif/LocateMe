import type { Metadata } from "next";
import { Suspense } from "react";
import { ExploreClient } from "@/components/ExploreClient";
import { getStorySummaries } from "@/lib/stories";

export const metadata: Metadata = {
  title: "Explore",
  description: "Wander the LORE archive by place, community, language, theme or kind of story.",
};

export default function ExplorePage() {
  const stories = getStorySummaries();
  return (
    <Suspense>
      <ExploreClient stories={stories} />
    </Suspense>
  );
}
