import type { Metadata } from "next";
import { Suspense } from "react";
import { AboutScreen } from "@/components/site/screens";
import { siteContent } from "@/content/site-content";

const SITE_URL = siteContent.contact.siteUrl;

export const metadata: Metadata = {
  title: "About — Chinese Toon",
  description:
    "Learn about Chinese Toon — our teaching philosophy, approach, and how we create animated Mandarin learning content and practical, teacher-led classes.",
  alternates: { canonical: `${SITE_URL}/about` },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AboutScreen />
    </Suspense>
  );
}
