import type { Metadata } from "next";
import Link from "next/link";
import { DonatePanel } from "@/components/DonatePanel";
import p from "@/components/Page.module.css";
import { Reveal } from "@/components/Reveal";
import styles from "./support.module.css";

export const metadata: Metadata = {
  title: "Support LORE",
  description: "LORE is a nonprofit. Your support helps record, translate and care for stories, and the people who tell them.",
};

const HELPS = [
  "Recording stories, simply and well",
  "Translating and subtitling, so more people can listen",
  "Archiving recordings carefully and responsibly",
  "Supporting storytellers and their communities",
  "Hiring local filmmakers and editors when they’re needed",
  "Keeping the public archive open, and free to listen to",
];

export default function SupportPage() {
  return (
    <>
      <section className={`wrap ${p.hero}`}>
        <Reveal as="p" className="label label-rule">
          Support LORE
        </Reveal>
        <Reveal as="h1" className={`display ${p.title}`} delay={150}>
          Help keep <em>the room open.</em>
        </Reveal>
        <Reveal className={p.intro} delay={300}>
          <p>LORE is a nonprofit project. It exists because people choose to support it — so that stories can be recorded with care, and listened to freely.</p>
        </Reveal>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className={`wrap ${p.bandGrid}`}>
          <Reveal>
            <p className="label label-rule">What your support makes possible</p>
          </Reveal>
          <ol className={p.list}>
            {HELPS.map((h, i) => (
              <Reveal as="li" key={h} delay={i * 90}>
                <span aria-hidden="true">{["i", "ii", "iii", "iv", "v", "vi"][i]}.</span>
                <span>{h}</span>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className={`section ${styles.ways}`} aria-labelledby="ways-title">
        <div className="wrap">
          <h2 id="ways-title" className="sr-only">
            Ways to support
          </h2>
          <div className={p.split}>
            <Reveal className={`${p.panel} ${styles.donate}`} id="donate">
              <p className="label">Donate</p>
              <h3>Give once, or give each month</h3>
              <p>Every gift, of any size, goes toward recording, translating and caring for stories.</p>
              <div className={p.push}>
                <DonatePanel />
              </div>
            </Reveal>
            <Reveal className={p.panel} delay={150}>
              <p className="label">Become a Supporter</p>
              <h3>Walk alongside the archive</h3>
              <p>
                Supporters give regularly and hear from us a few times a year — which stories have arrived, where we’ve been, and what’s coming. No perks, no ranks. Just a closer view.
              </p>
              <div className={p.push}>
                <Link href="/contact?topic=supporter" className="btn">
                  Become a Supporter
                </Link>
              </div>
            </Reveal>
            <Reveal className={p.panel} delay={300}>
              <p className="label">Partner With LORE</p>
              <h3>For foundations, institutions & organisations</h3>
              <p>
                We welcome partnerships with foundations, cultural and educational institutions, language organisations and grant-makers who share our approach to consent and stewardship.
              </p>
              <div className={p.push}>
                <Link href="/contact?topic=partnership" className="btn">
                  Start a conversation
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Architecture for future partners & grants — hidden until there is something to show. */}
      <section className={`section ${styles.partners}`} aria-labelledby="partners-title">
        <div className={`wrap ${p.bandGrid}`}>
          <Reveal>
            <p className="label label-rule">Partners & funders</p>
            <h2 id="partners-title" className="display h3">
              The people and organisations who make LORE possible will be acknowledged here.
            </h2>
          </Reveal>
          <Reveal delay={200} className={p.bandText}>
            <p>
              LORE is at its beginning. If your organisation would like to be among the first to support it, we’d be glad to hear from you.
            </p>
            <p className="meta">LORE is a nonprofit initiative. Tax-deductibility details will be published here once confirmed.</p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
