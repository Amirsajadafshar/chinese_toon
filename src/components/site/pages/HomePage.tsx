'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  MessageCircle,
  Sparkles,
  BookOpen,
  HeartHandshake,
  ArrowRight,
  GraduationCap,
  Lightbulb,
  Palette,
  Footprints,
  Users,
  Globe,
} from 'lucide-react'
import { StatsBar } from '../StatsBar'
import { HomeBlogSection } from '../HomeBlogSection'
import { WordOfDay } from '../WordOfDay'
import { HomeSectionNav } from '../HomeSectionNav'
import { HomeReviewsCarousel } from '../HomeReviewsCarousel'
import { HeroScene } from '../HeroScene'
import { CurveDivider } from '../CurveDivider'
import { Leaflet } from '../ToonBranch'
import { siteContent, PageKey } from '@/content/site-content'
import { appNavigate } from '@/lib/nav'

const c = siteContent.home

// ---------------------------------------------------------------------
// 🎓 فاز ۴۲ — کارت‌های «Explore Classes» صفحهٔ خانه از منبع حقیقت (پنل ادمین)
// می‌آیند: اول کلاس‌های featured، بعد بقیهٔ کلاس‌های فعال — حداکثر ۳ کارت.
// رندر اولیه با ۳ کلاس اول فایل محتوا است (بدون فلاش خالی)؛ سپس دادهٔ سرور
// جایگزین می‌شود. اگر API نبود، همان نسخهٔ فایل می‌ماند (صفحه هرگز خالی نمی‌شود).
// هیچ قیمتی این‌جا هاردکد نشده — کارت‌ها فقط دعوت به صفحهٔ کلاس‌ها هستند.
// ---------------------------------------------------------------------
interface HomeClassCard {
  slug: string
  title: string
  level: string
  type: string
  text: string
}

const STATIC_HOME_CLASSES: HomeClassCard[] = siteContent.classes.items.slice(0, 3).map((i) => ({
  slug: i.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
  title: i.title,
  level: i.level,
  type: i.type,
  text: i.text.split('.')[0] + '.',
}))

function useHomeClasses(): HomeClassCard[] {
  const [cards, setCards] = useState<HomeClassCard[]>(STATIC_HOME_CLASSES)
  useEffect(() => {
    let alive = true
    fetch('/api/classes')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { classes?: { slug: string; title: string; level: string; type: string; text: string; featured: boolean; status: string }[] }) => {
        if (!alive) return
        const list = Array.isArray(d.classes) ? d.classes : []
        const picked = [...list].sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, 3)
        if (picked.length > 0) {
          setCards(
            picked.map((i) => ({
              slug: i.slug,
              title: i.title,
              level: i.level,
              type: i.type,
              text: i.text.split('.')[0] + '.',
            }))
          )
        }
      })
      .catch(() => {
        // شبکه/سرور در دسترس نیست — نسخهٔ فایل باقی می‌ماند
      })
    return () => {
      alive = false
    }
  }, [])
  return cards
}

// ---------------------------------------------------------------------
//  ✏️ متن‌های هیرو از تنظیمات دیتابیس خوانده می‌شود (تب Settings پنل)
//  تا مالک بدون دست‌زدن به کد، تیتر/بج/زیرنویس هیرو را عوض کند.
//  تا قبل از لود، پیش‌فرض فایل محتوا نشان داده می‌شود.
// ---------------------------------------------------------------------
function useHeroText() {
  const [hero, setHero] = useState(c.hero)
  useEffect(() => {
    let cancelled = false
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        const saved = d?.settings?.hero
        if (!cancelled && saved && typeof saved === 'object') {
          setHero({ ...c.hero, ...saved })
        }
      })
      .catch(() => {}) // خطا = پیش‌فرض فایل محتوا
    return () => {
      cancelled = true
    }
  }, [])
  return hero
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'message-circle': MessageCircle,
  sparkles: Sparkles,
  'book-open': BookOpen,
  'heart-handshake': HeartHandshake,
  'graduation-cap': GraduationCap,
  lightbulb: Lightbulb,
  palette: Palette,
  footprints: Footprints,
  users: Users,
  globe: Globe,
}

