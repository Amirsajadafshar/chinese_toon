import type { Metadata } from "next";
import { Suspense } from "react";
import { ReviewsScreen } from "@/components/site/screens";
import { siteContent } from "@/content/site-content";

const SITE_URL = siteContent.contact.siteUrl;

export const metadata: Metadata = {
  title: "Reviews — Chinese Toon",
  description:
    "What students say about learning Mandarin Chinese with Chinese Toon — real reviews, progress stories and community feedback.",
  alternates: { canonical: `${SITE_URL}/reviews` },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ReviewsScreen />
    </Suspense>
  );
}
