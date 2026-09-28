import type { Metadata } from "next";
import Link from "next/link";
import p from "@/components/Page.module.css";
import { Reveal } from "@/components/Reveal";
import { Still } from "@/components/Still";
import styles from "./about.module.css";

export const metadata: Metadata = {
  title: "About",
  description: "LORE is a nonprofit home for stories passed between generations, told by the people who carry them.",
};

export default function AboutPage() {
  return (
    <>
      <section className={`wrap ${p.hero}`}>
        <Reveal as="p" className="label label-rule">
          About LORE
        </Reveal>
        <Reveal as="h1" className={`display ${p.title}`} delay={150}>
          A place <em>to listen.</em>
        </Reveal>
        <Reveal className={p.intro} delay={300}>
          <p>Storytelling is one of the oldest ways people have of reaching one another.</p>
        </Reveal>
      </section>

      <section className={`section ${styles.before}`}>
        <div className={`wrap ${p.poem}`}>
          <Reveal as="p">Before books, before films, before phones, knowledge travelled by voice.</Reveal>
          <Reveal as="p" delay={200} className={p.quiet}>
            Stories moved between parents and children, between elders and their communities, between travellers and the strangers who took them in.
          </Reveal>
          <Reveal as="p" delay={400}>
            Many still do.
          </Reveal>
        </div>
      </section>

      <section className={styles.imageBand} aria-hidden="true">
        <Still image={{ alt: "", placeholder: { kind: "landscape", tones: ["#191612", "#5d4a38", "#d9b889"], seed: 71 } }} className={styles.bandStill} />
      </section>

      <section className="section">
        <div className={`wrap ${p.bandGrid}`}>
          <Reveal>
            <p className="label label-rule">What LORE is</p>
            <h2 className="display h2">A living record of tellings</h2>
          </Reveal>
          <Reveal delay={200} className={p.bandText}>
            <p className={p.big}>LORE records and shares stories that have been handed down — told by the people who carry them, in the languages they live in.</p>
            <p>
              Traditional stories and teaching stories, stories of creation and of place, ancestral accounts and family memories: what they share is that someone received them, kept them, and chose to pass them on.
            </p>
            <p>
              The films are simple. Often a single person, a single camera, and a single story. Whenever we can, they are subtitled so that someone on the other side of the world can sit and listen too.
            </p>
          </Reveal>
        </div>
      </section>

      <section className={`section ${styles.listening}`}>
        <div className={`wrap ${p.bandGrid}`}>
          <Reveal>
            <p className="label label-rule">Why it matters</p>
            <h2 className="display h2">Not only keeping. Listening.</h2>
          </Reveal>
          <Reveal delay={200} className={p.bandText}>
            <p className={p.big}>
              Preservation is part of it. But LORE is just as much about what happens when you hear a story from someone whose life, language and way of seeing may be very different from your own.
            </p>
            <p>Curiosity, and sometimes recognition. The feeling that a story told in a valley you’ll never visit is, in some way, also about you.</p>
            <p>There is no algorithm here deciding which stories matter most. There are no rankings, no view counts, nothing trending. Only people, and the stories they have chosen to share.</p>
          </Reveal>
        </div>
      </section>

      <section className={`section ${styles.nonprofit}`}>
        <div className={`wrap ${p.bandGrid}`}>
          <Reveal>
            <p className="label label-rule">How LORE works</p>
            <h2 className="display h2">A nonprofit initiative</h2>
          </Reveal>
          <Reveal delay={200} className={p.bandText}>
            <p>
              LORE is nonprofit. It is supported by people and organisations who believe these stories deserve a careful home, and it is guided by a simple set of{" "}
              <Link href="/principles">principles</Link> about consent, care and stewardship.
            </p>
            <p>
              The storytellers are the heart of it. LORE is the room they speak in.
            </p>
            <div className={styles.actions}>
              <Link href="/share" className="btn btn-solid">
                Share a Story
              </Link>
              <Link href="/support" className="btn">
                Support LORE
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className={styles.aom} aria-labelledby="aom-title">
        <div className={`wrap ${styles.aomInner}`}>
          <Reveal>
            <p className="label">Where LORE comes from</p>
            <h2 id="aom-title" className={styles.aomTitle}>
              From the people behind Art of Mastery
            </h2>
          </Reveal>
          <Reveal delay={200} className={styles.aomText}>
            <p>
              Art of Mastery is a global nonprofit film project documenting masters of traditional crafts, practices and cultural traditions around the world.
            </p>
            <p>
              LORE grew from a simple realisation made along the way: just as crafts and practices are passed from one generation to the next, so are stories.
            </p>
            <a href="https://artofmastery.org" target="_blank" rel="noopener" className="text-link">
              Visit ArtOfMastery.org <span aria-hidden="true">↗</span>
            </a>
          </Reveal>
        </div>
      </section>
    </>
  );
}
