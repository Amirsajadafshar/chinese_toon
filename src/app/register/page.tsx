import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterScreen } from "@/components/site/screens";
import { siteContent } from "@/content/site-content";

const SITE_URL = siteContent.contact.siteUrl;

export const metadata: Metadata = {
  title: "Register — Chinese Toon",
  description:
    "Register for Mandarin Chinese classes at Chinese Toon — choose your course, create your account and start learning today.",
  alternates: { canonical: `${SITE_URL}/register` },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RegisterScreen />
    </Suspense>
  );
}
