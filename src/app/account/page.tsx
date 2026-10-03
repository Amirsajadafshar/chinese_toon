import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountScreen } from "@/components/site/screens";
import { siteContent } from "@/content/site-content";

export const metadata: Metadata = {
  title: "Account — Chinese Toon",
  description: "Sign in to your Chinese Toon account or create a new one.",
  // 👤 صفحهٔ شخصی کاربر — ایندکس معنی ندارد
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AccountScreen />
    </Suspense>
  );
}
