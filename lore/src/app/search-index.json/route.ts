import { getStorySummaries } from "@/lib/stories";

export const dynamic = "force-static";

/** A compact, cacheable index for the site-wide search overlay. */
export function GET() {
  return Response.json(getStorySummaries());
}
