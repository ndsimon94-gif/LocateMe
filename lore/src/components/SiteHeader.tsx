"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { SearchOverlay } from "./SearchOverlay";
import styles from "./SiteHeader.module.css";

export const NAV = [
  { href: "/explore", label: "Explore" },
  { href: "/map", label: "Map" },
  { href: "/share", label: "Share a Story" },
  { href: "/about", label: "About" },
  { href: "/principles", label: "Principles" },
  { href: "/support", label: "Support" },
];

/** Routes that open on a dark, cinematic image — the header starts transparent there. */
function opensDark(path: string) {
  return path === "/" || path.startsWith("/stories/");
}

export function SiteHeader() {
  const path = usePathname() ?? "/";
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenu(false);
    setSearch(false);
  }, [path]);

  useEffect(() => {
    document.documentElement.style.overflow = menu ? "hidden" : "";
  }, [menu]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const overlay = opensDark(path) && !scrolled && !menu;
  const tone = overlay ? styles.overlay : path === "/map" ? styles.solid : scrolled ? styles.solid : styles.plain;

  return (
    <>
      <header className={`${styles.header} ${tone} ${menu ? styles.menuOpen : ""}`}>
        <div className={styles.inner}>
          <Logo />
          <nav className={styles.nav} aria-label="Primary">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={styles.link} aria-current={path.startsWith(n.href) ? "page" : undefined}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className={styles.actions}>
            <button type="button" className={styles.iconBtn} onClick={() => setSearch(true)} aria-label="Search the archive">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="M15.5 15.5 21 21" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.menuBtn}`}
              onClick={() => setMenu((m) => !m)}
              aria-expanded={menu}
              aria-controls="site-menu"
              aria-label={menu ? "Close menu" : "Open menu"}
            >
              <span className={styles.burger} data-open={menu} />
            </button>
          </div>
        </div>
      </header>

      <div id="site-menu" className={styles.mobile} data-open={menu} aria-hidden={!menu} inert={!menu}>
        <nav aria-label="Menu">
          {NAV.map((n, i) => (
            <Link key={n.href} href={n.href} className={styles.mobileLink} style={{ transitionDelay: menu ? `${120 + i * 60}ms` : "0ms" }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <p className={styles.mobileFoot}>A home for the stories that outlive us.</p>
      </div>

      <SearchOverlay open={search} onClose={() => setSearch(false)} />
    </>
  );
}
