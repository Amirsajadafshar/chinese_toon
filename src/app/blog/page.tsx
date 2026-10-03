import type { Metadata } from "next";
import { Suspense } from "react";
import { BlogScreen } from "@/components/site/screens";
import { siteContent } from "@/content/site-content";

const SITE_URL = siteContent.contact.siteUrl;

export const metadata: Metadata = {
  title: "Blog — Chinese Toon",
  description:
    "News, culture, study tips and HSK guides from the Chinese Toon team — practical articles about learning Mandarin Chinese.",
  alternates: { canonical: `${SITE_URL}/blog` },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BlogScreen />
    </Suspense>
  );
}
