import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Instrument_Sans, Newsreader } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});
const newsreader = Newsreader({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});
const instrument = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-instrument",
  display: "swap",
});

/** The site's public address: set NEXT_PUBLIC_SITE_URL once a domain exists; Vercel's URL is used until then. */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "LORE — Living Oral Record Exchange",
    template: "%s — LORE",
  },
  description: "A home for the stories that outlive us. Stories passed between generations, told by the people who carry them.",
  openGraph: {
    title: "LORE — Living Oral Record Exchange",
    description: "A home for the stories that outlive us.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#13100d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${newsreader.variable} ${instrument.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
