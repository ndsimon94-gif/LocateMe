import type { Metadata } from "next";
import Link from "next/link";
import p from "@/components/Page.module.css";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Our Principles",
  description: "How LORE cares for the stories it is trusted with.",
};

const PRINCIPLES: { title: string; body: string[] }[] = [
  {
    title: "Stories are shared, not taken.",
    body: [
      "LORE works only with storytellers and communities who want their stories to be shared.",
      "We don’t go looking for stories to collect. We make room for the ones people choose to bring.",
    ],
  },
  {
    title: "The storyteller decides.",
    body: [
      "People choose what they want to tell, and what they don’t. They choose how they are introduced, and what is said about the story.",
      "Nothing appears on LORE that the storyteller has not seen and agreed to.",
    ],
  },
  {
    title: "Consent is ongoing.",
    body: [
      "Before anything is recorded, we talk plainly about where a recording may appear and how it may be used.",
      "Agreement given once is not agreement forever. Storytellers and community representatives can always come back to us — about a correction, some missing context, a change in permissions, or a wish for a story to be taken down. We will listen, and act.",
    ],
  },
  {
    title: "Some stories are not meant for everyone.",
    body: [
      "Some stories belong to a season, a ceremony, a family, or to people of a particular age or gender. Some are meant to be heard only in certain places, or by certain people.",
      "LORE respects those boundaries. Recording a story does not mean it must be made public, and some recordings may be kept only for the family or community who asked for them.",
    ],
  },
  {
    title: "Original voices matter.",
    body: [
      "Whenever possible, stories are told in the language they live in.",
      "Translation is there to let more people listen — never to replace the voice of the person telling it.",
    ],
  },
  {
    title: "Context matters.",
    body: [
      "A story is easier to hear well when you know a little about where it comes from. We offer that context alongside each story, written or approved by the storyteller and their community.",
      "LORE is not the authority on anyone else’s culture, and we try hard never to sound like one.",
    ],
  },
  {
    title: "Stewardship, not ownership.",
    body: [
      "LORE may keep and share a recording, but the story itself — and the knowledge it holds — remains in the care of the people and communities it comes from.",
      "A story appearing online does not make it free to take.",
    ],
  },
  {
    title: "Preservation should serve communities.",
    body: [
      "Storytellers and their communities should always be able to have good, full-quality copies of their own recordings.",
      "An archive is only worth keeping if it is useful to the people whose voices are in it.",
    ],
  },
];

const NUMERALS = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];

export default function PrinciplesPage() {
  return (
    <>
      <section className={`wrap ${p.hero}`}>
        <Reveal as="p" className="label label-rule">
          Our Principles
        </Reveal>
        <Reveal as="h1" className={`display ${p.title}`} delay={150}>
          The story belongs first to <em>the people who carry it.</em>
        </Reveal>
        <Reveal className={p.intro} delay={300}>
          <p>LORE simply helps give that story a home.</p>
          <p>These are the promises we make to everyone who trusts us with a story — and the way we hope to be held to account.</p>
        </Reveal>
      </section>

      <section className="wrap">
        <ol className={p.principles}>
          {PRINCIPLES.map((pr, i) => (
            <Reveal as="li" key={pr.title} className={p.principle}>
              <span className={p.numeral} aria-hidden="true">
                {NUMERALS[i]}.
              </span>
              <h2>{pr.title}</h2>
              <div className={p.body}>
                {pr.body.map((b, j) => (
                  <p key={j}>{b}</p>
                ))}
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className={`dark ${p.band}`}>
        <div className={`wrap ${p.bandGrid}`}>
          <Reveal>
            <p className="label label-rule">If a story is yours</p>
            <h2 className="display h2">We are always listening.</h2>
          </Reveal>
          <Reveal delay={200} className={p.bandText}>
            <p className={p.big}>
              If you are a storyteller, a relative, or someone who speaks for a community whose story appears on LORE, you can reach us at any time.
            </p>
            <p>Corrections, missing context, changes to how a story may be shared, or a request to remove it — each is taken seriously, and answered by a person.</p>
            <Link href="/contact?topic=story" className="btn">
              Contact us about a story
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
