import type { Metadata } from "next";
import { Suspense } from "react";
import { PasswordResetScreen } from "@/components/site/screens";

export const metadata: Metadata = {
  title: "Reset Password — Chinese Toon",
  description: "Reset your Chinese Toon account password.",
  // 🔐 جریان احراز هویت — ایندکس نمی‌شود
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PasswordResetScreen />
    </Suspense>
  );
}
