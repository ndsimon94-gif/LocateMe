import Link from "next/link";
import { SITE } from "@/data/site";
import { Logo } from "./Logo";
import { NewsletterForm } from "./NewsletterForm";
import styles from "./SiteFooter.module.css";

const LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/map", label: "Map" },
  { href: "/share", label: "Share a Story" },
  { href: "/principles", label: "Our Principles" },
  { href: "/about", label: "About" },
  { href: "/support", label: "Support" },
  { href: "/contact", label: "Contact" },
];

export function SiteFooter() {
  return (
    <footer className={`dark ${styles.footer}`}>
      <div className="wrap">
        <div className={styles.top}>
          <div className={styles.brand}>
            <Logo expanded href={null} className={styles.logo} />
            <p className={styles.tagline}>A home for the stories that outlive us.</p>
          </div>

          <nav aria-label="Footer" className={styles.links}>
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className={styles.news}>
            <p className="label">Letters from the archive</p>
            <p className={styles.newsNote}>An occasional note when new stories arrive. Nothing more.</p>
            <NewsletterForm />
          </div>
        </div>

        <div className={styles.aom}>
          <p>
            LORE comes from the people behind{" "}
            <a href={SITE.artOfMastery} target="_blank" rel="noopener">
              Art of Mastery
            </a>
            , a nonprofit film project documenting masters of traditional crafts and practices around the world.
          </p>
        </div>

        <div className={styles.bottom}>
          <p>
            LORE is a nonprofit initiative. Stories remain under the stewardship of the people and communities who carry them.
          </p>
          <div className={styles.social}>
            <a href={SITE.social.youtube} aria-label="LORE on YouTube (placeholder link)">
              YouTube
            </a>
            <a href={SITE.social.instagram} aria-label="LORE on Instagram (placeholder link)">
              Instagram
            </a>
            <span>© {new Date().getFullYear()} LORE</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
