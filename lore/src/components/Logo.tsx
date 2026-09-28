import Link from "next/link";
import styles from "./Logo.module.css";

/**
 * The LORE wordmark. Purely typographic: widely spaced display capitals,
 * with the expanded name set small beneath when there is room.
 */
export function Logo({ expanded = false, href = "/", className = "" }: { expanded?: boolean; href?: string | null; className?: string }) {
  const mark = (
    <span className={`${styles.logo} ${className}`}>
      <span className={styles.word} aria-hidden="true">
        L<span className={styles.o}>O</span>RE
      </span>
      {expanded && <span className={styles.expanded}>Living Oral Record Exchange</span>}
      <span className="sr-only">LORE — Living Oral Record Exchange</span>
    </span>
  );
  return href ? (
    <Link href={href} className={styles.link} aria-label="LORE — home">
      {mark}
    </Link>
  ) : (
    mark
  );
}
