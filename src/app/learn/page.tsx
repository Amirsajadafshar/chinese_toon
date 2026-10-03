import type { Metadata } from "next";
import { Suspense } from "react";
import { LearnScreen } from "@/components/site/screens";
import { siteContent } from "@/content/site-content";

const SITE_URL = siteContent.contact.siteUrl;

export const metadata: Metadata = {
  title: "Learn — Chinese Toon",
  description:
    "Free Mandarin Chinese learning content — vocabulary lessons, pronunciation practice, flashcards and everyday expressions. Learn Chinese with fun animated content.",
  alternates: { canonical: `${SITE_URL}/learn` },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LearnScreen />
    </Suspense>
  );
}
