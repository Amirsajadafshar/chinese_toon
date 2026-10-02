import type { MetadataRoute } from "next";
import { siteContent } from "@/content/site-content";

// ---------------------------------------------------------------------------
// 🤖 robots.txt — native Next.js 16 Metadata API.
//
// Replaces the previous static public/robots.txt. The canonical production
// domain is sourced from siteContent.contact.siteUrl (https://www.chinesetoon.com)
// — the SAME source the sitemap uses — so robots.txt and sitemap.xml can never
// drift apart on www/non-www again.
//
// Rules:
//   • All legitimate crawlers (Googlebot, Bingbot, social scrapers, and the
//     catch-all *) are allowed on every path.
//   • No API route or admin path is blocked here — they are protected by
//     auth/return-404 rather than robots (security-through-obscurity is not
//     security). Allowing crawl of /api/* is harmless because those routes
//     return JSON, not indexable HTML.
//   • The sitemap directive points to the canonical www domain so Google
//     Search Console can fetch and validate it.
// ---------------------------------------------------------------------------

export default function robots(): MetadataRoute.Robots {
  const base = siteContent.contact.siteUrl.replace(/\/$/, "");
  return {
    rules: [
      // Googlebot, Bingbot, Twitterbot, facebookexternalhit and every other
      // crawler are all allowed. (The previous static file listed them one by
      // one with `Allow: /`; the catch-all below is equivalent and simpler.)
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