const colorMap = {
  sage: {
    bg: 'bg-sage-light/30',
    text: 'text-sage-dark',
    border: 'border-sage-light/20',
    iconBg: 'bg-sage-light/30',
  },
  butter: {
    bg: 'bg-butter/20',
    text: 'text-brown',
    border: 'border-butter/30',
    iconBg: 'bg-butter/20',
  },
  peach: {
    bg: 'bg-peach-light/30',
    text: 'text-peach',
    border: 'border-peach-light/30',
    iconBg: 'bg-peach-light/30',
  },
} as const

interface HomePageProps {
  onNavigate: (page: PageKey) => void
}

// 🖼️ آیکون‌های تصویری کارت‌های کلاس — همان سه طرح برند قبلی، چرخشی بین کارت‌ها
function ClassCardIcon({ kind }: { kind: number }) {
  if (kind === 0) {
    return (
      <div className="w-16 h-16 bg-sage-light/30 rounded-2xl flex items-center justify-center mb-6">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <rect x="6" y="4" width="20" height="24" rx="3" fill="#A8C9A0" />
          <rect x="9" y="8" width="14" height="2" rx="1" fill="white" />
          <rect x="9" y="13" width="10" height="2" rx="1" fill="white" opacity="0.7" />
          <rect x="9" y="18" width="12" height="2" rx="1" fill="white" opacity="0.7" />
        </svg>
      </div>
    )
  }
  if (kind === 1) {
    return (
      <div className="w-16 h-16 bg-butter/20 rounded-2xl flex items-center justify-center mb-6">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <circle cx="16" cy="16" r="12" fill="#F3D98B" />
          <text x="16" y="20" textAnchor="middle" fontSize="12" fontWeight="700" fill="#5B5145">词</text>
        </svg>
      </div>
    )
  }
  return (
    <div className="w-16 h-16 bg-peach-light/30 rounded-2xl flex items-center justify-center mb-6">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="11" cy="16" r="8" fill="#E8B6A5" opacity="0.7" />
        <circle cx="21" cy="16" r="8" fill="#E8B6A5" />
        <circle cx="11" cy="14" r="1.5" fill="#5B5145" />
        <circle cx="21" cy="14" r="1.5" fill="#5B5145" />
      </svg>
    </div>
  )
}

