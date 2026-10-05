import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Reset Password — Chinese Toon",
  description: "Reset your Chinese Toon account password.",
  // 🔐 جریان احراز هویت — ایندکس نمی‌شود
  robots: { index: false, follow: false },
};

// 🚚 جریان بازیابی رمز حالا کدمحور است: کد ۶ رقمی ایمیل می‌شود و در همان
// /forgot-password همراه رمز جدید وارد می‌گردد. لینک‌های قدیمی ایمیلی و
// بوکمارک‌های /reset-password اینجا به آن صفحه می‌رسند.
export default function Page() {
  redirect('/forgot-password');
}
