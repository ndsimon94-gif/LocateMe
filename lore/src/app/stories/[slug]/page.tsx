import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/Reveal";
import { Still } from "@/components/Still";
import { StoryCard } from "@/components/StoryCard";
import { PlaceGlobe } from "@/components/story/PlaceGlobe";
import { PlaybackProvider } from "@/components/story/Playback";
import { StoryPlayer } from "@/components/story/StoryPlayer";
import { Transcript } from "@/components/story/Transcript";
import type { ProtocolLevel } from "@/data/types";
import { formatDuration, getAllStories, getRelated, getStoryBySlug } from "@/lib/stories";
import styles from "./story.module.css";

export function generateStaticParams() {
  return getAllStories().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/stories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = getStoryBySlug(slug);
  if (!s) return {};
  return {
    title: `${s.title} — told by ${s.storyteller}`,
    description: s.description,
    robots: s.demo ? { index: false } : undefined,
  };
}

const PROTOCOL: Record<ProtocolLevel, { title: string; body: string }> = {
  open: {
    title: "Shared openly",
    body: "The storyteller is glad for this story to be watched and passed on, with their name and community attached.",
  },
  attribution: {
    title: "Shared, with conditions",
    body: "Listen freely. Please ask before excerpting, adapting or reusing this recording in any other work.",
  },
  guided: {
    title: "Shared with particular care",
    body: "The storyteller or their community has asked that this story be treated in specific ways. Please read their notes.",
  },
};

