import Link from "next/link";
import { BrowseIndex } from "@/components/BrowseIndex";
import { HeroMontage, type HeroScene } from "@/components/HeroMontage";
import { Reveal } from "@/components/Reveal";
import { Still } from "@/components/Still";
import { StoryCard } from "@/components/StoryCard";
import { WorldMap } from "@/components/WorldMap";
import { STORY_TYPES } from "@/data/taxonomy";
import { findEchoes } from "@/lib/echoes";
import { buildFacets, formatDuration, getFeaturedStory, getStorySummaries } from "@/lib/stories";
import styles from "./page.module.css";

/** Placeholder montage — replace with stills or muted clips from real recordings. */
const SCENES: HeroScene[] = [
  { image: { alt: "", placeholder: { kind: "landscape", tones: ["#1a1712", "#6b4a33", "#e0a86e"], seed: 5 } }, caption: "Placeholder · A coast at dusk" },
  { image: { alt: "", placeholder: { kind: "portrait", tones: ["#1b140f", "#7b4f33", "#e8b980"], seed: 3 } }, caption: "Placeholder · A storyteller, evening" },
  { image: { alt: "", placeholder: { kind: "landscape", tones: ["#14181a", "#4e5c5a", "#c9c3a8"], seed: 13 } }, caption: "Placeholder · Highlands, early morning" },
  { image: { alt: "", placeholder: { kind: "portrait", tones: ["#121620", "#3f4a63", "#d6c3a0"], seed: 53 } }, caption: "Placeholder · A storyteller, blue hour" },
  { image: { alt: "", placeholder: { kind: "landscape", tones: ["#20150e", "#9a5f37", "#efcf9c"], seed: 21 } }, caption: "Placeholder · Desert road" },
  { image: { alt: "", placeholder: { kind: "portrait", tones: ["#16140f", "#6a4b2c", "#f0c27a"], seed: 23 } }, caption: "Placeholder · A storyteller, lamplight" },
];

