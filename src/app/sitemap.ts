import type { MetadataRoute } from "next";
import { siteContent } from "@/content/site-content";

// ---------------------------------------------------------------------------
// 🗺️ sitemap.xml — فاز SEO: روت‌های واقعی App Router.
//
// قبلاً سایت یک SPA هش‌محور بود و فقط `/` در sitemap بود — نتیجه: گوگل تنها یک
// URL ایندکس‌پذیر داشت و Search Console خطا می‌داد. حالا هر نما روت مستقل دارد:
//
//   /  /classes  /learn  /about  /blog  /reviews  /support  /register
//   + مقاله‌های وبلاگ (/blog/<slug> — از دیتابیس، فقط published)
//
// روت‌های شخصی (account/admin/pay/lesson/forgot/reset) عمداً اینجا نیستند:
//  • account/admin/pay — noindex هستند (metadata robots) و محتوای شخصی‌اند
//  • lesson/<slug> — محتوای درسی از پنل تغییر می‌کند و برای جست‌وجو هدف نیست؛
//    اگر روزی خواستید ایندکس شوند، همین‌جا با db.lesson اضافه کنید.
//
// دامنهٔ canonical (https://www.chinesetoon.com) از siteContent می‌آید — همان
// منبع robots.ts و metadataBase — تا www/non-www هرگز واگرا نشود.
//
// ⚙️ revalidate: هر ساعت دوباره ساخته می‌شود (روی Vercel پس از اولین درخواست)
// تا مقاله‌های جدید پنل ادمین بدون deploy تازه وارد sitemap شوند. اگر دیتابیس
// در دسترس نباشد، sitemap فقط با روت‌های ثابت ساخته می‌شود (هرگز خطا نمی‌دهد).
// ---------------------------------------------------------------------------

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteContent.contact.siteUrl.replace(/\/$/, "");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/classes`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/learn`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/blog`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/reviews`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/support`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/register`, changeFrequency: "monthly", priority: 0.7 },
  ];

  let blogPosts: MetadataRoute.Sitemap = [];
  try {
    const { db } = await import("@/lib/db");
    const posts = await db.post.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });
    blogPosts = posts.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    // دیتابیس در دسترس نیست — sitemap بدون مقاله‌ها معتبر می‌ماند
  }

  return [...staticRoutes, ...blogPosts];
}
