import type { Metadata } from "next";
import { Suspense, use } from "react";
import { CheckoutScreen } from "@/components/site/screens";

export const metadata: Metadata = {
  title: "Payment — Chinese Toon",
  description: "Complete your Chinese Toon class registration payment.",
  // 🪙 جریان پرداخت شخصی — ایندکس نمی‌شود
  robots: { index: false, follow: false },
};

export default function Page({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = use(params);
  return (
    <Suspense fallback={null}>
      <CheckoutScreen orderRef={decodeURIComponent(ref)} />
    </Suspense>
  );
}