export function HomePage({ onNavigate }: HomePageProps) {
  // ✏️ متن‌های هیرو — پیش‌فرض فایل محتوا، بازنویسی‌شده از تنظیمات دیتابیس
  const hero = useHeroText()
  // 🎓 کارت‌های کلاس از منبع حقیقت (فاز ۴۲)
  const homeClasses = useHomeClasses()
  const why = c.whyChooseUs
  const free = c.freeContent
  const trust = c.trust

  return (
    <div id="page-home">
      {/* ================= Hero — تصویرسازی تمام‌عرض برند ================= */}
      {/* به‌جای کارت جداگانهٔ سمت راست، کل هیرو یک صحنهٔ باغی پانوراما است:
          آسمان گرادیانی، خورشید، ابر، تپه‌ها و درخت تُون — متن و دکمه‌ها
          طبیعی داخل صحنه نشسته‌اند. پالت سایت دست‌نخورده مانده است. */}
      <section className="relative overflow-hidden bg-gradient-to-b from-cream via-butter-light/50 to-sage-light/40">
        {/* 🌄 صحنهٔ کامل — همهٔ اجزا دکوری و pointer-events-none */}
        <HeroScene />

        {/* ✍️ محتوای هیرو — لایهٔ رو، هم‌تراز چپ */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 md:pt-40 lg:pt-44 pb-[380px] sm:pb-[340px] md:pb-36 lg:pb-40 xl:pb-48">
          <div className="max-w-xl animate-ct-fadeInUp">
            <div className="inline-flex items-center gap-2 bg-sage-light/40 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-sage rounded-full"></span>
              <span className="text-xs font-medium text-sage-dark">{hero.badge}</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-brown-dark leading-tight mb-6">
              {hero.titleTop}
              <br />
              {hero.titleMiddle}
              <br />
              <span className="text-sage-dark">{hero.titleHighlight}</span>
            </h1>
            <p className="text-lg text-brown-light leading-relaxed mb-8 max-w-lg">
              {hero.subtitle}
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => onNavigate('register')}
                className="bg-sage text-brown-dark px-8 py-4 rounded-full text-base font-semibold flex items-center gap-2 hover:bg-sage-dark hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(168,201,160,0.4)] transition-all cursor-pointer"
              >
                {c.hero.primaryButton}
                <ArrowRight className="w-[18px] h-[18px]" />
              </button>
              <button
                onClick={() => onNavigate('classes')}
                className="bg-white border-2 border-sage/40 text-brown-dark px-8 py-4 rounded-full text-base font-medium hover:border-sage hover:bg-sage/5 transition-all cursor-pointer"
              >
                {c.hero.secondaryButton}
              </button>
            </div>
          </div>
        </div>
      </section>

            {/* 🧭 ناوبری بخش‌های صفحه — با اسکرول، خط زیر آیتم فعال حرکت می‌کند */}
      <HomeSectionNav />

      {/* ================= نوار آمار ================= */}
      <StatsBar />

      {/* ================= چرا ما ================= */}
      <section id="why" className="py-20 bg-cream relative overflow-hidden scroll-mt-44">
        {/* 🌊 لبهٔ منحنی از نوار سفید آمار + تزئینات ملایم */}
        <CurveDivider fill="#FFFFFF" />
        <div aria-hidden="true" className="absolute top-20 right-0 w-1/2 h-64 ct-dots opacity-60 [mask-image:linear-gradient(to_left,black,transparent)]"></div>
        <div className="char-bg top-24 right-[6%]" style={{ fontSize: '200px', opacity: 0.05 }}>
          好
        </div>
        <svg aria-hidden="true" className="absolute bottom-20 left-[5%] w-11 opacity-60 animate-ct-floatSlow hidden md:block" viewBox="0 0 56 40">
          <g transform="translate(3 20)"><Leaflet w={46} mode="sage" /></g>
        </svg>
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center mb-14 scroll-animate">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-sage-dark mb-3">
              {why.eyebrow}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-brown-dark mb-4">{why.title}</h2>
            <p className="text-brown-light max-w-2xl mx-auto">{why.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {why.cards.map((card, i) => {
              const Icon = iconMap[card.icon] ?? Sparkles
              const color = colorMap[card.color as keyof typeof colorMap] ?? colorMap.sage
              const delay = ['delay-100', 'delay-200', 'delay-300', 'delay-400'][i % 4]
              return (
                <div
                  key={i}
                  className={`scroll-animate ${delay} bg-white rounded-2xl p-7 card-hover border ${color.border}`}
                >
                  <div className={`w-14 h-14 ${color.iconBg} rounded-2xl flex items-center justify-center mb-5`}>
                    <Icon className={`w-7 h-7 ${color.text}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-brown-dark mb-2">{card.title}</h3>
                  <p className="text-sm text-brown-light leading-relaxed">{card.text}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ================= کلاس‌های ما ================= */}
      <section id="classes" className="py-20 bg-sec-leaf relative overflow-hidden scroll-mt-44">
        {/* 🌊 لبهٔ منحنی از بخش کرم + هالهٔ سفید و نقاط محو */}
        <CurveDivider fill="var(--color-cream)" />
        <div className="char-bg top-10 left-10" style={{ fontSize: '220px', opacity: 0.04 }}>
          语
        </div>
        <div aria-hidden="true" className="absolute -top-14 -right-14 w-64 h-64 bg-white/40 rounded-full blur-2xl"></div>
        <div aria-hidden="true" className="absolute bottom-10 left-[8%] w-40 h-40 ct-dots opacity-40 [mask-image:radial-gradient(circle,black,transparent_70%)] hidden md:block"></div>
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center mb-14 scroll-animate">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-sage-dark mb-3">
              {c.exploreClasses.eyebrow}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-brown-dark mb-4">
              {c.exploreClasses.title}
            </h2>
            <p className="text-brown-light max-w-2xl mx-auto">{c.exploreClasses.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {/* 🎓 کارت‌ها از منبع حقیقت (پنل ادمین) — تغییر نام/سطح ادمین بلافاصله این‌جا هم دیده می‌شود */}
            {homeClasses.map((card, idx) => {
              const accents = [
                { card: 'border-sage-light/20', badge: 'bg-sage/20 text-sage-dark', icon: 'sage' },
                { card: 'border-butter/30', badge: 'bg-butter/30 text-brown', icon: 'butter' },
                { card: 'border-peach-light/30', badge: 'bg-peach-light/40 text-brown', icon: 'peach' },
              ]
              const a = accents[idx % 3]
              const delay = idx === 0 ? '' : idx === 1 ? ' delay-100' : ' delay-200'
              return (
                <div key={card.slug || idx} className={`scroll-animate${delay} bg-cream rounded-3xl p-8 card-hover border ${a.card} relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-sage-light/20 rounded-bl-3xl"></div>
                  <ClassCardIcon kind={idx % 3} />
                  <span className={`inline-block ${a.badge} text-xs font-semibold px-3 py-1 rounded-full mb-3`}>
                    {card.level}
                  </span>
                  <h3 className="text-xl font-bold text-brown-dark mb-2">{card.title}</h3>
                  <p className="text-sm text-brown-light mb-5">{card.text}</p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="text-xs bg-white/60 text-brown px-3 py-1 rounded-full">{card.type}</span>
                    <span className="text-xs bg-white/60 text-brown px-3 py-1 rounded-full">Online</span>
                  </div>
                  <button
                    onClick={() => {
                      // لینک پایدار کلاس — اگر slug معتبر بود مستقیم به جزئیات همان کلاس
                      if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(card.slug)) {
                        appNavigate(`/classes/${card.slug}`)
                      } else {
                        onNavigate('classes')
                      }
                    }}
                    className="flex items-center gap-2 text-sm font-semibold text-sage-dark hover:text-brown-dark transition-colors cursor-pointer"
                  >
                    View Class
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
          <div className="text-center mt-10 scroll-animate">
            <button
              onClick={() => onNavigate('classes')}
              className="bg-white border-2 border-sage/30 text-brown-dark px-8 py-3.5 rounded-full text-sm font-semibold hover:border-sage hover:bg-sage/5 transition-all cursor-pointer"
            >
              {c.exploreClasses.viewAllButton}
            </button>
          </div>
        </div>
      </section>

      {/* ================= محتوای رایگان ================= */}
      <section id="free" className="py-20 bg-cream-dark relative overflow-hidden scroll-mt-44">
        {/* 🌊 لبهٔ منحنی + 💬 حباب‌های بازیگوش + قوس نقطه‌چین + کاراکتر محو */}
        <CurveDivider fill="var(--color-sec-leaf)" />
        <div aria-hidden="true" className="speech-bubble absolute! top-24 left-[4%] lg:left-[7%] -rotate-6 opacity-95 hidden md:block">
          <p className="text-lg font-bold text-brown-dark">你好！</p>
          <p className="text-xs text-brown-light">nǐ hǎo · hello</p>
        </div>
        <div aria-hidden="true" className="speech-bubble speech-bubble-right absolute! bottom-28 right-[4%] lg:right-[7%] rotate-3 opacity-95 hidden md:block">
          <p className="text-lg font-bold text-sage-dark">谢谢！</p>
          <p className="text-xs text-brown-light">xiè xie · thanks</p>
        </div>
        <svg aria-hidden="true" className="absolute top-1/3 right-[9%] w-44 opacity-50 hidden lg:block" viewBox="0 0 160 80" fill="none">
          <path d="M6 70 C 40 10, 110 6, 154 40" stroke="#A8C9A0" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 11" />
        </svg>
        <div className="char-bg bottom-8 left-[2%]" style={{ fontSize: '210px', opacity: 0.04 }}>
          说
        </div>
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center mb-12 scroll-animate">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-sage-dark mb-3">
              {free.eyebrow}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-brown-dark mb-4">{free.title}</h2>
            <p className="text-brown-light max-w-2xl mx-auto">{free.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {free.cards.map((card, i) => {
              const color = colorMap[card.color as keyof typeof colorMap] ?? colorMap.sage
              const delay = ['', 'delay-100', 'delay-200'][i % 3]
              return (
                <div
                  key={i}
                  className={`scroll-animate ${delay} bg-white rounded-2xl overflow-hidden card-hover border ${color.border}`}
                >
                  <div className={`h-40 ${color.bg} flex items-center justify-center`}>
                    <div className="text-center">
                      <p className="text-4xl font-bold text-brown-dark">{card.big}</p>
                      <p className="text-sm text-brown-light mt-1">{card.small}</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <span className={`text-xs font-semibold ${color.text} uppercase tracking-wider`}>
                      {card.tag}
                    </span>
                    <h3 className="text-base font-semibold text-brown-dark mt-2 mb-1">{card.title}</h3>
                    <p className="text-sm text-brown-light mb-4">{card.text}</p>
                    {/* 👇 باز شدن مستقیم همان درس در صفحهٔ Learn (مودال درس)
                        صفحهٔ مبدأ (home) ذخیره می‌شود تا «بازگشت» به همین‌جا برگردد */}
                    <button
                      onClick={() => {
                        try {
                          sessionStorage.setItem('ct-lesson-return', 'home')
                        } catch {
                          /* حافظه در دسترس نیست — رفتار ساده */
                        }
                        appNavigate(`/lesson/${card.lesson}`)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                      className="text-sm font-medium text-sage-dark flex items-center gap-1 hover:gap-2 transition-all cursor-pointer"
                    >
                      Learn <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ================= اعتماد ================= */}
      <section className="py-20 relative overflow-hidden bg-sec-foam">
        <CurveDivider fill="var(--color-sec-sand)" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center mb-14 scroll-animate">
            <h2 className="text-3xl md:text-4xl font-bold text-brown-dark mb-4">{trust.title}</h2>
            <p className="text-brown-light max-w-2xl mx-auto">{trust.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {trust.items.map((item, i) => {
              const Icon = iconMap[item.icon] ?? Sparkles
              const color = colorMap[item.color as keyof typeof colorMap] ?? colorMap.sage
              const delays = ['', 'delay-100', 'delay-200', 'delay-300', 'delay-400', 'delay-500']
              return (
                <div key={i} className={`scroll-animate ${delays[i % 6]} flex items-start gap-4`}>
                  <div className={`w-12 h-12 ${color.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-6 h-6 ${color.text}`} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-brown-dark mb-1">{item.title}</h3>
                    <p className="text-sm text-brown-light">{item.text}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ================= کاروسل نظرات دانشجویان (#reviews) ================= */}
      <HomeReviewsCarousel onNavigate={onNavigate} />

      {/* ================= کلمهٔ روز (每日一词) ================= */}
      <div id="word" className="scroll-mt-44">
        <WordOfDay onNavigate={onNavigate} />
      </div>

      {/* ================= آخرین مقالات وبلاگ ================= */}
      <div id="blog" className="scroll-mt-44">
        <HomeBlogSection onNavigate={onNavigate} />
      </div>

      {/* ================= دعوت پایانی (Final CTA) — سبز پررنگ با متن کرم ================= */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#A8C9A0] to-[#8DB585] scroll-mt-44">
        {/* 🌊 لبهٔ منحنی از بخش وبلاگ + تزئینات کرم */}
        <CurveDivider fill="var(--color-sec-sage)" />
        <div
          className="char-bg bottom-[-40px] right-[3%]"
          style={{ fontSize: '230px', opacity: 0.09, color: '#FFF7E8' }}
        >
          香
        </div>
        <svg aria-hidden="true" className="absolute top-20 left-[6%] w-14 opacity-30 rotate-12 hidden md:block animate-ct-floatSlow" viewBox="0 0 56 40">
          <g transform="translate(3 20)"><Leaflet w={48} mode="outline" /></g>
        </svg>
        <svg aria-hidden="true" className="absolute bottom-24 right-[12%] w-12 opacity-25 -rotate-12 hidden md:block" viewBox="0 0 56 40">
          <g transform="translate(3 20)"><Leaflet w={44} mode="outline" /></g>
        </svg>

        <div className="relative max-w-3xl mx-auto px-6 py-20 md:py-24 text-center">
          {/* 🌙 متن‌ها با hex ثابت — روی گرادیان سبز در هر دو حالت خوانا */}
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-[#FFF7E8]/80 mb-4">
            {c.finalCta.eyebrow}
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-[#FFF7E8] mb-4">{c.finalCta.title}</h2>
          <p className="text-[#FFF7E8]/85 max-w-xl mx-auto mb-9">{c.finalCta.subtitle}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => onNavigate('register')}
              className="bg-[#FFF7E8] text-[#3D352E] px-8 py-4 rounded-full text-base font-semibold flex items-center gap-2 hover:bg-[#F7E5B0] hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(61,53,46,0.25)] transition-all cursor-pointer"
            >
              {c.finalCta.primaryButton}
              <ArrowRight className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={() => onNavigate('classes')}
              className="border-2 border-[#FFF7E8]/60 text-[#FFF7E8] px-8 py-4 rounded-full text-base font-medium hover:bg-[#FFF7E8]/10 hover:border-[#FFF7E8] transition-all cursor-pointer"
            >
              {c.finalCta.secondaryButton}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
