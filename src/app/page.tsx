import type { Metadata } from "next";
import { Suspense } from "react";
import { HomeScreen } from "@/components/site/screens";
import { siteContent } from "@/content/site-content";

const SITE_URL = siteContent.contact.siteUrl;

export const metadata: Metadata = {
  title: "Chinese Toon — Learn Mandarin Chinese",
  description:
    "Learn Mandarin Chinese through engaging animated content and practical, teacher-led classes. Structured learning, engaging teaching, real progress.",
  alternates: { canonical: `${SITE_URL}/` },
};

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeScreen />
    </Suspense>
  );
}
