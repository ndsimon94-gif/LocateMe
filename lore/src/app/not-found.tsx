import Link from "next/link";
import p from "@/components/Page.module.css";

export default function NotFound() {
  return (
    <section className={`wrap ${p.hero}`} style={{ minHeight: "70vh" }}>
      <p className="label label-rule">Not found</p>
      <h1 className={`display ${p.title}`}>
        This page <em>isn’t here.</em>
      </h1>
      <div className={p.intro}>
        <p>Perhaps it was moved, or perhaps it was never told. There are other stories waiting.</p>
        <Link href="/explore" className="btn">
          Explore the archive
        </Link>
      </div>
    </section>
  );
}
