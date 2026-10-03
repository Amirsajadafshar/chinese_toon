import type { Metadata } from "next";
import { Suspense, use } from "react";
import { ClassesScreen } from "@/components/site/screens";
import { siteContent } from "@/content/site-content";

const SITE_URL = siteContent.contact.siteUrl;

// 🎓 دیپ‌لینک کلاس تکی — همان نمای Classes با دیالوگ بازِ همان کلاس.
// نام عمومی کلاس‌ها از دیتابیس می‌آید، پس عنوان ثابت می‌ماند؛ ایندکس اصلی روی
// /classes است و این صفحه فقط for follow (بدون ایندکس جداگانه) serve می‌شود.
export const metadata: Metadata = {
  title: "Class — Chinese Toon",
  description: "Class details, schedule and pricing — Chinese Toon Mandarin classes.",
  robots: { index: false, follow: true },
  alternates: { canonical: `${SITE_URL}/classes` },
};

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const valid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  return (
    <Suspense fallback={null}>
      <ClassesScreen initialSlug={valid ? slug : ""} />
    </Suspense>
  );
}
