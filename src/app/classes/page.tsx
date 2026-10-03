import type { Metadata } from "next";
import { Suspense } from "react";
import { ClassesScreen } from "@/components/site/screens";
import { siteContent } from "@/content/site-content";

const SITE_URL = siteContent.contact.siteUrl;

export const metadata: Metadata = {
  title: "Classes — Chinese Toon",
  description:
    "Group and private Mandarin Chinese classes for every level — from beginner basics to HSK exam preparation. Small groups, flexible scheduling, real progress.",
  alternates: { canonical: `${SITE_URL}/classes` },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ClassesScreen />
    </Suspense>
  );
}