export default async function StoryPage({ params }: PageProps<"/stories/[slug]">) {
  const { slug } = await params;
  const story = getStoryBySlug(slug);
  if (!story) notFound();

  const related = getRelated(story);
  const hasOriginalText = story.transcript.some((s) => s.original);
  const protocol = PROTOCOL[story.culturalProtocol.level];
  const sections = [
    { id: "about", label: "About this story" },
    { id: "storyteller", label: "The storyteller" },
    ...(story.lineage?.length ? [{ id: "lineage", label: "The story’s lineage" }] : []),
    { id: "place", label: "Place" },
    { id: "transcript", label: "Transcript" },
    ...(story.culturalContext?.length ? [{ id: "context", label: "Cultural context" }] : []),
    { id: "care", label: "Care & permissions" },
  ];

  return (
    <PlaybackProvider segments={story.transcript} duration={story.duration} hasVideo={!!story.video.src}>
      <article>
        {/* ───────── The film ───────── */}
        <section className={`dark ${styles.film}`} id="film" aria-label="The film">
          <div className={styles.filmInner}>
            <StoryPlayer
              media={story.video}
              poster={story.still ?? story.thumbnail}
              title={story.title}
              storyteller={story.storyteller}
              language={story.language}
              subtitleLanguages={story.subtitleLanguages}
              hasOriginalText={hasOriginalText}
            />
          </div>

          <header className={`wrap ${styles.titleBlock}`}>
            <div className={styles.titleMain}>
              <p className="label label-rule">{story.storyType.join(" · ")}</p>
              <h1 className={`display ${styles.title}`}>{story.title}</h1>
              {story.originalTitle && (
                <p className={styles.originalTitle} lang={story.language.code}>
                  {story.originalTitle}
                </p>
              )}
              <p className={styles.teller}>
                Told by <strong>{story.storyteller}</strong>
                {story.storytellerRole ? `, ${story.storytellerRole}` : ""}
              </p>
              {story.demo && (
                <p className={styles.demo}>
                  <span className="demo-tag">Demo record</span>
                  <span>Everything on this page is fictional placeholder content, shown so the design can be experienced.</span>
                </p>
              )}
            </div>
            <dl className={styles.facts}>
              <div>
                <dt>Community</dt>
                <dd>{story.community}</dd>
              </div>
              <div>
                <dt>Place</dt>
                <dd>
                  {story.place}, {story.country}
                </dd>
              </div>
              <div>
                <dt>Told in</dt>
                <dd>
                  {story.language.name}
                  {story.language.endonym && story.language.endonym !== story.language.name && (
                    <span className={styles.endonym} lang={story.language.code}>
                      {" "}
                      · {story.language.endonym}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Subtitles</dt>
                <dd>{story.subtitleLanguages.map((l) => l.name).join(", ")}</dd>
              </div>
              <div>
                <dt>Length</dt>
                <dd>About {formatDuration(story.duration)}</dd>
              </div>
            </dl>
          </header>
        </section>

        {/* ───────── Context ───────── */}
        <div className={`wrap ${styles.body}`}>
          <nav className={styles.toc} aria-label="On this page">
            <p className="label">On this page</p>
            <ol>
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>{s.label}</a>
                </li>
              ))}
            </ol>
          </nav>

          <div className={styles.sections}>
            <Reveal as="section" id="about" className={styles.section}>
              <h2 className={styles.h}>About this story</h2>
              <p className={styles.lead}>{story.description}</p>
              <div className="prose">
                {story.storyContext.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <ul className={styles.themes} aria-label="Themes">
                {story.themes.map((t) => (
                  <li key={t}>
                    <Link href={`/explore?theme=${encodeURIComponent(t)}`}>{t}</Link>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal as="section" id="storyteller" className={`${styles.section} ${styles.teller2}`}>
              <div className={styles.portrait}>
                <Still image={story.thumbnail} className={styles.portraitImg} />
              </div>
              <div>
                <h2 className={styles.h}>The storyteller</h2>
                <p className={styles.name}>{story.storyteller}</p>
                <p className="meta">{story.community}</p>
                <div className="prose">
                  <p>{story.storytellerBio}</p>
                </div>
              </div>
            </Reveal>

            {story.pullQuote && (
              <Reveal as="figure" className={styles.quote}>
                <blockquote>“{story.pullQuote}”</blockquote>
                <figcaption className="label">— {story.storyteller}</figcaption>
              </Reveal>
            )}

            {story.lineage?.length ? (
              <Reveal as="section" id="lineage" className={styles.section}>
                <h2 className={styles.h}>The story’s lineage</h2>
                <div className={`prose ${styles.lineage}`}>
                  {story.lineage.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </Reveal>
            ) : null}

            <Reveal as="section" id="place" className={`${styles.section} ${styles.place}`}>
              <div>
                <h2 className={styles.h}>Place</h2>
                <p className={styles.placeName}>{story.place}</p>
                <p className="meta">
                  {story.country} · {story.region}
                </p>
                <p className={styles.placeNote}>Locations are shown only as precisely as the storyteller is comfortable sharing.</p>
                <Link href={`/explore?region=${encodeURIComponent(story.region)}&view=map`} className="text-link">
                  Other stories from {story.region} <span aria-hidden="true">→</span>
                </Link>
              </div>
              <PlaceGlobe coordinates={story.coordinates} label={`${story.place}, ${story.country}`} />
            </Reveal>

            <Reveal as="section" id="transcript" className={styles.section}>
              <h2 className={styles.h}>Transcript</h2>
              <p className={styles.sub}>In the storyteller’s own words, with translation alongside. Tap a time to hear that moment.</p>
              <Transcript language={story.language} translations={story.subtitleLanguages} />
            </Reveal>

            {story.culturalContext?.length ? (
              <Reveal as="section" id="context" className={styles.section}>
                <h2 className={styles.h}>Cultural context</h2>
                <p className={styles.sub}>Offered or approved by the storyteller and their community.</p>
                <div className="prose">
                  {story.culturalContext.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </Reveal>
            ) : null}

            <Reveal as="section" id="care" className={`${styles.section} ${styles.care}`}>
              <h2 className={styles.h}>Care &amp; permissions</h2>
              <div className={styles.careCard} data-level={story.culturalProtocol.level}>
                <p className={styles.careTitle}>{protocol.title}</p>
                <p>{protocol.body}</p>
                {story.culturalProtocol.notes.length > 0 && (
                  <ul>
                    {story.culturalProtocol.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                )}
                {story.culturalProtocol.steward && <p className="meta">{story.culturalProtocol.steward}</p>}
              </div>
              <p className={styles.careNote}>
                Appearing online does not make a story free to take. It remains in the care of the people who carry it.
              </p>
              <p className={styles.careNote}>
                Are you connected to this story? We welcome corrections, added context, and requests about permissions or removal.{" "}
                <Link href={`/contact?about=${story.slug}`}>Get in touch</Link>.
              </p>
            </Reveal>
          </div>
        </div>

        {/* ───────── Continue exploring ───────── */}
        {related.length > 0 && (
          <section className={`section ${styles.related}`} aria-labelledby="continue">
            <div className="wrap">
              <p className="label label-rule">Continue exploring</p>
              <h2 id="continue" className="display h2">
                Where this story might lead
              </h2>
              {related.map((g) => (
                <div key={g.heading} className={styles.group}>
                  <h3 className={styles.groupHead}>{g.heading}</h3>
                  <div className={styles.groupGrid}>
                    {g.stories.map((s) => (
                      <StoryCard key={s.id} story={s} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </article>
    </PlaybackProvider>
  );
}
