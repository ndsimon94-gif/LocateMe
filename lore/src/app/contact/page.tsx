import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactForm } from "@/components/ContactForm";
import p from "@/components/Page.module.css";
import { Reveal } from "@/components/Reveal";
import { SITE } from "@/data/site";
import { getAllStories } from "@/lib/stories";

export const metadata: Metadata = {
  title: "Contact",
  description: "Write to LORE — about a story, a storyteller, support or partnership.",
};

export default function ContactPage() {
  const titles = Object.fromEntries(getAllStories().map((s) => [s.slug, s.title]));
  return (
    <>
      <section className={`wrap ${p.hero}`}>
        <Reveal as="p" className="label label-rule">
          Contact
        </Reveal>
        <Reveal as="h1" className={`display ${p.title}`} delay={150}>
          Write to us.
        </Reveal>
        <Reveal className={p.intro} delay={300}>
          <p>
            Every message is read by a person. If you’d rather write directly: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          </p>
        </Reveal>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap" style={{ maxWidth: "52rem" }}>
          <Suspense>
            <ContactForm storyTitles={titles} />
          </Suspense>
        </div>
      </section>
    </>
  );
}
