import type { Metadata } from "next";
import { Suspense, use } from "react";
import { PasswordResetScreen } from "@/components/site/screens";

export const metadata: Metadata = {
  title: "New Password — Chinese Toon",
  description: "Choose a new password for your Chinese Toon account.",
  // 🔐 جریان احراز هویت — ایندکس نمی‌شود
  robots: { index: false, follow: false },
};

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = use(searchParams);
  return (
    <Suspense fallback={null}>
      <PasswordResetScreen mode="reset" token={token?.trim() || ""} />
    </Suspense>
  );
}
