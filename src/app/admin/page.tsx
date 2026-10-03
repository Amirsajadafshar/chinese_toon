import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminScreen } from "@/components/site/screens";

export const metadata: Metadata = {
  title: "Admin — Chinese Toon",
  description: "Chinese Toon management panel.",
  // 🛡️ پنل مدیریت — هرگز ایندکس نشود
  robots: { index: false, follow: false, nocache: true },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminScreen />
    </Suspense>
  );
}
