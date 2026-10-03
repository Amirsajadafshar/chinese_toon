import type { Metadata } from "next";
import { Suspense } from "react";
import { SupportScreen } from "@/components/site/screens";
import { siteContent } from "@/content/site-content";

const SITE_URL = siteContent.contact.siteUrl;

export const metadata: Metadata = {
  title: "Support & FAQ — Chinese Toon",
  description:
    "Answers to common questions about Chinese Toon classes, payments, scheduling and learning Mandarin — plus direct contact channels.",
  alternates: { canonical: `${SITE_URL}/support` },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SupportScreen />
    </Suspense>
  );
}
