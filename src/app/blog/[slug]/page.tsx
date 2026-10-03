import type { Metadata } from "next";
import { Suspense } from "react";
import { BlogScreen } from "@/components/site/screens";
import { siteContent } from "@/content/site-content";

const SITE_URL = siteContent.contact.siteUrl;

// 📰 مقالهٔ وبلاگ — عنوان/توضیح/زمان انتشار از دیتابیس؛ اگر مقاله نبود،
// همان لیست وبلاگ رندر می‌شود (رفتار قبلی SPA) و متادیتای عمومی می‌ماند.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let title = "Blog — Chinese Toon";
  let description =
    "News, culture, study tips and HSK guides from the Chinese Toon team.";
  let publishedTime: string | undefined;
  let modifiedTime: string | undefined;
  try {
    const { db } = await import("@/lib/db");
    const post = await db.post.findUnique({ where: { slug } });
    if (post) {
      title = `${post.title} — Chinese Toon`;
      description = post.excerpt || description;
      publishedTime = post.createdAt.toISOString();
      modifiedTime = post.updatedAt.toISOString();
    }
  } catch {
    // دیتابیس در دسترس نیست — متادیتای عمومی
  }
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/blog/${slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${SITE_URL}/blog/${slug}`,
      ...(publishedTime ? { publishedTime, modifiedTime } : {}),
    },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <Suspense fallback={null}>
      <BlogScreen slug={decodeURIComponent(slug)} />
    </Suspense>
  );
}
