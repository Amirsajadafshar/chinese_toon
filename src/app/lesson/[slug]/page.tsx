import type { Metadata } from "next";
import { Suspense, use } from "react";
import { LessonScreen } from "@/components/site/screens";
import { siteContent } from "@/content/site-content";

const SITE_URL = siteContent.contact.siteUrl;

// 📚 درس تکی — عنوان درس از دیتابیس می‌آید (تب Lessons پنل)؛ تا وقتی درس در
// دیتابیس نباشد عنوان عمومی می‌ماند.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let title = "Lesson — Chinese Toon";
  try {
    const { db } = await import("@/lib/db");
    const lesson = await db.lesson.findUnique({ where: { slug } });
    if (lesson?.title) title = `${lesson.title} — Chinese Toon`;
  } catch {
    // دیتابیس در دسترس نیست — عنوان عمومی
  }
  return {
    title,
    description:
      "Interactive Mandarin lesson with vocabulary, pinyin and pronunciation — free Chinese learning content from Chinese Toon.",
    alternates: { canonical: `${SITE_URL}/lesson/${slug}` },
  };
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return (
    <Suspense fallback={null}>
      <LessonScreen slug={decodeURIComponent(slug)} />
    </Suspense>
  );
}
