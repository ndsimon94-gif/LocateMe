import Link from "next/link";
import { formatDuration, type StorySummary } from "@/lib/stories";
import { Still } from "./Still";
import styles from "./StoryCard.module.css";

/** A storyteller first, then just enough to make someone curious. */
export function StoryCard({ story, size = "md", priority }: { story: StorySummary; size?: "md" | "lg"; priority?: boolean }) {
  return (
    <Link href={`/stories/${story.slug}`} className={`${styles.card} ${styles[size]}`}>
      <div className={styles.frame}>
        <Still image={story.thumbnail} className={styles.img} priority={priority} />
        <span className={styles.duration}>{formatDuration(story.duration)}</span>
      </div>
      <div className={styles.body}>
        <p className="label">
          {story.place} · {story.country}
        </p>
        <h3 className={styles.title}>{story.title}</h3>
        <p className={styles.teller}>
          Told by {story.storyteller}
          <span className={styles.lang}> in {story.language}</span>
        </p>
        {story.demo && <span className={`demo-tag ${styles.demo}`}>Demo record</span>}
      </div>
    </Link>
  );
}
