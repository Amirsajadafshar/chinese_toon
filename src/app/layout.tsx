import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { siteContent } from "@/content/site-content";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const SITE_URL = siteContent.contact.siteUrl; // از فایل محتوا — برای سئو و شبکه‌های اجتماعی

// ⚠️ title عمداً اینجا تعریف نشده — عنوان تب به‌صورت reactive از <title> داخل
// src/app/page.tsx مدیریت می‌شود (per-view). اگر اینجا title بگذارید، بعد از
// hydration عنوان اختصاصی نماها را بازنویسی می‌کند.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // 🎨 آیکون تب مرورگر (لوگوی برند) + آیکون اپل برای «Add to Home Screen»
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
    apple: [{ url: "/images/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // 📱 PWA — نصب‌شدن سایت روی موبایل/دسکتاپ (manifest + آیکون‌های برند)
  manifest: "/manifest.webmanifest",
  description:
    "Learn Mandarin Chinese through engaging animated content and practical, teacher-led classes. Structured learning, engaging teaching, real progress.",
  keywords: [
    "Chinese Toon",
    "Learn Chinese",
    "Mandarin",
    "HSK",
    "Chinese classes",
    "Chinese learning",
  ],
  authors: [{ name: "Chinese Toon" }],
  openGraph: {
    title: "Chinese Toon — Learn Mandarin Chinese",
    description:
      "Learn Chinese. Have Fun. Make Progress. Animated content + teacher-led classes.",
    siteName: "Chinese Toon",
    type: "website",
    url: SITE_URL,
    // 🖼️ پیش‌نمایش برندشده موقع اشتراک‌گذاری لینک در تلگرام/اینستاگرام/واتساپ
    images: [
      {
        url: "/images/og-image.png",
        width: 1344,
        height: 768,
        alt: "Chinese Toon — Learn Chinese. Have Fun. Make Progress.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Chinese Toon — Learn Mandarin Chinese",
    description:
      "Learn Chinese. Have Fun. Make Progress. Animated content + teacher-led classes.",
    images: ["/images/og-image.png"],
  },
};

// 🎨 رنگ مرورگر موبایل — هم‌خوان با پس‌زمینهٔ روشن/تاریک سایت
// (در Next 13+ این مقدار باید در viewport باشد، نه metadata)
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFF7E8" },
    { media: "(prefers-color-scheme: dark)", color: "#2A241E" },
  ],
};

// ---------------------------------------------------------------------
// 🔍 داده‌های ساخت‌یافته (JSON-LD) برای گوگل — Organization + WebSite + FAQ
//    سؤال‌ها مستقیم از فایل محتوا می‌آیند؛ با ویرایش FAQ در
//    src/content/site-content.ts این بخش هم خودکار به‌روز می‌شود.
// ---------------------------------------------------------------------
function buildJsonLd(): string {
  const faqItems = siteContent.support.faq.items.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  }));

  const graph = [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Chinese Toon",
      url: SITE_URL,
      logo: `${SITE_URL}/images/og-image.png`,
      description:
        "Mandarin Chinese learning brand — animated educational content and practical, teacher-led classes.",
      sameAs: [
        siteContent.contact.socials.instagram,
        siteContent.contact.socials.telegram,
      ],
      contactPoint: [
        {
          "@type": "ContactPoint",
          email: siteContent.contact.email,
          contactType: "customer support",
          availableLanguage: ["English", "Chinese"],
        },
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Chinese Toon",
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en",
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: faqItems,
    },
  ];

  // 🛡️ فاز ۳۶ — escape کاراکتر < تا محتوای متنی هرگز نتواند از کانتکست
  // اسکریپت JSON-LD خارج شود (حتی اگر روزی متن‌ها کاربر-ساخت شوند)
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} antialiased`}>
        {/* 🌙 تنظیم تم قبل از hydration تا صفحه در شب سفید نزند (FOUC)
            اولویت: انتخاب کاربر (localStorage) → ترجیح سیستم */}
        <Script id="ct-theme" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem('ct-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`}
        </Script>
        {children}
        <Toaster />
        {/* 🔍 داده‌های ساخت‌یافته برای موتورهای جستجو */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: buildJsonLd() }}
        />
      </body>
    </html>
  );
}