export default function Home() {
  const featured = getFeaturedStory();
  const all = getStorySummaries();
  const facets = buildFacets(all);
  const echoes = findEchoes(all);
  const voices = all.filter((s) => s.id !== featured.id).slice(0, 4);
  const typeNotes = Object.fromEntries(STORY_TYPES.map((t) => [t.name, t.note]));

  return (
    <>
      <HeroMontage scenes={SCENES} />

      {/* ───────── Introduction ───────── */}
      <section id="begin" className={`section ${styles.intro}`}>
        <div className="wrap">
          <Reveal as="p" className={`label label-rule ${styles.introLabel}`}>
            An introduction
          </Reveal>
          <div className={styles.introText}>
            <Reveal as="p" className={styles.introLine}>
              For as long as people have gathered together, we have told each other stories.
            </Reveal>
            <Reveal as="p" className={styles.introLine} delay={250}>
              Stories carry memory and humour, belief and warning, the names of places and the shape of a life.
            </Reveal>
            <Reveal as="p" className={`${styles.introLine} ${styles.introLast}`} delay={500}>
              LORE is a home for stories passed between generations — told by the people who carry them, in the words they choose.
            </Reveal>
          </div>
          <Reveal className={styles.triptych} delay={300}>
            <span>One person.</span>
            <span>One camera.</span>
            <span>One story.</span>
          </Reveal>
        </div>
      </section>

      {/* ───────── Featured story ───────── */}
      <section className={`dark ${styles.featured}`} aria-labelledby="featured-title">
        <div className={styles.featuredGrid}>
          <Reveal className={styles.featuredImage}>
            <Still image={featured.still ?? featured.thumbnail} className={styles.featuredStill} focus="center" />
          </Reveal>
          <div className={styles.featuredText}>
            <Reveal as="p" className="label label-rule">
              An invitation to listen
            </Reveal>
            <Reveal delay={150}>
              <h2 id="featured-title" className={`display ${styles.featuredTitle}`}>
                {featured.title}
              </h2>
              <p className={styles.featuredTeller}>
                Told by <strong>{featured.storyteller}</strong>
                {featured.storytellerRole ? `, ${featured.storytellerRole}` : ""}
              </p>
            </Reveal>
            <Reveal delay={300}>
              <p className={styles.featuredDesc}>{featured.description}</p>
              <dl className={styles.card}>
                <div>
                  <dt>Community</dt>
                  <dd>{featured.community}</dd>
                </div>
                <div>
                  <dt>Place</dt>
                  <dd>
                    {featured.place}, {featured.country}
                  </dd>
                </div>
                <div>
                  <dt>Told in</dt>
                  <dd>{featured.language.name}</dd>
                </div>
                <div>
                  <dt>Length</dt>
                  <dd>{formatDuration(featured.duration)}</dd>
                </div>
              </dl>
            </Reveal>
            <Reveal delay={450} className={styles.featuredActions}>
              <Link href={`/stories/${featured.slug}`} className={styles.watch}>
                <span className={styles.play} aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path d="M8 5.5v13l10-6.5z" fill="currentColor" />
                  </svg>
                </span>
                <span>
                  Watch the story
                  <small>Sit with {featured.storyteller.split(" ").slice(-2).join(" ")} for {formatDuration(featured.duration)}</small>
                </span>
              </Link>
              {featured.demo && <span className="demo-tag">Demo record</span>}
            </Reveal>
          </div>
        </div>
      </section>

      {/* ───────── Map ───────── */}
      <section className={`section ${styles.mapSection}`} aria-labelledby="map-title">
        <div className="wrap">
          <div className={styles.split}>
            <Reveal>
              <p className="label label-rule">Explore the world</p>
              <h2 id="map-title" className="display h2">
                Wander <em>toward a voice</em>
              </h2>
            </Reveal>
            <Reveal delay={200} className={styles.splitAside}>
              <p className="lede">Each mark is a person, telling a story from the place it belongs to.</p>
              <Link href="/map" className="text-link">
                Open the full map <span aria-hidden="true">→</span>
              </Link>
            </Reveal>
          </div>
          <Reveal delay={200} className={styles.mapFrame}>
            <WorldMap stories={all} />
          </Reveal>
        </div>
      </section>

      {/* ───────── A few voices ───────── */}
      <section className={`section ${styles.voices}`} aria-labelledby="voices-title">
        <div className="wrap">
          <div className={styles.split}>
            <Reveal>
              <p className="label label-rule">From the archive</p>
              <h2 id="voices-title" className="display h2">
                Some of the voices
              </h2>
            </Reveal>
            <Reveal delay={200} className={styles.splitAside}>
              <Link href="/explore" className="text-link">
                All stories <span aria-hidden="true">→</span>
              </Link>
            </Reveal>
          </div>
          <div className={styles.voiceGrid}>
            {voices.map((s, i) => (
              <Reveal key={s.id} delay={i * 150} className={styles[`v${i}`]}>
                <StoryCard story={s} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Browse ───────── */}
      <section className={`section ${styles.browse}`} aria-labelledby="browse-title">
        <div className="wrap">
          <Reveal>
            <p className="label label-rule">Browse the archive</p>
            <h2 id="browse-title" className="display h2">
              Begin anywhere
            </h2>
            <p className={styles.browseNote}>
              These ways in are loose on purpose. Different communities sort their stories differently, and a single story can belong to many shelves.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <BrowseIndex facets={facets} typeNotes={typeNotes} />
          </Reveal>
        </div>
      </section>

      {/* ───────── Echoes ───────── */}
      {echoes.length > 0 && (
        <section className={`section ${styles.echoes}`} aria-labelledby="echoes-title">
          <div className="wrap">
            <Reveal className={styles.echoHead}>
              <p className="label label-rule">Echoes</p>
              <h2 id="echoes-title" className="display h3">
                Stories from places thousands of miles apart, <em>returning to the same things</em>
              </h2>
            </Reveal>
            <ol className={styles.echoList}>
              {echoes.map((e, i) => (
                <Reveal as="li" key={e.theme} delay={i * 120}>
                  <Link href={`/explore?theme=${encodeURIComponent(e.theme)}`} className={styles.echo}>
                    <span className={styles.echoTheme}>{e.theme}</span>
                    <span className={styles.echoRule} aria-hidden="true" />
                    <span className={styles.echoPlaces}>{e.countries.join(" · ")}</span>
                  </Link>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* ───────── Invitation ───────── */}
      <section className={`section ${styles.invite}`} aria-labelledby="invite-title">
        <div className="wrap">
          <div className={styles.inviteGrid}>
            <Reveal>
              <h2 id="invite-title" className={`display ${styles.inviteTitle}`}>
                Is there a story <em>you carry?</em>
              </h2>
            </Reveal>
            <Reveal delay={250} className={styles.inviteBody}>
              <p className="lede">LORE grows through the people who use it. Anyone can suggest a story, or someone who should be heard.</p>
              <ul className={styles.inviteList}>
                <li>A story you carry yourself</li>
                <li>A storyteller in your family or community</li>
                <li>An elder, or someone who keeps a tradition</li>
                <li>A story you believe deserves a home here</li>
              </ul>
              <p className={styles.inviteSoft}>You don’t need a camera crew, or to be a professional storyteller. What matters is the story.</p>
              <Link href="/share" className="btn btn-solid">
                Share a Story
              </Link>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
