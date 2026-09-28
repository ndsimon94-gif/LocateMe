import type { Metadata } from "next";
import { Reveal } from "@/components/Reveal";
import { ShareForm } from "@/components/ShareForm";
import { Still } from "@/components/Still";
import styles from "./share.module.css";

export const metadata: Metadata = {
  title: "Share a Story",
  description: "Tell us about a story you carry, or someone whose stories should be heard. No filmmaking experience needed.",
};

/**
 * Recording guidance lives here as data so the section can grow into a full
 * guide (and a downloadable PDF) without restructuring the page.
 */
const GUIDANCE = [
  { title: "Find a quiet place", body: "Somewhere the storyteller feels at ease, away from traffic, wind and television. A familiar room is often best." },
  { title: "Camera at eye level", body: "Set the camera or phone at the height of the storyteller’s eyes, a little way off, so it feels like someone is sitting with them." },
  { title: "Let there be light", body: "Soft daylight from a window, falling across the face, is beautiful. Avoid sitting them with a bright window behind." },
  { title: "Listen to the sound", body: "Clear audio matters more than a sharp picture. Get the phone or microphone close, and do a short test first." },
  { title: "Turn the phone sideways", body: "Record in landscape — the long way — so the film fills a screen." },
  { title: "Then, simply listen", body: "Let the story be told the way it is usually told. Don’t interrupt unless you need to. Pauses belong to the story too." },
];

export default function SharePage() {
  return (
    <>
      <section className={styles.hero}>
        <div className="wrap">
          <Reveal as="p" className="label label-rule">
            Share a Story
          </Reveal>
          <Reveal as="h1" className={`display ${styles.title}`} delay={150}>
            Is there a story <em>you carry?</em>
          </Reveal>
          <div className={styles.needs}>
            <Reveal as="p" delay={300}>
              You don’t need to be a filmmaker.
            </Reveal>
            <Reveal as="p" delay={450}>
              You don’t need expensive equipment.
            </Reveal>
            <Reveal as="p" delay={600}>
              You don’t need to be a professional storyteller.
            </Reveal>
            <Reveal as="p" delay={800} className={styles.matters}>
              What matters is the story.
            </Reveal>
          </div>
        </div>
      </section>

      <section className={`section ${styles.ways}`}>
        <div className="wrap">
          <div className={styles.waysGrid}>
            <Reveal>
              <h2 className="display h2">Ways to take part</h2>
              <p className="lede">LORE grows through the people who use it. You might bring us a story, or a person.</p>
            </Reveal>
            <ol className={styles.wayList}>
              {[
                ["Tell us about a story you carry", "Something you were told, and now tell yourself."],
                ["Recommend a storyteller", "Someone whose stories you’ve always wanted others to hear."],
                ["Propose someone in your community", "An elder, a tradition-bearer, a well-known teller of tales."],
                ["Send a recording you already have", "Uploads are coming soon — for now, tell us about it."],
              ].map(([t, b], i) => (
                <Reveal as="li" key={t} delay={i * 120}>
                  <span className={styles.wayNum}>{["i", "ii", "iii", "iv"][i]}.</span>
                  <span>
                    <strong>{t}</strong>
                    <span>{b}</span>
                  </span>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className={`dark ${styles.one}`} aria-labelledby="one-title">
        <div className={styles.oneImg} aria-hidden="true">
          <Still image={{ alt: "", placeholder: { kind: "portrait", tones: ["#16140f", "#5e4630", "#e6b87c"], seed: 61 } }} />
        </div>
        <div className={`wrap ${styles.oneText}`}>
          <p className="label label-rule">How LORE films are made</p>
          <h2 id="one-title" className={`display ${styles.oneTitle}`}>
            One storyteller.
            <br />
            One camera.
            <br />
            <em>One story.</em>
          </h2>
          <p className={styles.oneBody}>
            Most LORE films are very simple. The storyteller might record themselves, or someone close to them might hold the camera. Sometimes we can connect a storyteller with a local filmmaker. The power is in the person and the story — not in the filmmaking.
          </p>
        </div>
      </section>

      <section className={`section ${styles.guide}`} aria-labelledby="guide-title">
        <div className="wrap">
          <div className={styles.guideHead}>
            <Reveal>
              <p className="label label-rule">A few notes on recording</p>
              <h2 id="guide-title" className="display h2">
                If you’d like to film it yourself
              </h2>
            </Reveal>
            <Reveal delay={200} className={styles.guideAside}>
              <p>A phone is enough. These notes help, but none of them are rules.</p>
              <span className={styles.pdf} aria-disabled="true">
                The full LORE recording guide · coming soon
              </span>
            </Reveal>
          </div>
          <ol className={styles.notes}>
            {GUIDANCE.map((g, i) => (
              <Reveal as="li" key={g.title} delay={(i % 3) * 120} className={styles.note}>
                <span className={styles.noteNum}>{String(i + 1).padStart(2, "0")}</span>
                <h3>{g.title}</h3>
                <p>{g.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className={`section ${styles.formSection}`} aria-labelledby="form-title" id="form">
        <div className={`wrap ${styles.formWrap}`}>
          <div className={styles.formIntro}>
            <p className="label label-rule">Begin a conversation</p>
            <h2 id="form-title" className="display h2">
              Tell us about it
            </h2>
            <p>
              Answer what you can. Leave what you can’t. We’ll write back, talk it through, and nothing will be recorded or published unless the storyteller wants it to be.
            </p>
          </div>
          <ShareForm />
        </div>
      </section>
    </>
  );
}
