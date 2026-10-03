import type { NextConfig } from "next";

// 🧭 فاز SEO — سایت به روت‌های واقعی App Router (/classes، /blog/...) تبدیل شد،
// پس ریدایرکت‌های hash قبلی (/classes → /#/classes) حذف شدند: هر نما آدرس
// مستقل و 200-OK دارد. لینک‌های قدیمی ‎/#/xxx در SiteChrome (useLegacyHashRedirect)
// سمت کلاینت به روت واقعی ریدایرکت می‌شوند.

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    // 🛡️ فاز ۶۴ — خطاهای تایپ دیگر در بیلد نادیده گرفته نمی‌شوند؛
    // ignoreBuildErrors=true اجازه داده بود کد خراب (مثل FaqVote غایب) تا
    // پروداکشن برسد و در زمان اجرا 500 بدهد.
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  // 🛡️ سخت‌سازی امنیتی (فاز ۴۹) — افشای نسخهٔ فریمورک در هدر X-Powered-By خاموش
  poweredByHeader: false,
  // 🛡️ هدرهای امنیتی پایه (فاز ۲۲) — مقاوم‌سازی در برابر کلیک‌جکینگ،
  // MIME-sniffing و نشت اطلاعات ارجاع
  async headers() {
    // 🛡️ فاز ۳۶ — CSP محافظه‌کارانه:
    //  • 'unsafe-inline' در script-src برای اسکریپت‌های درون‌خطی Next.js (بوت‌استرپ تم) و JSON-LD لازم است
    //  • 'unsafe-eval' فقط در حالت توسعه (Turbopack/HMR) — در بیلد پروداکشن حذف می‌شود
    //  • style-src 'unsafe-inline' برای استایل‌های درون‌خطی Tailwind/React لازم است
    //  • img-src data: (کد QR) و https: (کاورهای اختیاری مقالات) و blob:
    //  • media-src blob: برای صدای TTS ساخته‌شده در مرورگر
    //  • frame-ancestors 'none' هم‌راستا با X-Frame-Options: DENY
    const isDev = process.env.NODE_ENV !== "production";
    const scriptSrc = isDev
      ? "'self' 'unsafe-inline' 'unsafe-eval'"
      : "'self' 'unsafe-inline'";
    const csp = [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          // 🛡️ فاز ۳۶ — CSP + HSTS (روی http مرورگرها HSTS را نادیده می‌گیرند؛ روی HTTPS پروداکشن فعال می‌شود)
          { key: "Content-Security-Policy", value: csp },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
