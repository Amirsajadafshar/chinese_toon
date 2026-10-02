import type { MetadataRoute } from "next";
import { siteContent } from "@/content/site-content";

// ---------------------------------------------------------------------------
// 🗺️ sitemap.xml — native Next.js 16 Metadata API.
//
// WHY ONLY `/` IS LISTED
// ----------------------
// Chinese Toon is a hash-based SPA: every public view (Classes, Learn, About,
// Blog, Reviews, Support, Register) is rendered client-side from the single
// HTTP route `/` and switched via `window.location.hash` (e.g. `/#/classes`).
//
//   • `https://www.chinesetoon.com/#/classes` is fetched by Google as
//     `https://www.chinesetoon.com/` — the hash fragment is client-side only
//     and is NOT a separate URL for search engines. Listing `/#/classes` would
//     be a duplicate of `/`.
//   • `https://www.chinesetoon.com/classes` (without hash) is a 307 redirect
//     to `/#/classes` (see next.config.ts `hashRedirects`). Sitemaps must list
//     final 200-OK canonical URLs only, never redirects.
//   • There are no dynamic App Router pages (no `app/blog/[slug]/page.tsx`);
//     blog posts live at `#/blog/<slug>` and are therefore NOT indexable as
//     distinct URLs.
//
// So the only public, indexable, 200-OK canonical URL is `/`. Including
// anything else would either be a duplicate or a redirect — both make Google
// flag the sitemap as invalid.
//
// The canonical domain (https://www.chinesetoon.com) comes from
// siteContent.contact.siteUrl — the SAME source used by app/robots.ts and the
// layout metadataBase — so the three can never drift apart on www/non-www.
// ---------------------------------------------------------------------------

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteContent.contact.siteUrl.replace(/\/$/, "");
  return [
    {
      url: `${base}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
