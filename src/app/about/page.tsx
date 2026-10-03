import type { Metadata } from "next";
import { Suspense } from "react";
import { AboutScreen } from "@/components/site/screens";
import { siteContent } from "@/content/site-content";

const SITE_URL = siteContent.contact.siteUrl;

export const metadata: Metadata = {
  title: "About — Chinese Toon",
  description:
    "Meet the Chinese Toon team — experienced Mandarin teachers creating animated learning content and practical, teacher-led classes.",
  alternates: { canonical: `${SITE_URL}/about` },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AboutScreen />
    </Suspense>
  );
}
